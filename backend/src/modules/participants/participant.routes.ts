import { Router } from 'express';
import { getQuizParticipants, addParticipants, removeParticipant } from './participant.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/quiz/:quizId', getQuizParticipants);
router.post('/bulk', requireRole(['admin', 'instructor']), addParticipants);
router.delete('/:id', requireRole(['admin', 'instructor']), removeParticipant);

export default router;
