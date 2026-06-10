import request from 'supertest';
import { app } from '../app';
import QuizModel from '../modules/quizzes/quiz.model';
import ParticipantModel from '../modules/participants/participant.model';
import { createMockUser, getAuthCookie } from './auth.helpers';
import { Types } from 'mongoose';
import { getQuizParticipants, addParticipants, removeParticipant } from '../modules/participants/participant.controller';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

describe('Participants Module', () => {
  describe('GET /api/v1/participants/quiz/:quizId', () => {
    it('should retrieve a list of participants for the creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
      });

      const participant = await ParticipantModel.create({
        quizId: quiz._id,
        userId: candidate._id,
      });

      const res = await request(app)
        .get(`/api/v1/participants/quiz/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(participant._id.toString());
    });

    it('should throw 403 for non-creator instructor', async () => {
      const instructor1 = await createMockUser('instructor');
      const instructor2 = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor1._id,
      });

      const res = await request(app)
        .get(`/api/v1/participants/quiz/${quiz._id}`)
        .set('Cookie', getAuthCookie(instructor2));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/participants/bulk', () => {
    it('should add multiple registered participants by email, returning counts and listing unregistered ones', async () => {
      const instructor = await createMockUser('instructor');
      await createMockUser('candidate', { email: 'cand1@example.com' });
      await createMockUser('candidate', { email: 'cand2@example.com' });

      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const res = await request(app)
        .post('/api/v1/participants/bulk')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: quiz._id,
          emails: ['cand1@example.com', 'cand2@example.com', 'nonexistent@example.com'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(2);
      expect(res.body.data.registeredCount).toBe(2);
      expect(res.body.data.unregisteredCount).toBe(1);
      expect(res.body.data.unregisteredEmails).toEqual(['nonexistent@example.com']);

      const count = await ParticipantModel.countDocuments({ quizId: quiz._id });
      expect(count).toBe(2);
    });

    it('should not add duplicate assignments', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate', { email: 'dup@example.com' });

      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      // assign once
      await ParticipantModel.create({ quizId: quiz._id, userId: candidate._id });

      const res = await request(app)
        .post('/api/v1/participants/bulk')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: quiz._id,
          emails: ['dup@example.com'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.importedCount).toBe(0); // skipped duplicate
    });

    it('should throw 400 if emails is not a non-empty array', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const res = await request(app)
        .post('/api/v1/participants/bulk')
        .set('Cookie', getAuthCookie(instructor))
        .send({
          quizId: quiz._id,
          emails: [],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/participants/:id', () => {
    it('should remove a participant assignment from a draft quiz successfully', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: instructor._id,
        status: 'Draft',
      });

      const assignment = await ParticipantModel.create({
        quizId: quiz._id,
        userId: candidate._id,
      });

      const res = await request(app)
        .delete(`/api/v1/participants/${assignment._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(200);
      const exists = await ParticipantModel.findById(assignment._id);
      expect(exists).toBeNull();
    });

    it('should throw 400 when attempting to remove from a live quiz', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });

      const assignment = await ParticipantModel.create({
        quizId: quiz._id,
        userId: candidate._id,
      });

      const res = await request(app)
        .delete(`/api/v1/participants/${assignment._id}`)
        .set('Cookie', getAuthCookie(instructor));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Can only remove participants from Draft quizzes');
    });
  });

  describe('Participants Controller Unit Tests (Direct Calls)', () => {
    it('getQuizParticipants should throw NotFoundError if quiz does not exist', async () => {
      const req = { params: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await getQuizParticipants(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('getQuizParticipants should catch database error', async () => {
      const req = { params: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await getQuizParticipants(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('addParticipants should throw NotFoundError if quiz does not exist', async () => {
      const req = { body: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await addParticipants(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('addParticipants should throw ForbiddenError if user does not own the quiz', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const req = { body: { quizId: quiz._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await addParticipants(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('addParticipants should throw BadRequestError if quiz status is not Draft', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Live Quiz',
        duration: 10,
        instructorId: instructor._id,
        status: 'Live',
      });
      const req = { body: { quizId: quiz._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await addParticipants(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('addParticipants should catch database error', async () => {
      const req = { body: { quizId: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(QuizModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await addParticipants(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });

    it('removeParticipant should throw NotFoundError if participant not found', async () => {
      const req = { params: { id: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await removeParticipant(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('removeParticipant should throw NotFoundError if associated quiz not found', async () => {
      const participant = await ParticipantModel.create({
        quizId: new Types.ObjectId(),
        userId: new Types.ObjectId(),
      });
      const req = { params: { id: participant._id.toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      await removeParticipant(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('removeParticipant should throw ForbiddenError if user is not creator instructor', async () => {
      const instructor = await createMockUser('instructor');
      const quiz = await QuizModel.create({
        title: 'Quiz 1',
        duration: 10,
        instructorId: new Types.ObjectId(),
      });
      const participant = await ParticipantModel.create({
        quizId: quiz._id,
        userId: new Types.ObjectId(),
      });
      const req = { params: { id: participant._id.toString() }, user: { _id: instructor._id.toString(), role: 'instructor' } } as any;
      const next = jest.fn();
      await removeParticipant(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('removeParticipant should catch database error', async () => {
      const req = { params: { id: new Types.ObjectId().toString() }, user: { _id: '123', role: 'admin' } } as any;
      const next = jest.fn();
      const findSpy = jest.spyOn(ParticipantModel, 'findById').mockRejectedValueOnce(new Error('DB error'));
      await removeParticipant(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findSpy.mockRestore();
    });
  });
});
