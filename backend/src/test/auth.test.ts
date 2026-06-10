import request from 'supertest';
import { app } from '../app';
import UserModel from '../modules/users/user.model';
import { createMockUser, getAuthCookie, MOCK_PASSWORD } from './auth.helpers';
import { signup, login, logout, getMe } from '../modules/auth/auth.controller';
import { UnauthorizedError } from '../shared/errors';

describe('Auth Module', () => {
  describe('POST /api/v1/auth/signup', () => {
    it('should register a new candidate successfully and return status 201', async () => {
      const email = 'candidate@example.com';
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Candidate User',
          email,
          password: 'Password123!',
          role: 'candidate',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Candidate User');
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.role).toBe('candidate');
      expect(res.headers['set-cookie'][0]).toContain('token=');

      // Check DB entry
      const user = await UserModel.findOne({ email });
      expect(user).toBeTruthy();
      expect(user?.role).toBe('candidate');
    });

    it('should fail registration if email already exists', async () => {
      await createMockUser('candidate', { email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an existing active user successfully and return status 200', async () => {
      const email = 'loginuser@example.com';
      await createMockUser('instructor', { email });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email,
          password: MOCK_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(email);
      expect(res.headers['set-cookie'][0]).toContain('token=');
    });

    it('should fail login with incorrect password', async () => {
      const email = 'loginuser@example.com';
      await createMockUser('instructor', { email });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail login if the account status is inactive', async () => {
      const email = 'inactiveuser@example.com';
      await createMockUser('candidate', { email, status: 'inactive' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email,
          password: MOCK_PASSWORD,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear the auth token cookie and return status 200', async () => {
      const user = await createMockUser('candidate');
      const cookies = getAuthCookie(user);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie'][0]).toContain('token=;');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile if authenticated', async () => {
      const user = await createMockUser('admin');
      const cookies = getAuthCookie(user);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.role).toBe('admin');
    });

    it('should return 401 when request is not authenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when decode fails due to invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', ['token=invalid_token']);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired authentication token');
    });

    it('should return 401 when user does not exist in DB', async () => {
      const user = await createMockUser('admin');
      const cookies = getAuthCookie(user);
      await UserModel.deleteOne({ _id: user._id });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('User account is suspended or deleted');
    });
  });

  describe('Auth Controller Unit Tests (Direct Calls)', () => {
    it('signup should catch and pass error to next', async () => {
      const req = { body: { name: 'A', email: 'a@a.com', password: 'p', role: 'candidate' } } as any;
      const next = jest.fn();
      const findOneSpy = jest.spyOn(UserModel, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      await signup(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findOneSpy.mockRestore();
    });

    it('login should catch and pass error to next', async () => {
      const req = { body: { email: 'a@a.com', password: 'p' } } as any;
      const next = jest.fn();
      const findOneSpy = jest.spyOn(UserModel, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      await login(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      findOneSpy.mockRestore();
    });

    it('logout should catch and pass error to next', async () => {
      const res = {
        clearCookie: jest.fn().mockImplementation(() => {
          throw new Error('Cookie error');
        })
      } as any;
      const next = jest.fn();
      await logout({} as any, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('getMe should return unauthorized if req.user is missing', async () => {
      const req = {} as any;
      const next = jest.fn();
      await getMe(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('getMe should catch and pass error to next', async () => {
      const req = { user: { _id: '123', name: 'A', email: 'a@a.com', role: 'admin', status: 'active' } } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockImplementation(() => {
          throw new Error('JSON error');
        })
      } as any;
      const next = jest.fn();
      await getMe(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
