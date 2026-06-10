import { Router } from 'express';
import {
  addQuestion,
  editQuestion,
  deleteQuestion,
  getQuestionsByQuizId,
  bulkImportQuestions,
} from './question.controller';
import { addQuestionSchema, editQuestionSchema } from './question.validation';
import { validate } from '../../middleware/validation';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', requireRole(['admin', 'instructor']), validate(addQuestionSchema), addQuestion);
router.put('/:id', requireRole(['admin', 'instructor']), validate(editQuestionSchema), editQuestion);
router.delete('/:id', requireRole(['admin', 'instructor']), deleteQuestion);
router.get('/quiz/:quizId', getQuestionsByQuizId);
router.post('/bulk', requireRole(['admin', 'instructor']), bulkImportQuestions);

export default router;
