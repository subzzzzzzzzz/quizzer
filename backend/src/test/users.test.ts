import request from 'supertest';
import { app } from '../app';
import UserModel from '../modules/users/user.model';
import { createMockUser, getAuthCookie } from './auth.helpers';

describe('Users Module', () => {
  describe('POST /api/v1/users/assign-instructor', () => {
    it('should assign a user to the instructor role when called by an admin', async () => {
      const admin = await createMockUser('admin');
      const candidate = await createMockUser('candidate');
      const adminCookie = getAuthCookie(admin);

      const res = await request(app)
        .post('/api/v1/users/assign-instructor')
        .set('Cookie', adminCookie)
        .send({ email: candidate.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('instructor');

      const updatedUser = await UserModel.findById(candidate._id);
      expect(updatedUser?.role).toBe('instructor');
    });

    it('should return 400 bad request if email is not provided', async () => {
      const admin = await createMockUser('admin');
      const adminCookie = getAuthCookie(admin);

      const res = await request(app)
        .post('/api/v1/users/assign-instructor')
        .set('Cookie', adminCookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email is required');
    });

    it('should return 404 not found if the email is not registered', async () => {
      const admin = await createMockUser('admin');
      const adminCookie = getAuthCookie(admin);

      const res = await request(app)
        .post('/api/v1/users/assign-instructor')
        .set('Cookie', adminCookie)
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('email not registered');
    });

    it('should return 403 forbidden if called by an instructor', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const cookie = getAuthCookie(instructor);

      const res = await request(app)
        .post('/api/v1/users/assign-instructor')
        .set('Cookie', cookie)
        .send({ email: candidate.email });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/instructors', () => {
    it('should return a list of all instructors to an admin', async () => {
      const admin = await createMockUser('admin');
      const instructor = await createMockUser('instructor');
      const adminCookie = getAuthCookie(admin);

      const res = await request(app)
        .get('/api/v1/users/instructors')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const returnedInstructor = res.body.data.find((u: any) => u.email === instructor.email);
      expect(returnedInstructor).toBeDefined();
    });

    it('should return 403 forbidden to a candidate', async () => {
      const candidate = await createMockUser('candidate');
      const cookie = getAuthCookie(candidate);

      const res = await request(app)
        .get('/api/v1/users/instructors')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/users/candidates', () => {
    it('should return a list of candidates to an instructor', async () => {
      const instructor = await createMockUser('instructor');
      const candidate = await createMockUser('candidate');
      const cookie = getAuthCookie(instructor);

      const res = await request(app)
        .get('/api/v1/users/candidates')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const returnedCandidate = res.body.data.find((u: any) => u.email === candidate.email);
      expect(returnedCandidate).toBeDefined();
    });

    it('should return 403 forbidden to a candidate', async () => {
      const candidate = await createMockUser('candidate');
      const cookie = getAuthCookie(candidate);

      const res = await request(app)
        .get('/api/v1/users/candidates')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('Error handling mock tests', () => {
    it('should pass error to next() in assignInstructor if database error occurs', async () => {
      const admin = await createMockUser('admin');
      const adminCookie = getAuthCookie(admin);
      const findOneSpy = jest.spyOn(UserModel, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/v1/users/assign-instructor')
        .set('Cookie', adminCookie)
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(500);
      findOneSpy.mockRestore();
    });

    it('should pass error to next() in getInstructors if database error occurs', async () => {
      const admin = await createMockUser('admin');
      const adminCookie = getAuthCookie(admin);
      const findSpy = jest.spyOn(UserModel, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/v1/users/instructors')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(500);
      findSpy.mockRestore();
    });

    it('should pass error to next() in getCandidates if database error occurs', async () => {
      const instructor = await createMockUser('instructor');
      const cookie = getAuthCookie(instructor);
      const findSpy = jest.spyOn(UserModel, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/v1/users/candidates')
        .set('Cookie', cookie);

      expect(res.status).toBe(500);
      findSpy.mockRestore();
    });
  });
});
