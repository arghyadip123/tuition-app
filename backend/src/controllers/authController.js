import { comparePassword, hashPassword } from '../utils/hash.js';
import pool from '../db/pool.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createToken } from '../utils/jwt.js';

const allowedRoles = new Set(['teacher', 'student']);

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: 'Full name, email, password, and role are required.' });
  }

  if (!allowedRoles.has(role)) {
    return res.status(400).json({ message: 'Role must be either teacher or student.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

  if (existingUser.rowCount > 0) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role, created_at
    `,
    [fullName.trim(), normalizedEmail, passwordHash, role]
  );

  const user = sanitizeUser(result.rows[0]);
  const token = createToken(user);

  res.status(201).json({ token, user });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    `
      SELECT id, full_name, email, password_hash, role, created_at
      FROM users
      WHERE LOWER(email) = $1
    `,
    [normalizedEmail]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const userRecord = result.rows[0];
  const isValidPassword = await comparePassword(password, userRecord.password_hash);

  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const user = sanitizeUser(userRecord);
  const token = createToken(user);

  res.json({ token, user });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      SELECT id, full_name, email, role, created_at
      FROM users
      WHERE id = $1
    `,
    [req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json({ user: sanitizeUser(result.rows[0]) });
});

