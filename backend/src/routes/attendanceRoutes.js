import { Router } from 'express';
import { getAttendanceForBatch, markAttendance } from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('teacher'), markAttendance);
router.get('/:batchId', getAttendanceForBatch);

export default router;

