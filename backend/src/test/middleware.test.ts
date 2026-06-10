import express from 'express';
import request from 'supertest';
import { mongoSanitize } from '../middleware/security';
import { errorHandler } from '../middleware/error';
import { validate } from '../middleware/validation';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError
} from '../shared/errors';
import { z } from 'zod';

describe('Middleware & Error Handlers', () => {
  describe('mongoSanitize', () => {
    it('should strip keys starting with $ or containing . from body, query, and params', async () => {
      const app = express();
      app.use(express.json());
      app.use(mongoSanitize);
      app.post('/test', (req, res) => {
        res.json({ body: req.body, query: req.query });
      });

      const res = await request(app)
        .post('/test?foo.bar=baz&$gt=5')
        .send({
          normal: 'value',
          '$invalid': 'bad',
          nested: {
            '$nestedInvalid': 'bad',
            'nested.dotted': 'bad',
            nestedNormal: 'good'
          }
        });

      expect(res.body.body.normal).toBe('value');
      expect(res.body.body['$invalid']).toBeUndefined();
      expect(res.body.body.nested['$nestedInvalid']).toBeUndefined();
      expect(res.body.body.nested['nested.dotted']).toBeUndefined();
      expect(res.body.body.nested.nestedNormal).toBe('good');
      expect(res.body.query['foo.bar']).toBeUndefined();
      expect(res.body.query['$gt']).toBeUndefined();
    });

    it('should bypass property if it is inherited', () => {
      const prototypeObj = { inherited: 'should_not_be_removed_even_if_it_starts_with_$' };
      const testObj = Object.create(prototypeObj);
      testObj.normal = 'value';
      testObj['$invalid'] = 'bad';
      
      const mockReq = {
        body: testObj,
      } as any;
      
      mongoSanitize(mockReq, {} as any, () => {});
      
      expect(mockReq.body.normal).toBe('value');
      expect(mockReq.body['$invalid']).toBeUndefined();
      expect(mockReq.body.inherited).toBe('should_not_be_removed_even_if_it_starts_with_$');
    });

    it('should skip sanitizing if body, query, or params are missing', () => {
      const mockReq = {} as any;
      expect(() => mongoSanitize(mockReq, {} as any, () => {})).not.toThrow();
    });
  });

  describe('validate middleware', () => {
    const testSchema = z.object({
      body: z.object({
        name: z.string().min(3),
      }),
    });

    it('should pass validation and call next() when data is valid', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', validate(testSchema), (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).post('/test').send({ name: 'Alice' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 validation error when data is invalid', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', validate(testSchema), (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).post('/test').send({ name: 'Al' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors[0].field).toBe('name');
    });

    it('should parse and assign query and params parameter updates', async () => {
      const app = express();
      app.use(express.json());
      const paramSchema = z.object({
        query: z.object({
          search: z.string().min(1),
        }),
        params: z.object({
          id: z.string().transform(Number),
        }),
      });

      app.get('/test/:id', validate(paramSchema), (req, res) => {
        res.json({ query: req.query, params: req.params });
      });

      const res = await request(app).get('/test/123?search=hello');
      expect(res.status).toBe(200);
      expect(res.body.params.id).toBe(123);
      expect(res.body.query.search).toBe('hello');
    });

    it('should call next with error if schemas throw other exceptions', async () => {
      const app = express();
      app.use(express.json());
      const badSchema = {
        parseAsync: () => { throw new Error('Unexpected parse error'); }
      } as any;
      app.post('/test', validate(badSchema), (_req, _res) => {
        // Unused
      });

      app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ success: false, message: err.message });
      });

      const res = await request(app).post('/test').send({});
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Unexpected parse error');
    });
  });

  describe('errorHandler', () => {
    it('should handle AppErrors with their status codes', async () => {
      const app = express();
      app.get('/error', (_req, _res, next) => {
        next(new BadRequestError('Custom bad request'));
      });
      app.use(errorHandler);

      const res = await request(app).get('/error');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Custom bad request');
    });

    it('should handle Mongoose CastError', async () => {
      const app = express();
      app.get('/error', (_req, _res, next) => {
        const err = new Error('Cast Error');
        err.name = 'CastError';
        next(err);
      });
      app.use(errorHandler);

      const res = await request(app).get('/error');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid ID format');
    });

    it('should handle Mongoose DuplicateKey error (code 11000)', async () => {
      const app = express();
      app.get('/error', (_req, _res, next) => {
        const err = new Error('Duplicate key');
        (err as any).code = 11000;
        next(err);
      });
      app.use(errorHandler);

      const res = await request(app).get('/error');
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Resource already exists or constraint violation');
    });

    it('should fallback to 500 for generic unhandled errors', async () => {
      const app = express();
      app.get('/error', (_req, _res, next) => {
        next(new Error('Something went wrong'));
      });
      app.use(errorHandler);

      const res = await request(app).get('/error');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Something went wrong');
    });

    it('should return default message in production mode for unhandled errors', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const app = express();
      app.get('/error', (_req, _res, next) => {
        next(new Error('Something went wrong'));
      });
      app.use(errorHandler);

      const res = await request(app).get('/error');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
      process.env.NODE_ENV = origNodeEnv;
    });
  });

  describe('Custom Errors default parameters', () => {
    it('should instantiate errors with default messages', () => {
      expect(new BadRequestError().message).toBe('Bad Request');
      expect(new UnauthorizedError().message).toBe('Unauthorized');
      expect(new ForbiddenError().message).toBe('Forbidden');
      expect(new NotFoundError().message).toBe('Resource Not Found');
      expect(new ConflictError().message).toBe('Conflict');
      expect(new InternalServerError().message).toBe('Internal Server Error');
    });
  });

  describe('Config Module fallback branches', () => {
    it('should fall back to defaults when environment variables are missing', () => {
      const backupPORT = process.env.PORT;
      const backupNODE_ENV = process.env.NODE_ENV;
      const backupJWT_SECRET = process.env.JWT_SECRET;
      const backupJWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
      const backupMONGODB_URI = process.env.MONGODB_URI;

      delete process.env.PORT;
      delete process.env.NODE_ENV;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_EXPIRES_IN;
      delete process.env.MONGODB_URI;

      const dotenv = require('dotenv');
      const dotenvSpy = jest.spyOn(dotenv, 'config').mockImplementation(() => ({} as any));

      const configPath = require.resolve('../config/index');
      delete require.cache[configPath];

      const { config: newConfig } = require('../config/index');
      
      expect(newConfig.PORT).toBe(3000);
      expect(newConfig.NODE_ENV).toBe('development');
      expect(newConfig.JWT_SECRET).toBe('super_secret_quiz_arena_key_123456');
      expect(newConfig.JWT_EXPIRES_IN).toBe('7d');
      expect(newConfig.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/quizarena');

      dotenvSpy.mockRestore();

      if (backupPORT !== undefined) process.env.PORT = backupPORT;
      else delete process.env.PORT;

      if (backupNODE_ENV !== undefined) process.env.NODE_ENV = backupNODE_ENV;
      else delete process.env.NODE_ENV;

      if (backupJWT_SECRET !== undefined) process.env.JWT_SECRET = backupJWT_SECRET;
      else delete process.env.JWT_SECRET;

      if (backupJWT_EXPIRES_IN !== undefined) process.env.JWT_EXPIRES_IN = backupJWT_EXPIRES_IN;
      else delete process.env.JWT_EXPIRES_IN;

      if (backupMONGODB_URI !== undefined) process.env.MONGODB_URI = backupMONGODB_URI;
      else delete process.env.MONGODB_URI;

      delete require.cache[configPath];
    });
  });

  describe('requireRole middleware', () => {
    it('should throw UnauthorizedError if req.user is missing', () => {
      const { requireRole } = require('../middleware/auth');
      const req = {} as any;
      const next = jest.fn();
      requireRole(['admin'])(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });
});
