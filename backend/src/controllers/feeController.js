import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';

async function getBatchForFees(batchId) {
  const result = await pool.query(
    `
      SELECT id, teacher_id, name
      FROM batches
      WHERE id = $1
    `,
    [batchId]
  );

  return result.rows[0];
}

async function ensureTeacherOwnsBatch(userId, batchId) {
  const batch = await getBatchForFees(batchId);

  if (!batch) {
    return {
      error: {
        statusCode: 404,
        message: 'Batch not found.'
      }
    };
  }

  if (batch.teacher_id !== userId) {
    return {
      error: {
        statusCode: 403,
        message: 'You can only manage fees for your own batches.'
      }
    };
  }

  return { batch };
}

export const createFee = asyncHandler(async (req, res) => {
  const { studentId, batchId, amount, dueDate } = req.body;

  if (!studentId || !batchId || amount === undefined || !dueDate) {
    return res.status(400).json({ message: 'Student, batch, amount, and due date are required.' });
  }

  const batchAccess = await ensureTeacherOwnsBatch(req.user.id, batchId);

  if (batchAccess.error) {
    return res.status(batchAccess.error.statusCode).json({ message: batchAccess.error.message });
  }

  const enrollment = await pool.query(
    `
      SELECT id
      FROM enrollments
      WHERE batch_id = $1
        AND student_id = $2
        AND status = 'active'
    `,
    [batchId, studentId]
  );

  if (enrollment.rowCount === 0) {
    return res.status(400).json({ message: 'Fee entries can only be created for active students in the batch.' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO fees (student_id, batch_id, amount, status, due_date)
        VALUES ($1, $2, $3, 'pending', $4)
        RETURNING id, student_id, batch_id, amount, status, due_date, paid_at, created_at
      `,
      [studentId, batchId, Number(amount), dueDate]
    );

    res.status(201).json({ fee: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A fee for this student and due date already exists.' });
    }

    throw error;
  }
});

export const getFeesForBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const batchAccess = await ensureTeacherOwnsBatch(req.user.id, batchId);

  if (batchAccess.error) {
    return res.status(batchAccess.error.statusCode).json({ message: batchAccess.error.message });
  }

  const result = await pool.query(
    `
      SELECT
        f.id,
        f.student_id,
        f.batch_id,
        f.amount,
        f.status,
        f.due_date,
        f.paid_at,
        f.created_at,
        u.full_name AS student_name,
        u.email AS student_email
      FROM fees f
      INNER JOIN users u ON u.id = f.student_id
      WHERE f.batch_id = $1
      ORDER BY f.due_date ASC, u.full_name ASC
    `,
    [batchId]
  );

  res.json({ fees: result.rows });
});

export const getStudentFees = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      SELECT
        f.id,
        f.student_id,
        f.batch_id,
        f.amount,
        f.status,
        f.due_date,
        f.paid_at,
        f.created_at,
        b.name AS batch_name,
        b.subject AS batch_subject
      FROM fees f
      INNER JOIN batches b ON b.id = f.batch_id
      WHERE f.student_id = $1
      ORDER BY f.due_date ASC, f.created_at DESC
    `,
    [req.user.id]
  );

  res.json({ fees: result.rows });
});

export const markFeeAsPaid = asyncHandler(async (req, res) => {
  const feeResult = await pool.query(
    `
      SELECT id, batch_id, status
      FROM fees
      WHERE id = $1
    `,
    [req.params.id]
  );

  if (feeResult.rowCount === 0) {
    return res.status(404).json({ message: 'Fee record not found.' });
  }

  const fee = feeResult.rows[0];
  const batchAccess = await ensureTeacherOwnsBatch(req.user.id, fee.batch_id);

  if (batchAccess.error) {
    return res.status(batchAccess.error.statusCode).json({ message: batchAccess.error.message });
  }

  const result = await pool.query(
    `
      UPDATE fees
      SET
        status = 'paid',
        paid_at = COALESCE(paid_at, NOW())
      WHERE id = $1
      RETURNING id, student_id, batch_id, amount, status, due_date, paid_at, created_at
    `,
    [req.params.id]
  );

  res.json({ fee: result.rows[0] });
});

