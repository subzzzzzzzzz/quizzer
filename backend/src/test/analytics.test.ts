import request from 'supertest';
import { app } from '../app';
import QuizModel from '../modules/quizzes/quiz.model';
import QuestionModel from '../modules/questions/question.model';
import ParticipantModel from '../modules/participants/participant.model';
import AttemptModel from '../modules/attempts/attempt.model';
import { createMockUser, getAuthCookie } from './auth.helpers';
import { Types } from 'mongoose';
import { getAttemptReport, getQuizAnalytics, getGlobalAnalytics } from '../modules/analytics/analytics.controller';
import { NotFoundError, ForbiddenError } from '../shared/errors';

describe('Analytics Module', () => {
  describe('GET /api/v1/analytics/global', () => {
    it('should return global metrics for admin with total user counts', async () => {
      const admin = await createMockUser('admin');
      const instructor = await createMockUser('instructor');
      await createMockUser('candidate');

      await QuizModel.create({
        title: 'Q1',
        duration: 15,
        instructorId: instructor._id,
        status: 'Live',
      });

      const res = await request(app)
        .get('/api/v1/analytics/global')
        .set('Cookie', getAuthCookie(admin));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quizzes.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.users.candidates).toBeGreaterThanOrEqual(1);
      expect(res.body.data.users.instructors).toBeGreaterThanOrEqual(1);
    });

    it('should return global metrics specific to instructor for instructor', async () => {
      const instructor = await createMockUser('instructor');
      const otherInstructor = await createMockUser('instructor');

      const quiz1 = await QuizModel.create({
        title: 'Instructor Quiz',
        duration: 15,
        instructorId: instructor._id,
        status: 'Draft',
      });

      await QuizModel.create({
        title: 'Other Quiz',
        duration: 15,
        instructorId: otherInstructor._id,
        status: 'Live',
      });

      const candidate = await createMockUser('candidate');
      await ParticipantModel.create({ quizId: quiz1._id, userId: candidate._id });

      const res = await request(app)
        .get('/api/v1/analytics/global')
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      // Instructor total count should be 1 (only their own)
      expect(res.body.data.quizzes.total).toBe(1);
      expect(res.body.data.users.candidates).toBe(1);
    });

    it('should return 403 forbidden for candidates', async () => {
      const candidate = await createMockUser('candidate');
      const res = await request(app)
        .get('/api/v1/analytics/global')
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/quiz/:quizId', () => {
    it('should calculate quiz statistics (highest, lowest, average, distribution)', async () => {
      const instructor = await createMockUser('instructor');
      const candidate1 = await createMockUser('candidate');
      const candidate2 = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Analytics Quiz',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });

      // Questions to make maxScore 5
      for (let i = 0; i < 5; i++) {
        await QuestionModel.create({
          quizId: quiz._id,
          question: `Q${i}`,
          options: ['a', 'b', 'c', 'd'],
          correctAnswers: [0],
        });
      }

      await ParticipantModel.create({ quizId: quiz._id, userId: candidate1._id });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate2._id });

      // candidate1 scores 5/5 (100% -> excellent)
      await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate1._id,
        startedAt: new Date(),
        submittedAt: new Date(),
        score: 5,
        status: 'Submitted',
      });

      // candidate2 scores 2/5 (40% -> average)
      await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate2._id,
        startedAt: new Date(),
        submittedAt: new Date(),
        score: 2,
        status: 'Submitted',
      });

      const res = await request(app)
        .get(`/api/v1/analytics/quiz/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      expect(res.body.data.quiz.maxScore).toBe(5);
      expect(res.body.data.metrics.avgScore).toBe(3.5);
      expect(res.body.data.metrics.highestScore).toBe(5);
      expect(res.body.data.metrics.lowestScore).toBe(2);
      expect(res.body.data.distribution.excellent).toBe(1);
      expect(res.body.data.distribution.average).toBe(1);
      expect(res.body.data.distribution.good).toBe(0);
      expect(res.body.data.distribution.poor).toBe(0);
    });
  });

  describe('GET /api/v1/analytics/attempt/:attemptId', () => {
    it('should generate an individual attempt detail report', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');

      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });

      const question = await QuestionModel.create({
        quizId: quiz._id,
        question: 'Is TypeScript structured?',
        options: ['Yes', 'No', 'Maybe', 'Sort of'],
        correctAnswers: [0],
      });

      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        submittedAt: new Date(),
        status: 'Submitted',
        answers: new Map([[question._id.toString(), [0]]]),
        score: 1,
      });

      const res = await request(app)
        .get(`/api/v1/analytics/attempt/${attempt._id}`)
        .set('Cookie', getAuthCookie(candidate));

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalQuestions).toBe(1);
      expect(res.body.data.summary.correctCount).toBe(1);
      expect(res.body.data.summary.percentage).toBe(100);
      expect(res.body.data.details[0].isCorrect).toBe(true);
    });
  });

  describe('Analytics Controller Unit Tests (Direct Calls)', () => {
    it('getAttemptReport should throw NotFoundError if attempt not found', async () => {
      const req = { params: { attemptId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await getAttemptReport(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('getAttemptReport should throw ForbiddenError if candidate views other candidate report', async () => {
      const candidate1 = await createMockUser('candidate');
      const candidate2 = await createMockUser('candidate');
      const attempt = await AttemptModel.create({
        quizId: new Types.ObjectId(),
        candidateId: candidate2._id,
        startedAt: new Date(),
        status: 'Submitted',
      });
      const req = { params: { attemptId: attempt._id.toString() }, user: { _id: candidate1._id.toString(), role: 'candidate' } } as any;
      const next = jest.fn();
      await getAttemptReport(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('getAttemptReport should throw ForbiddenError if instructor views report of other instructor quiz', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 15,
        instructorId: instructor1._id,
      });
      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: new Types.ObjectId(),
        startedAt: new Date(),
        status: 'Submitted',
      });
      const req = { params: { attemptId: attempt._id.toString() }, user: { _id: instructor2._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await getAttemptReport(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('getAttemptReport should catch database error', async () => {
      const req = { params: { attemptId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        then: jest.fn((_resolve, reject) => reject(new Error('DB error'))),
      } as any;
      const findSpy = jest.spyOn(AttemptModel, 'findById').mockReturnValueOnce(mockQuery);
      await getAttemptReport(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('getQuizAnalytics should throw NotFoundError if quiz not found', async () => {
      const req = { params: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await getQuizAnalytics(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('getQuizAnalytics should throw ForbiddenError if instructor does not own the quiz', async () => {
      const instructor1 = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 15,
        instructorId: new Types.ObjectId(),
      });
      const req = { params: { quizId: quiz._id.toString() }, user: { _id: instructor1._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await getQuizAnalytics(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('getQuizAnalytics should handle poor score distribution bucket', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 15,
        instructorId: instructor._id,
      });
      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q',
        options: ['1', '2', '3', '4'],
        correctAnswers: [0],
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });
      await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        score: 0,
        status: 'Submitted',
      });
      const req = { params: { quizId: quiz._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();
      await getQuizAnalytics(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('getQuizAnalytics should catch database error', async () => {
      const req = { params: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await getQuizAnalytics(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('getGlobalAnalytics should throw ForbiddenError if candidate tries to access', async () => {
      const candidate = await createMockUser('candidate');
      const req = { user: { _id: candidate._id.toString(), role: 'candidate' } } as any;
      const next = jest.fn();
      await getGlobalAnalytics(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('getGlobalAnalytics should catch database error', async () => {
      const req = { user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const countSpy = jest.spyOn(QuizModel, 'countDocuments').mockRejectedValueOnce(new Error('DB error'));
      await getGlobalAnalytics(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      countSpy.mockRestore();
    });

    it('getAttemptReport should return 0 percentage when totalQuestions is 0', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz with no questions',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });
      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'Submitted',
        score: 0,
      });

      const req = {
        params: { attemptId: attempt._id.toString() },
        user: { _id: candidate._id.toString(), role: 'candidate' }
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await getAttemptReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData.summary.totalQuestions).toBe(0);
      expect(responseData.summary.percentage).toBe(0);
    });

    it('getAttemptReport should handle missing answers in attempt answers map', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz with answers',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });
      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q',
        options: ['a', 'b', 'c', 'd'],
        correctAnswers: [0],
      });
      const attempt = await AttemptModel.create({
        quizId: quiz._id,
        candidateId: candidate._id,
        startedAt: new Date(),
        status: 'Submitted',
        answers: new Map(),
        score: 0,
      });

      const req = {
        params: { attemptId: attempt._id.toString() },
        user: { _id: candidate._id.toString(), role: 'candidate' }
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await getAttemptReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData.details[0].candidateAnswers).toEqual([]);
    });

    it('getQuizAnalytics should handle candidate participant without any attempts', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz with no attempts',
        duration: 30,
        instructorId: instructor._id,
        status: 'Live',
      });
      await QuestionModel.create({
        quizId: quiz._id,
        question: 'Q',
        options: ['a', 'b', 'c', 'd'],
        correctAnswers: [0],
      });
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const req = {
        params: { quizId: quiz._id.toString() },
        user: { _id: instructor._id.toString(), role: 'instructor' }
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await getQuizAnalytics(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData.participants[0].status).toBe('NotStarted');
      expect(responseData.participants[0].score).toBe(0);
      expect(responseData.participants[0].timeTaken).toBeNull();
    });
  });
});
