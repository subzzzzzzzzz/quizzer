import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  publishQuiz,
  cancelQuiz,
  deleteQuiz,
} from './quiz.controller';
import { createQuizSchema, updateQuizSchema } from './quiz.validation';
import { validate } from '../../middleware/validation';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', requireRole(['admin', 'instructor']), validate(createQuizSchema), createQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuizById);
router.put('/:id', requireRole(['admin', 'instructor']), validate(updateQuizSchema), updateQuiz);
router.post('/:id/publish', requireRole(['admin', 'instructor']), publishQuiz);
router.post('/:id/cancel', requireRole(['admin', 'instructor']), cancelQuiz);
router.delete('/:id', requireRole(['admin']), deleteQuiz);

export default router;
