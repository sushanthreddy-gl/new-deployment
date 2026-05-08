import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../src/models/User.js';

export const TEST_JWT_SECRET = 'test-jwt-secret-for-vitest';

/**
 * Creates a User document in the test DB.
 * @param {object} overrides  Optional field overrides.
 */
export const createTestUser = async ({
  username = 'testuser',
  email = 'test@example.com',
  password = 'password123',
} = {}) => {
  const hashed = await bcrypt.hash(password, 10);
  return User.create({ username, email, password: hashed });
};

/**
 * Signs a JWT using the shared test secret.
 * @param {string|ObjectId} userId
 */
export const generateToken = (userId) =>
  jwt.sign({ id: userId.toString() }, TEST_JWT_SECRET, { expiresIn: '1d' });

/**
 * Returns an Authorization header value for use with supertest.
 * @param {string|ObjectId} userId
 */
export const authHeader = (userId) => `Bearer ${generateToken(userId)}`;
