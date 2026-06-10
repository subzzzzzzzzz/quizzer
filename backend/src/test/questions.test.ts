import request from 'supertest';
import { app } from '../app';
import QuizModel from '../modules/quizzes/quiz.model';
import QuestionModel from '../modules/questions/question.model';
import ParticipantModel from '../modules/participants/participant.model';
import { createMockUser, getAuthCookie } from './auth.helpers';
import { Types } from 'mongoose';
import { addQuestion, editQuestion, deleteQuestion, getQuestionsByQuizId, bulkImportQuestions } from '../modules/questions/question.controller';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

describe('Questions Module', () => {
  describe('POST /api/v1/questions', () => {
    it('should add a question to a draft quiz successfully', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const res = await request(app)
        .post('/api/v1/questions')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: quiz._id,
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswers: [1],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.question).toBe('What is 2+2?');
      expect(res.body.data.options).toEqual(['3', '4', '5', '6']);
      expect(res.body.data.correctAnswers).toEqual([1]);
    });

    it('should throw 400 if quiz is not in Draft status', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });

      const res = await request(app)
        .post('/api/v1/questions')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: quiz._id,
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswers: [1],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Can only add questions to Draft quizzes');
    });

    it('should throw 404 if associated quiz not found', async () => {
      const instructor = await createMockUser('instructor');
      const nonexistentQuizId = new Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/questions')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: nonexistentQuizId,
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswers: [1],
        });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/questions/:id', () => {
    it('should update a question of a draft quiz successfully', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const question = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Original Question',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });

      const res = await request(app)
        .put(`/api/v1/questions/${question._id}`)
        .set('Cookie', getAuthCookie(instructor))
        .send({
          question: 'Updated Question',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.question).toBe('Updated Question');
    });
  });

  describe('DELETE /api/v1/questions/:id', () => {
    it('should delete a question of a draft quiz successfully', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const question = await QuestionModel.create({
        quizId: quiz._id,
        question: 'To Delete',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });

      const res = await request(app)
        .delete(`/api/v1/questions/${question._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      const dbQuestion = await QuestionModel.findById(question._id);
      expect(dbQuestion).toBeNull();
    });
  });

  describe('GET /api/v1/questions/quiz/:quizId', () => {
    it('should return all questions with answers to creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q1',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });

      const res = await request(app)
        .get(`/api/v1/questions/quiz/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      expect(res.body.data[0].correctAnswers).toBeDefined();
    });

    it('should return questions without correctAnswers to assigned candidate of a live quiz', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Quiz Live',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q1',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .get(`/api/v1/questions/quiz/${quiz._id}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(200);
      expect(res.body.data[0].correctAnswers).toBeUndefined();
    });

    it('should throw 403 for candidate if quiz status is Scheduled', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Quiz Scheduled',
        duration: 10,
        instructorId: instructor._id,
        status: 'Scheduled',
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q1',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .get(`/api/v1/questions/quiz/${quiz._id}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Questions are not available before quiz starts');
    });
  });

  describe('POST /api/v1/questions/bulk', () => {
    it('should bulk import questions to a draft quiz successfully', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const res = await request(app)
        .post('/api/v1/questions/bulk')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: quiz._id,
          questions: [
            {
              question: 'Q1?',
              options: ['a', 'b', 'c', 'd'],
              correctAnswers: [0],
            },
            {
              question: 'Q2?',
              options: ['w', 'x', 'y', 'z'],
              correctAnswers: [2],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.count).toBe(2);
      expect(res.body.data.questions.length).toBe(2);
    });

    it('should throw 400 for invalid question structure', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const res = await request(app)
        .post('/api/v1/questions/bulk')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: quiz._id,
          questions: [
            {
              question: 'Invalid Q',
              options: ['too', 'few'], // option count must be 4
              correctAnswers: [0],
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid question structure in bulk import');
    });
  });

  describe('Questions Controller Unit Tests (Direct Calls)', () => {
    it('addQuestion should throw ForbiddenError if user is not creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const req = { body: { quizId: quiz._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await addQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('addQuestion should catch database error', async () => {
      const req = { body: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await addQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('editQuestion should throw NotFoundError if question not found', async () => {
      const req = { params: { id: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' }, body: {} } as any;
      const next = jest.fn();
      await editQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('editQuestion should throw NotFoundError if associated quiz not found', async () => {
      const question = await QuestionModel.create({
        quizId: new Types.ObjectId(),
        question: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });
      const req = { params: { id: question._id.toString() }, user: { _id: '123', role: 'admin' }, body: {} } as any;
      const next = jest.fn();
      await editQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('editQuestion should throw ForbiddenError if user is not creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const question = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });
      const req = { params: { id: question._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' }, body: {} } as any;
      const next = jest.fn();
      await editQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('editQuestion should throw BadRequestError if quiz is not Draft', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });
      const question = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });
      const req = { params: { id: question._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' }, body: {} } as any;
      const next = jest.fn();
      await editQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('editQuestion should catch database error', async () => {
      const req = { params: { id: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' }, body: {} } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuestionModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await editQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('deleteQuestion should throw NotFoundError if question not found', async () => {
      const req = { params: { id: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await deleteQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('deleteQuestion should throw NotFoundError if associated quiz not found', async () => {
      const question = await QuestionModel.create({
        quizId: new Types.ObjectId(),
        question: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });
      const req = { params: { id: question._id.toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await deleteQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('deleteQuestion should throw ForbiddenError if user is not creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const question = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });
      const req = { params: { id: question._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await deleteQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('deleteQuestion should throw BadRequestError if quiz is not Draft', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });
      const question = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });
      const req = { params: { id: question._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await deleteQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('deleteQuestion should catch database error', async () => {
      const req = { params: { id: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuestionModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await deleteQuestion(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('getQuestionsByQuizId should throw NotFoundError if quiz not found', async () => {
      const req = { params: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await getQuestionsByQuizId(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('getQuestionsByQuizId should throw ForbiddenError if user is not creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const req = { params: { quizId: quiz._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await getQuestionsByQuizId(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('getQuestionsByQuizId should throw ForbiddenError if candidate is not assigned', async () => {
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const req = { params: { quizId: quiz._id.toString() }, user: { _id: candidate._id.toString(), role: 'candidate' } } as any;
      const next = jest.fn();
      await getQuestionsByQuizId(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('getQuestionsByQuizId should catch database error', async () => {
      const req = { params: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await getQuestionsByQuizId(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('bulkImportQuestions should throw NotFoundError if quiz not found', async () => {
      const req = { body: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await bulkImportQuestions(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('bulkImportQuestions should throw ForbiddenError if user is not creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const req = { body: { quizId: quiz._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await bulkImportQuestions(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('bulkImportQuestions should throw BadRequestError if quiz is not Draft', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });
      const req = { body: { quizId: quiz._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await bulkImportQuestions(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('bulkImportQuestions should throw BadRequestError if questions is not a non-empty array', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Draft Quiz',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });
      const req = { body: { quizId: quiz._id.toString(), questions: [] }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await bulkImportQuestions(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('bulkImportQuestions should catch database error', async () => {
      const req = { body: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await bulkImportQuestions(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });
  });
});
