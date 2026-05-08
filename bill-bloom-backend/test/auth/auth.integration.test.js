/**
 * Integration tests — /api/auth
 *
 * Tests the full route → controller → in-memory DB pipeline using
 * Supertest and MongoMemoryServer.
 *
 * Run:  npm test
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import { createTestUser, TEST_JWT_SECRET } from '../helpers/authHelper.js';
import authRoutes from '../../src/routes/auth.js';
import errorHandler from '../../src/middleware/errorHandler.js';

// ─── App setup ────────────────────────────────────────────────────────────────

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  await connectTestDB();
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ─── Shared test data ─────────────────────────────────────────────────────────

const VALID_USER = { username: 'alice', email: 'alice@example.com', password: 'password123' };

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/register', () => {
  it('201 — creates a user and returns id, username, email, createdAt', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('user created');
    expect(res.body.user).toMatchObject({ username: 'alice', email: 'alice@example.com' });
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('createdAt');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('400 — missing username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('400 — missing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('400 — missing password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@example.com' });

    expect(res.status).toBe(400);
  });

  it('400 — password too short (< 6 characters)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 characters/i);
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid email/i);
  });

  it('409 — duplicate email', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, username: 'alice2' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email.*in use/i);
  });

  it('409 — duplicate username', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'other@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/username.*in use/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await createTestUser({ username: 'alice', email: 'alice@example.com', password: 'password123' });
  });

  it('200 — returns a JWT token and user info on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('login successful');
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ username: 'alice', email: 'alice@example.com' });
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('400 — missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('400 — missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
  });

  it('401 — email not registered', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('401 — wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/auth/me', () => {
  /**
   * Registers + logs in a fresh user and returns the issued token.
   */
  const registerAndLogin = async (user = VALID_USER) => {
    await request(app).post('/api/auth/register').send(user);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    return loginRes.body.token;
  };

  it('200 — returns current user info for a valid token', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'alice', email: 'alice@example.com' });
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('401 — no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 — missing "Bearer" prefix', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'justtoken');
    expect(res.status).toBe(401);
  });

  it('401 — malformed / tampered token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });
});
