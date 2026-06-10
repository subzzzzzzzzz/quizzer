import { Router } from 'express';
import { assignInstructor, getInstructors, getCandidates } from './user.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/assign-instructor', requireRole(['admin']), assignInstructor);
router.get('/instructors', requireRole(['admin']), getInstructors);
router.get('/candidates', requireRole(['admin', 'instructor']), getCandidates);

export default router;
