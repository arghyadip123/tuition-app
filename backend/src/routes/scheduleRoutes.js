import { Router } from 'express';
import { createSchedule, listBatchSchedules } from '../controllers/scheduleController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('teacher'), createSchedule);
router.get('/:batchId', listBatchSchedules);

export default router;

