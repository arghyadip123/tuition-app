import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const students = await pool.query(`SELECT COUNT(*) FROM users WHERE role='student'`);
    const teachers = await pool.query(`SELECT COUNT(*) FROM users WHERE role='teacher'`);
    const fees = await pool.query(`SELECT COALESCE(SUM(amount),0) FROM fees`);

    res.json({
      totalStudents: students.rows[0].count,
      totalTeachers: teachers.rows[0].count,
      totalFees: fees.rows[0].coalesce
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;