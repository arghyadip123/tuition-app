import { Router } from 'express';
import {
  createBatch,
  enrollSelfInBatch,
  enrollStudentInBatch,
  getBatchDetails,
  listBatches,
  listDiscoverableBatches
} from '../controllers/batchController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/discover', authorize('student'), listDiscoverableBatches);
router.get('/', listBatches);
router.post('/', authorize('teacher'), createBatch);
router.get('/:batchId', getBatchDetails);
router.post('/:batchId/enrollments', authorize('teacher'), enrollStudentInBatch);
router.post('/:batchId/enroll-self', authorize('student'), enrollSelfInBatch);

export default router;

