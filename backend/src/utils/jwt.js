import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function createToken(user) {
  return jwt.sign(user, env.jwtSecret, {
    expiresIn: '7d'
  });
}
