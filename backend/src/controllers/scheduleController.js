import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';

async function getBatchAccessDetails(batchId) {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.teacher_id,
        b.name
      FROM batches b
      WHERE b.id = $1
    `,
    [batchId]
  );

  return result.rows[0];
}

async function assertUserCanViewBatchSchedules(user, batchId) {
  const batch = await getBatchAccessDetails(batchId);

  if (!batch) {
    return {
      error: {
        statusCode: 404,
        message: 'Batch not found.'
      }
    };
  }

  if (user.role === 'teacher') {
    if (batch.teacher_id !== user.id) {
      return {
        error: {
          statusCode: 403,
          message: 'You can only view schedules for your own batches.'
        }
      };
    }

    return { batch };
  }

  const enrollmentResult = await pool.query(
    `
      SELECT id
      FROM enrollments
      WHERE batch_id = $1
        AND student_id = $2
        AND status = 'active'
    `,
    [batchId, user.id]
  );

  if (enrollmentResult.rowCount === 0) {
    return {
      error: {
        statusCode: 403,
        message: 'You are not enrolled in this batch.'
      }
    };
  }

  return { batch };
}

export const createSchedule = asyncHandler(async (req, res) => {
  const { batchId, date, time, topic } = req.body;

  if (!batchId || !date || !time || !topic?.trim()) {
    return res.status(400).json({ message: 'Batch, date, time, and topic are required.' });
  }

  const batch = await getBatchAccessDetails(batchId);

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found.' });
  }

  if (batch.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only create schedules for your own batches.' });
  }

  const result = await pool.query(
    `
      INSERT INTO schedules (batch_id, date, time, topic)
      VALUES ($1, $2, $3, $4)
      RETURNING id, batch_id, date, time, topic, created_at
    `,
    [batchId, date, time, topic.trim()]
  );

  res.status(201).json({
    schedule: result.rows[0]
  });
});

export const listBatchSchedules = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const access = await assertUserCanViewBatchSchedules(req.user, batchId);

  if (access.error) {
    return res.status(access.error.statusCode).json({ message: access.error.message });
  }

  const result = await pool.query(
    `
      SELECT id, batch_id, date, time, topic, created_at
      FROM schedules
      WHERE batch_id = $1
      ORDER BY date ASC, time ASC, created_at ASC
    `,
    [batchId]
  );

  res.json({
    schedules: result.rows
  });
});

