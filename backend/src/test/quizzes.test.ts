import request from 'supertest';
import { app } from '../app';
import QuizModel from '../modules/quizzes/quiz.model';
import QuestionModel from '../modules/questions/question.model';
import ParticipantModel from '../modules/participants/participant.model';
import { createMockUser, getAuthCookie } from './auth.helpers';
import { Types } from 'mongoose';
import { ForbiddenError } from '../shared/errors';


describe('Quizzes Module', () => {
  describe('POST /api/v1/quizzes', () => {
    it('should create a quiz in draft status when called by instructor', async () => {
      const instructor = await createMockUser('instructor');
      const cookie = getAuthCookie(instructor);

      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Cookie', cookie)
        .send({
          title: 'JavaScript Basics',
          duration: 30,
          questionType: 'single',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('JavaScript Basics');
      expect(res.body.data.status).toBe('Draft');
      expect(res.body.data.instructorId).toBe(instructor._id.toString());
    });

    it('should validate start and end times if both are provided', async () => {
      const instructor = await createMockUser('instructor');
      const cookie = getAuthCookie(instructor);

      const now = new Date();
      const start = new Date(now.getTime() + 1000 * 60 * 10).toISOString();
      const end = new Date(now.getTime() + 1000 * 60 * 5).toISOString(); // end is before start

      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Cookie', cookie)
        .send({
          title: 'JavaScript Basics',
          duration: '30', // testing string coercion
          startTime: start,
          endTime: end,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Start time must be before end time');
    });

    it('should create quiz with valid start and end times', async () => {
      const instructor = await createMockUser('instructor');
      const cookie = getAuthCookie(instructor);

      const now = new Date();
      const start = new Date(now.getTime() + 1000 * 60 * 5).toISOString();
      const end = new Date(now.getTime() + 1000 * 60 * 15).toISOString();

      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Cookie', cookie)
        .send({
          title: 'JavaScript Basics',
          duration: 30,
          startTime: start,
          endTime: end,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.startTime).toBeDefined();
    });
  });

  describe('GET /api/v1/quizzes', () => {
    it('should list all quizzes for an admin', async () => {
      const admin = await createMockUser('admin');
      const instructor = await createMockUser('instructor');
      await QuizModel.create({
        title: 'Quiz 1',
        duration: 20,
        instructorId: instructor._id,
      });

      const res = await request(app)
        .get('/api/v1/quizzes')
        .set('Cookie', getAuthCookie(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should list only own quizzes for an instructor', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');

      const quiz1 = await QuizModel.create({
        title: 'Quiz I1',
        duration: 20,
        instructorId: instructor1._id,
      });

      const quiz2 = await QuizModel.create({
        title: 'Quiz I2',
        duration: 20,
        instructorId: instructor2._id,
      });

      const res = await request(app)
        .get('/api/v1/quizzes')
        .set('Cookie', getAuthCookie(instructor1));

      expect(res.status).toBe(200);
      const quizIds = res.body.data.map((q: any) => q._id);
      expect(quizIds).toContain(quiz1._id.toString());
      expect(quizIds).not.toContain(quiz2._id.toString());
    });

    it('should list only assigned and non-draft quizzes for a candidate', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quizDraft = await QuizModel.create({
        title: 'Draft Quiz',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const quizLive = await QuizModel.create({
        title: 'Live Quiz',
        duration: 15,
        instructorId: instructor._id,
        status: 'Live',
      });

      // Assign candidate to both
      await ParticipantModel.create({ quizId: quizDraft._id, userId: candidate._id });
      await ParticipantModel.create({ quizId: quizLive._id, userId: candidate._id });

      const res = await request(app)
        .get('/api/v1/quizzes')
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(200);
      const quizIds = res.body.data.map((q: any) => q._id);
      expect(quizIds).toContain(quizLive._id.toString());
      expect(quizIds).not.toContain(quizDraft._id.toString());
    });
  });

  describe('GET /api/v1/quizzes/:id', () => {
    it('should fetch quiz details for creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Find Me',
        duration: 10,
        instructorId: instructor._id,
      });

      const res = await request(app)
        .get(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Find Me');
    });

    it('should throw 403 for non-creator instructor', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Secret Quiz',
        duration: 10,
        instructorId: instructor1._id,
      });

      const res = await request(app)
        .get(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor2));

      expect(res.status).toBe(403);
    });

    it('should throw 403 for candidate not assigned', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Secret Quiz',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });

      const res = await request(app)
        .get(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(403);
    });

    it('should throw 403 for candidate if quiz is in Draft mode', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Secret Quiz Draft',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .get(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('This quiz is not active yet');
    });

    it('should throw 404 if quiz does not exist', async () => {
      const instructor = await createMockUser('instructor');
      const nonexistentId = new Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/v1/quizzes/${nonexistentId}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/quizzes/:id', () => {
    it('should update quiz fields for creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Draft Title',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const res = await request(app)
        .put(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor))
        .send({ title: 'Updated Title', duration: 25 });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.duration).toBe(25);
    });

    it('should update start and end times if valid', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Draft Title',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const start = new Date(Date.now() + 10000).toISOString();
      const end = new Date(Date.now() + 20000).toISOString();

      const res = await request(app)
        .put(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor))
        .send({ startTime: start, endTime: end });

      expect(res.status).toBe(200);
    });

    it('should validate start and end times in update', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Draft Title',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const start = new Date(Date.now() + 20000).toISOString();
      const end = new Date(Date.now() + 10000).toISOString();

      const res = await request(app)
        .put(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor))
        .send({ startTime: start, endTime: end });

      expect(res.status).toBe(400);
    });

    it('should prevent edits to completed quizzes', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Done Quiz',
        duration: 10,
        instructorId: instructor._id,
        status: 'Completed',
      });

      const res = await request(app)
        .put(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor))
        .send({ title: 'New Title' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot edit a quiz in Completed status');
    });

    it('should throw 403 if non-creator instructor tries to update quiz', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Draft Quiz',
        duration: 10,
        instructorId: instructor1._id,
        status: 'Draft',
      });

      const res = await request(app)
        .put(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor2))
        .send({ title: 'Hack Title' });

      expect(res.status).toBe(403);
    });

    it('should throw 404 on update if quiz nonexistent', async () => {
      const instructor = await createMockUser('instructor');
      const nonexistentId = new Types.ObjectId().toString();

      const res = await request(app)
        .put(`/api/v1/quizzes/${nonexistentId}`)
        .set('Cookie', getAuthCookie(instructor))
        .send({ title: 'Hack Title' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/quizzes/:id/publish', () => {
    it('should publish a quiz and set status to Scheduled or Live', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      
      const start = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1hr from now
      const end = new Date(Date.now() + 1000 * 60 * 120).toISOString(); // 2hrs from now

      const quiz = await QuizModel.create({
        title: 'Ready Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Draft',
        startTime: new Date(start),
        endTime: new Date(end),
      });

      // Add a question & a participant to allow publish
      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Is JS cool?',
        options: ['Yes', 'No', 'Maybe', 'Dunno'],
        correctAnswers: [0],
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Scheduled');
    });

    it('should publish directly to Live status if startTime has passed', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      
      const start = new Date(Date.now() - 1000 * 60 * 10).toISOString(); // 10m ago
      const end = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1h from now

      const quiz = await QuizModel.create({
        title: 'Ready Live Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Draft',
        startTime: new Date(start),
        endTime: new Date(end),
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Is JS cool?',
        options: ['Yes', 'No', 'Maybe', 'Dunno'],
        correctAnswers: [0],
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Live');
    });

    it('should throw 403 if non-creator instructor tries to publish quiz', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Empty Quiz',
        duration: 20,
        instructorId: instructor1._id,
        status: 'Draft',
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor2));

      expect(res.status).toBe(403);
    });

    it('should throw bad request on publish if quiz is not Draft', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Empty Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Live',
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Only draft quizzes can be published');
    });

    it('should throw bad request on publish if quiz has no questions', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Empty Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Draft',
        startTime: new Date(),
        endTime: new Date(Date.now() + 100000),
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Quiz must have at least 1 question to be published');
    });

    it('should throw bad request on publish if quiz has no participants', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Empty Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Draft',
        startTime: new Date(),
        endTime: new Date(Date.now() + 100000),
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'q?',
        options: ['a', 'b', 'c', 'd'],
        correctAnswers: [0],
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Quiz must have at least 1 participant to be published');
    });

    it('should throw bad request on publish if quiz times are missing', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Empty Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Draft',
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'q?',
        options: ['a', 'b', 'c', 'd'],
        correctAnswers: [0],
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Quiz must have a start time and end time configured to be published');
    });

    it('should throw bad request on publish if quiz end time is in the past', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Empty Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Draft',
        startTime: new Date(Date.now() - 200000),
        endTime: new Date(Date.now() - 100000),
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'q?',
        options: ['a', 'b', 'c', 'd'],
        correctAnswers: [0],
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/publish`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Quiz end time is in the past');
    });
  });

  describe('POST /api/v1/quizzes/:id/cancel', () => {
    it('should cancel a quiz successfully', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'To Cancel',
        duration: 20,
        instructorId: instructor._id,
        status: 'Live',
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/cancel`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Cancelled');
      expect(res.body.data.cancelledAt).toBeDefined();
    });

    it('should throw 403 if non-creator instructor tries to cancel quiz', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz',
        duration: 20,
        instructorId: instructor1._id,
        status: 'Live',
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/cancel`)
        .set('Cookie', getAuthCookie(instructor2));

      expect(res.status).toBe(403);
    });

    it('should throw 400 if quiz is already cancelled', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz',
        duration: 20,
        instructorId: instructor._id,
        status: 'Cancelled',
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/cancel`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Quiz is already cancelled');
    });
  });

  describe('DELETE /api/v1/quizzes/:id', () => {
    it('should delete a quiz and all dependencies when called by admin', async () => {
      const admin = await createMockUser('admin');
      const quiz = await QuizModel.create({
        title: 'To Delete',
        duration: 20,
        instructorId: new Types.ObjectId(),
      });

      await QuestionModel.create({
        quizId: quiz._id,
        question: 'q?',
        options: ['a', 'b', 'c', 'd'],
        correctAnswers: [0],
      });

      const res = await request(app)
        .delete(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(admin));

      expect(res.status).toBe(200);
      
      const dbQuiz = await QuizModel.findById(quiz._id);
      expect(dbQuiz).toBeNull();
      const questionsCount = await QuestionModel.countDocuments({ quizId: quiz._id });
      expect(questionsCount).toBe(0);
    });

    it('should throw 403 for instructors trying to delete a quiz', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Safe Quiz',
        duration: 20,
        instructorId: instructor._id,
      });

      const res = await request(app)
        .delete(`/api/v1/quizzes/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(403);
    });

    it('should return candidateAttempt if candidate has started/completed quiz', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz with attempt',
        duration: 15,
        instructorId: instructor._id,
        status: 'Live',
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });
      
      const { default: AttemptModel } = require('../modules/attempts/attempt.model');
      await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        status: 'InProgress',
        startedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/quizzes')
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(200);
      const quizObj = res.body.data.find((q: any) => q._id === quiz._id.toString());
      expect(quizObj.candidateAttempt).toBeDefined();
      expect(quizObj.candidateAttempt.status).toBe('InProgress');
    });

    it('publishQuiz should return 404 if quiz is not found', async () => {
      const instructor = await createMockUser('instructor');
      const nonexistentId = new Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/v1/quizzes/${nonexistentId}/publish`)
        .set('Cookie', getAuthCookie(instructor));
      expect(res.status).toBe(404);
    });

    it('cancelQuiz should return 404 if quiz is not found', async () => {
      const instructor = await createMockUser('instructor');
      const nonexistentId = new Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/v1/quizzes/${nonexistentId}/cancel`)
        .set('Cookie', getAuthCookie(instructor));
      expect(res.status).toBe(404);
    });

    it('deleteQuiz should return 404 if quiz is not found by admin', async () => {
      const admin = await createMockUser('admin');
      const nonexistentId = new Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/quizzes/${nonexistentId}`)
        .set('Cookie', getAuthCookie(admin));
      expect(res.status).toBe(404);
    });
  });

  describe('Quiz Controller Direct Call Unit Tests (Error Catching & Undefined User)', () => {
    it('createQuiz should throw ForbiddenError if req.user is missing', async () => {
      const { createQuiz } = require('../modules/quizzes/quiz.controller');
      const req = { body: {} } as any;
      const next = jest.fn();
      await createQuiz(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('createQuiz should catch database error', async () => {
      const { createQuiz } = require('../modules/quizzes/quiz.controller');
      const req = { body: { title: 'Q' }, user: { _id: '123' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(QuizModel, 'create').mockRejectedValueOnce(new Error('DB error'));
      await createQuiz(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('getQuizzes should catch database error', async () => {
      const { getQuizzes } = require('../modules/quizzes/quiz.controller');
      const req = { user: { role: 'admin' } } as any;
      const next = jest.fn();
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValueOnce(new Error('DB error')),
      } as any;
      const spy = jest.spyOn(QuizModel, 'find').mockReturnValueOnce(mockQuery);
      await getQuizzes(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('getQuizById should catch database error', async () => {
      const { getQuizById } = require('../modules/quizzes/quiz.controller');
      const req = { params: { id: '123' }, user: { role: 'admin' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(QuizModel, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockRejectedValueOnce(new Error('DB error')),
      } as any);
      await getQuizById(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('updateQuiz should catch database error', async () => {
      const { updateQuiz } = require('../modules/quizzes/quiz.controller');
      const req = { params: { id: '123' }, body: {}, user: { role: 'admin' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await updateQuiz(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('publishQuiz should catch database error', async () => {
      const { publishQuiz } = require('../modules/quizzes/quiz.controller');
      const req = { params: { id: '123' }, user: { role: 'admin' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await publishQuiz(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('cancelQuiz should catch database error', async () => {
      const { cancelQuiz } = require('../modules/quizzes/quiz.controller');
      const req = { params: { id: '123' }, user: { role: 'admin' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await cancelQuiz(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('deleteQuiz should catch database error', async () => {
      const { deleteQuiz } = require('../modules/quizzes/quiz.controller');
      const req = { params: { id: '123' }, user: { role: 'admin' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await deleteQuiz(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });
  });
});
