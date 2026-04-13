import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';

async function getBatchById(batchId) {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.teacher_id,
        b.name,
        b.subject,
        b.description,
        b.start_date,
        b.end_date,
        b.capacity,
        b.created_at,
        u.full_name AS teacher_name,
        u.email AS teacher_email
      FROM batches b
      INNER JOIN users u ON u.id = b.teacher_id
      WHERE b.id = $1
    `,
    [batchId]
  );

  return result.rows[0];
}

export const createBatch = asyncHandler(async (req, res) => {
  const { name, subject, description, startDate, endDate, capacity } = req.body;

  if (!name || !subject) {
    return res.status(400).json({ message: 'Batch name and subject are required.' });
  }

  const result = await pool.query(
    `
      INSERT INTO batches (teacher_id, name, subject, description, start_date, end_date, capacity)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, teacher_id, name, subject, description, start_date, end_date, capacity, created_at
    `,
    [
      req.user.id,
      name.trim(),
      subject.trim(),
      description?.trim() || null,
      startDate || null,
      endDate || null,
      capacity ? Number(capacity) : null
    ]
  );

  res.status(201).json({ batch: result.rows[0] });
});

export const listBatches = asyncHandler(async (req, res) => {
  if (req.user.role === 'teacher') {
    const result = await pool.query(
      `
        SELECT
          b.id,
          b.name,
          b.subject,
          b.description,
          b.start_date,
          b.end_date,
          b.capacity,
          b.created_at,
          COUNT(e.id)::INT AS enrolled_count
        FROM batches b
        LEFT JOIN enrollments e
          ON e.batch_id = b.id
          AND e.status = 'active'
        WHERE b.teacher_id = $1
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `,
      [req.user.id]
    );

    return res.json({ batches: result.rows });
  }

  const result = await pool.query(
    `
      SELECT
        b.id,
        b.name,
        b.subject,
        b.description,
        b.start_date,
        b.end_date,
        b.capacity,
        b.created_at,
        u.full_name AS teacher_name,
        e.status AS enrollment_status
      FROM enrollments e
      INNER JOIN batches b ON b.id = e.batch_id
      INNER JOIN users u ON u.id = b.teacher_id
      WHERE e.student_id = $1
        AND e.status = 'active'
      ORDER BY b.created_at DESC
    `,
    [req.user.id]
  );

  res.json({ batches: result.rows });
});

export const listDiscoverableBatches = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.name,
        b.subject,
        b.description,
        b.start_date,
        b.end_date,
        b.capacity,
        b.created_at,
        u.full_name AS teacher_name,
        COUNT(e.id)::INT AS enrolled_count
      FROM batches b
      INNER JOIN users u ON u.id = b.teacher_id
      LEFT JOIN enrollments e
        ON e.batch_id = b.id
        AND e.status = 'active'
      WHERE b.id NOT IN (
        SELECT batch_id
        FROM enrollments
        WHERE student_id = $1
          AND status = 'active'
      )
      GROUP BY b.id, u.id
      ORDER BY b.created_at DESC
    `,
    [req.user.id]
  );

  res.json({ batches: result.rows });
});

export const getBatchDetails = asyncHandler(async (req, res) => {
  const batch = await getBatchById(req.params.batchId);

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found.' });
  }

  if (req.user.role === 'teacher' && batch.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only view your own batches.' });
  }

  if (req.user.role === 'student') {
    const enrollment = await pool.query(
      `
        SELECT id
        FROM enrollments
        WHERE batch_id = $1 AND student_id = $2 AND status = 'active'
      `,
      [req.params.batchId, req.user.id]
    );

    if (enrollment.rowCount === 0) {
      return res.status(403).json({ message: 'You are not enrolled in this batch.' });
    }
  }

  const studentsResult = await pool.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        e.status,
        e.created_at
      FROM enrollments e
      INNER JOIN users u ON u.id = e.student_id
      WHERE e.batch_id = $1
        AND e.status = 'active'
      ORDER BY e.created_at DESC
    `,
    [req.params.batchId]
  );

  res.json({
    batch: {
      ...batch,
      students: studentsResult.rows
    }
  });
});

export const enrollStudentInBatch = asyncHandler(async (req, res) => {
  const { studentEmail } = req.body;

  if (!studentEmail) {
    return res.status(400).json({ message: 'Student email is required.' });
  }

  const batch = await getBatchById(req.params.batchId);

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found.' });
  }

  if (batch.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only enroll students in your own batches.' });
  }

  const studentResult = await pool.query(
    `
      SELECT id, role
      FROM users
      WHERE LOWER(email) = $1
    `,
    [studentEmail.trim().toLowerCase()]
  );

  if (studentResult.rowCount === 0) {
    return res.status(404).json({ message: 'No student account was found for that email.' });
  }

  const student = studentResult.rows[0];

  if (student.role !== 'student') {
    return res.status(400).json({ message: 'Only student accounts can be enrolled in batches.' });
  }

  await pool.query(
    `
      INSERT INTO enrollments (batch_id, student_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (batch_id, student_id)
      DO UPDATE SET status = 'active'
    `,
    [req.params.batchId, student.id]
  );

  res.status(201).json({ message: 'Student enrolled successfully.' });
});

export const enrollSelfInBatch = asyncHandler(async (req, res) => {
  const batch = await getBatchById(req.params.batchId);

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found.' });
  }

  await pool.query(
    `
      INSERT INTO enrollments (batch_id, student_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (batch_id, student_id)
      DO UPDATE SET status = 'active'
    `,
    [req.params.batchId, req.user.id]
  );

  res.status(201).json({ message: 'You are now enrolled in this batch.' });
});
