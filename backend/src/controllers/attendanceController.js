import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';

async function getBatchForAttendance(batchId) {
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

async function ensureAttendanceReadAccess(user, batchId) {
  const batch = await getBatchForAttendance(batchId);

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
          message: 'You can only view attendance for your own batches.'
        }
      };
    }

    return { batch };
  }

  const enrollment = await pool.query(
    `
      SELECT id
      FROM enrollments
      WHERE batch_id = $1
        AND student_id = $2
        AND status = 'active'
    `,
    [batchId, user.id]
  );

  if (enrollment.rowCount === 0) {
    return {
      error: {
        statusCode: 403,
        message: 'You are not enrolled in this batch.'
      }
    };
  }

  return { batch };
}

export const markAttendance = asyncHandler(async (req, res) => {
  const { batchId, date, records } = req.body;

  if (!batchId || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: 'Batch, date, and attendance records are required.' });
  }

  const batch = await getBatchForAttendance(batchId);

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found.' });
  }

  if (batch.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only mark attendance for your own batches.' });
  }

  const validStatuses = new Set(['present', 'absent']);
  const studentIds = [];

  for (const record of records) {
    if (!record?.studentId || !validStatuses.has(record.status)) {
      return res.status(400).json({ message: 'Each attendance record needs a valid student and status.' });
    }

    studentIds.push(record.studentId);
  }

  const enrolledStudents = await pool.query(
    `
      SELECT student_id
      FROM enrollments
      WHERE batch_id = $1
        AND status = 'active'
        AND student_id = ANY($2::uuid[])
    `,
    [batchId, studentIds]
  );

  if (enrolledStudents.rowCount !== studentIds.length) {
    return res.status(400).json({ message: 'Attendance can only be marked for active students in the batch.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const record of records) {
      await client.query(
        `
          INSERT INTO attendance (batch_id, student_id, date, status)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (batch_id, student_id, date)
          DO UPDATE SET status = EXCLUDED.status
        `,
        [batchId, record.studentId, date, record.status]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.status(201).json({ message: 'Attendance saved successfully.' });
});

export const getAttendanceForBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const access = await ensureAttendanceReadAccess(req.user, batchId);

  if (access.error) {
    return res.status(access.error.statusCode).json({ message: access.error.message });
  }

  if (req.user.role === 'teacher') {
    const result = await pool.query(
      `
        SELECT
          a.id,
          a.batch_id,
          a.student_id,
          a.date,
          a.status,
          a.created_at,
          u.full_name AS student_name,
          u.email AS student_email
        FROM attendance a
        INNER JOIN users u ON u.id = a.student_id
        WHERE a.batch_id = $1
        ORDER BY a.date DESC, u.full_name ASC
      `,
      [batchId]
    );

    return res.json({ attendance: result.rows });
  }

  const result = await pool.query(
    `
      SELECT
        id,
        batch_id,
        student_id,
        date,
        status,
        created_at
      FROM attendance
      WHERE batch_id = $1
        AND student_id = $2
      ORDER BY date DESC, created_at DESC
    `,
    [batchId, req.user.id]
  );

  res.json({ attendance: result.rows });
});

