import request from 'supertest';
import { app } from '../app';
import QuizModel from '../modules/quizzes/quiz.model';
import QuestionModel from '../modules/questions/question.model';
import ParticipantModel from '../modules/participants/participant.model';
import AttemptModel from '../modules/attempts/attempt.model';
import { createMockUser, getAuthCookie } from './auth.helpers';
import { Types } from 'mongoose';
import { ForbiddenError } from '../shared/errors';
import * as quizController from '../modules/quizzes/quiz.controller';


describe('Attempts Module', () => {
  describe('POST /api/v1/attempts/start', () => {
    it('should start a new attempt session for an assigned candidate when quiz is live', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const now = new Date();
      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
        startTime: new Date(now.getTime() - 1000 * 60 * 5),
        endTime: new Date(now.getTime() + 1000 * 60 * 25),
      });

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post('/api/v1/attempts/start')
        .set('Cookie', getAuthCookie(candidate))
        .send({ quizId: quiz._id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('InProgress');
      expect(res.body.data.quizId).toBe(quiz._id.toString());
      expect(res.body.data.candidateId).toBe(candidate._id.toString());
    });

    it('should throw 403 if candidate is not assigned', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
        startTime: new Date(),
        endTime: new Date(Date.now() + 100000),
      });

      const res = await request(app)
        .post('/api/v1/attempts/start')
        .set('Cookie', getAuthCookie(candidate))
        .send({ quizId: quiz._id });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('You are not assigned to participate in this quiz');
    });

    it('should throw 400 if candidate starts another attempt', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
        startTime: new Date(Date.now() - 5000),
        endTime: new Date(Date.now() + 100000),
      });

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });
      await AttemptModel.create({ quizId: quiz._id, candidateId: candidate._id, status: 'InProgress', startedAt: new Date() });

      const res = await request(app)
        .post('/api/v1/attempts/start')
        .set('Cookie', getAuthCookie(candidate))
        .send({ quizId: quiz._id });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You have already attempted this quiz');
    });

    it('should throw 404 if quiz is not found', async () => {
      const candidate = await createMockUser('candidate');
      const nonexistentQuizId = new Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/attempts/start')
        .set('Cookie', getAuthCookie(candidate))
        .send({ quizId: nonexistentQuizId });

      expect(res.status).toBe(404);
    });

    it('should throw 400 if quiz is not Live', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Draft Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Draft',
      });

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post('/api/v1/attempts/start')
        .set('Cookie', getAuthCookie(candidate))
        .send({ quizId: quiz._id });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Quiz is not currently Live');
    });

    it('should throw 400 if current time is before start time', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Scheduled Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live', // Bypass status sync check for test purposes by forcing status
        startTime: new Date(Date.now() + 1000000),
        endTime: new Date(Date.now() + 2000000),
      });

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post('/api/v1/attempts/start')
        .set('Cookie', getAuthCookie(candidate))
        .send({ quizId: quiz._id });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Quiz has not started yet');
    });

    it('should throw 400 if current time is after end time', async () => {
      const spy = jest.spyOn(quizController, 'syncQuizStatuses').mockImplementation(async () => {});
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Completed Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live', // Force status Live to bypass sync block and check end time guard
        startTime: new Date(Date.now() - 200000),
        endTime: new Date(Date.now() - 100000),
      });

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post('/api/v1/attempts/start')
        .set('Cookie', getAuthCookie(candidate))
        .send({ quizId: quiz._id });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Quiz has already ended');
      spy.mockRestore();
    });
  });

  describe('POST /api/v1/attempts/save', () => {
    it('should save intermediate answers successfully', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'InProgress',
      });

      const questionId = new Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/attempts/save')
        .set('Cookie', getAuthCookie(candidate))
        .send({
          attemptId: attempt._id,
          answers: { [questionId]: [0] },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answers[questionId]).toEqual([0]);
    });

    it('should auto-submit attempt if duration has expired', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 1, // 1 minute
        instructorId: instructor._id,
        status: 'Live',
      });

      // Started 2 minutes ago
      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(Date.now() - 1000 * 60 * 2),
        status: 'InProgress',
      });

      const questionId = new Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/attempts/save')
        .set('Cookie', getAuthCookie(candidate))
        .send({
          attemptId: attempt._id,
          answers: { [questionId]: [1] },
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Time expired. Quiz has been auto-submitted.');
      expect(res.body.data.status).toBe('AutoSubmitted');
    });

    it('should throw 404 if attempt is not found', async () => {
      const candidate = await createMockUser('candidate');
      const nonexistentId = new Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/attempts/save')
        .set('Cookie', getAuthCookie(candidate))
        .send({ attemptId: nonexistentId, answers: {} });

      expect(res.status).toBe(404);
    });

    it('should throw 403 if candidate tries to save another user attempt', async () => {
      const candidate1 = await createMockUser('candidate');
      const candidate2 = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate2._id,
        startedAt: new Date(),
        status: 'InProgress',
      });

      const res = await request(app)
        .post('/api/v1/attempts/save')
        .set('Cookie', getAuthCookie(candidate1))
        .send({ attemptId: attempt._id, answers: {} });

      expect(res.status).toBe(403);
    });

    it('should throw 400 if attempt is not InProgress', async () => {
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'Submitted',
      });

      const res = await request(app)
        .post('/api/v1/attempts/save')
        .set('Cookie', getAuthCookie(candidate))
        .send({ attemptId: attempt._id, answers: {} });

      expect(res.status).toBe(400);
    });

    it('should throw 404 if quiz is not found during save check', async () => {
      const candidate = await createMockUser('candidate');
      const nonexistentQuizId = new Types.ObjectId();

      const attempt = await AttemptModel.create({
        quizId: nonexistentQuizId,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'InProgress',
      });

      const res = await request(app)
        .post('/api/v1/attempts/save')
        .set('Cookie', getAuthCookie(candidate))
        .send({ attemptId: attempt._id, answers: {} });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/attempts/submit', () => {
    it('should submit attempt, score it, and save the result', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });

      const question1 = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q1',
        options: ['a', 'b', 'c', 'd'],
        correctAnswers: [0],
      });

      const question2 = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q2',
        options: ['w', 'x', 'y', 'z'],
        correctAnswers: [1, 2],
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'InProgress',
      });

      // Submit: correct answer for Q1, incorrect for Q2
      const res = await request(app)
        .post('/api/v1/attempts/submit')
        .set('Cookie', getAuthCookie(candidate))
        .send({
          attemptId: attempt._id,
          answers: {
            [question1._id.toString()]: [0],
            [question2._id.toString()]: [1], // correct is [1, 2]
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Submitted');
      expect(res.body.data.score).toBe(1); // 1 correct, 1 wrong
      expect(res.body.data.timeTaken).toBeDefined();
    });

    it('should throw 404 if attempt nonexistent on submit', async () => {
      const candidate = await createMockUser('candidate');
      const nonexistentId = new Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/attempts/submit')
        .set('Cookie', getAuthCookie(candidate))
        .send({ attemptId: nonexistentId });

      expect(res.status).toBe(404);
    });

    it('should throw 403 if user is unauthorized on submit', async () => {
      const candidate1 = await createMockUser('candidate');
      const candidate2 = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate2._id,
        startedAt: new Date(),
        status: 'InProgress',
      });

      const res = await request(app)
        .post('/api/v1/attempts/submit')
        .set('Cookie', getAuthCookie(candidate1))
        .send({ attemptId: attempt._id });

      expect(res.status).toBe(403);
    });

    it('should throw 400 if already submitted', async () => {
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'Submitted',
      });

      const res = await request(app)
        .post('/api/v1/attempts/submit')
        .set('Cookie', getAuthCookie(candidate))
        .send({ attemptId: attempt._id });

      expect(res.status).toBe(400);
    });

    it('should throw 404 if associated quiz not found on submit', async () => {
      const candidate = await createMockUser('candidate');
      const nonexistentQuizId = new Types.ObjectId();

      const attempt = await AttemptModel.create({
        quizId: nonexistentQuizId,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'InProgress',
      });

      const res = await request(app)
        .post('/api/v1/attempts/submit')
        .set('Cookie', getAuthCookie(candidate))
        .send({ attemptId: attempt._id });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/attempts/active/:quizId', () => {
    it('should return active attempt if exists', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'InProgress',
      });

      const res = await request(app)
        .get(`/api/v1/attempts/active/${quiz._id}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(attempt._id.toString());
    });
  });

  describe('GET /api/v1/attempts/:id', () => {
    it('should return details with populate parameters', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Secret Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'Submitted',
      });

      const res = await request(app)
        .get(`/api/v1/attempts/${attempt._id}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(200);
      expect(res.body.data.quizId.title).toBe('Secret Quiz');
      expect(res.body.data.candidateId.email).toBe(candidate.email);
    });

    it('should throw 404 if attempt nonexistent', async () => {
      const candidate = await createMockUser('candidate');
      const nonexistentId = new Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/v1/attempts/${nonexistentId}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(404);
    });

    it('should throw 403 if candidate views another candidate details', async () => {
      const candidate1 = await createMockUser('candidate');
      const candidate2 = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Secret Quiz',
        duration: 30,
        instructorId: new Types.ObjectId(),
        status: 'Live',
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate2._id,
        startedAt: new Date(),
        status: 'Submitted',
      });

      const res = await request(app)
        .get(`/api/v1/attempts/${attempt._id}`)
        .set('Cookie', getAuthCookie(candidate1));

      expect(res.status).toBe(403);
    });

    it('should throw 403 if instructor views attempt of another instructor quiz', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Instructor 1 Quiz',
        duration: 30,
        instructorId: instructor1._id,
        status: 'Live',
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'Submitted',
      });

      const res = await request(app)
        .get(`/api/v1/attempts/${attempt._id}`)
        .set('Cookie', getAuthCookie(instructor2));

      expect(res.status).toBe(403);
    });
  });

  describe('Attempts Controller Unit Tests (Direct Calls & Uncovered Branches)', () => {
    it('startAttempt should throw ForbiddenError if req.user is missing', async () => {
      const { startAttempt } = require('../modules/attempts/attempt.controller');
      const req = { body: { quizId: '123' } } as any;
      const next = jest.fn();
      await startAttempt(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('startAttempt should catch database error', async () => {
      const { startAttempt } = require('../modules/attempts/attempt.controller');
      const req = { body: { quizId: '123' }, user: { _id: '456' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await startAttempt(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('saveAnswers should catch database error', async () => {
      const { saveAnswers } = require('../modules/attempts/attempt.controller');
      const req = { body: { attemptId: '123' }, user: { _id: '456' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(AttemptModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await saveAnswers(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('submitAttempt should catch database error', async () => {
      const { submitAttempt } = require('../modules/attempts/attempt.controller');
      const req = { body: { attemptId: '123' }, user: { _id: '456' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(AttemptModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await submitAttempt(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('getAttemptDetails should catch database error', async () => {
      const { getAttemptDetails } = require('../modules/attempts/attempt.controller');
      const req = { params: { id: '123' }, user: { _id: '456' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(AttemptModel, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn((_resolve, reject) => reject(new Error('DB error'))),
      } as any);
      await getAttemptDetails(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('getActiveAttempt should catch database error', async () => {
      const { getActiveAttempt } = require('../modules/attempts/attempt.controller');
      const req = { params: { quizId: '123' }, user: { _id: '456' } } as any;
      const next = jest.fn();
      const spy = jest.spyOn(AttemptModel, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      await getActiveAttempt(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });
  });
});
