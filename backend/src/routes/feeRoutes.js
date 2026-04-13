import { Router } from 'express';
import { createFee, getFeesForBatch, getStudentFees, markFeeAsPaid } from '../controllers/feeController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('teacher'), createFee);
router.get('/batch/:batchId', authorize('teacher'), getFeesForBatch);
router.get('/student', authorize('student'), getStudentFees);
router.patch('/:id/pay', authorize('teacher'), markFeeAsPaid);

export default router;

