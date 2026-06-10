import { Router } from 'express';
import { signup, login, logout, getMe } from './auth.controller';
import { signupSchema, loginSchema } from './auth.validation';
import { validate } from '../../middleware/validation';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
