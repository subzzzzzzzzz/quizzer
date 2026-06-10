import { Router } from 'express';
import { getAttemptReport, getQuizAnalytics, getGlobalAnalytics } from './analytics.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/global', requireRole(['admin', 'instructor']), getGlobalAnalytics);
router.get('/quiz/:quizId', requireRole(['admin', 'instructor']), getQuizAnalytics);
router.get('/attempt/:attemptId', getAttemptReport);

export default router;
