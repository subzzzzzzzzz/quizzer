import { Router } from 'express';
import {
  startAttempt,
  saveAnswers,
  submitAttempt,
  getAttemptDetails,
  getActiveAttempt,
} from './attempt.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/start', requireRole(['candidate']), startAttempt);
router.post('/save', requireRole(['candidate']), saveAnswers);
router.post('/submit', requireRole(['candidate']), submitAttempt);
router.get('/active/:quizId', requireRole(['candidate']), getActiveAttempt);
router.get('/:id', getAttemptDetails);

export default router;
