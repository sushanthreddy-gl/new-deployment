/**
 * Integration tests — user routes
 *
 * Tests the full route → controller → service → in-memory DB pipeline.
 * Covers GET /api/users/search
 *
 * Run:  npm test
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import { createTestUser, authHeader, TEST_JWT_SECRET } from '../helpers/authHelper.js';
import userRoutes from '../../src/routes/user.js';
import errorHandler from '../../src/middleware/errorHandler.js';

// ─── One-time setup ────────────────────────────────────────────────────────────

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  await connectTestDB();
  app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _userCounter = 0;
const seedUser = (overrides = {}) => {
  _userCounter++;
  return createTestUser({
    username: `user${_userCounter}`,
    email: `user${_userCounter}@example.com`,
    ...overrides,
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// Auth guard
// ══════════════════════════════════════════════════════════════════════════════

describe('User routes — auth guard', () => {
  it('401 — rejects GET /api/users/search without a token', async () => {
    const res = await request(app).get('/api/users/search?q=alice');

    expect(res.status).toBe(401);
  });

  it('401 — rejects request with a malformed token', async () => {
    const res = await request(app)
      .get('/api/users/search?q=alice')
      .set('Authorization', 'Bearer not.a.valid.jwt');

    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/users/search — empty / missing query
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/users/search — empty / missing query param', () => {
  it('200 — returns empty users array when q is absent', async () => {
    const actor = await seedUser();

    const res = await request(app)
      .get('/api/users/search')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it('200 — returns empty users array for an empty q value', async () => {
    const actor = await seedUser();

    const res = await request(app)
      .get('/api/users/search?q=')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it('200 — returns empty users array for a whitespace-only q value', async () => {
    const actor = await seedUser();

    const res = await request(app)
      .get('/api/users/search?q=   ')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/users/search — matching results
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/users/search — matching results', () => {
  it('200 — finds a user by exact username', async () => {
    const actor = await seedUser();
    await createTestUser({ username: 'alice', email: 'alice@example.com' });

    const res = await request(app)
      .get('/api/users/search?q=alice')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe('alice');
  });

  it('200 — matches users by partial username', async () => {
    const actor = await seedUser();
    await createTestUser({ username: 'alice', email: 'alice@example.com' });
    await createTestUser({ username: 'alan', email: 'alan@example.com' });
    await createTestUser({ username: 'bob', email: 'bob@example.com' });

    const res = await request(app)
      .get('/api/users/search?q=al')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    const names = res.body.users.map((u) => u.username);
    expect(names).toContain('alice');
    expect(names).toContain('alan');
  });

  it('200 — search is case-insensitive', async () => {
    const actor = await seedUser();
    await createTestUser({ username: 'Charlie', email: 'charlie@example.com' });

    const res = await request(app)
      .get('/api/users/search?q=charlie')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe('Charlie');
  });

  it('200 — returns empty array when no users match', async () => {
    const actor = await seedUser();
    await createTestUser({ username: 'alice', email: 'alice@example.com' });

    const res = await request(app)
      .get('/api/users/search?q=zzznobody')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it('200 — returns all matching users when multiple exist', async () => {
    const actor = await seedUser();
    await createTestUser({ username: 'testA', email: 'ta@example.com' });
    await createTestUser({ username: 'testB', email: 'tb@example.com' });
    await createTestUser({ username: 'testC', email: 'tc@example.com' });
    await createTestUser({ username: 'other', email: 'o@example.com' });

    const res = await request(app)
      .get('/api/users/search?q=test')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/users/search — response shape
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/users/search — response shape', () => {
  it('user objects include _id, username, and email', async () => {
    const actor = await seedUser();
    await createTestUser({ username: 'alice', email: 'alice@example.com' });

    const res = await request(app)
      .get('/api/users/search?q=alice')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    const user = res.body.users[0];
    expect(user._id).toBeDefined();
    expect(user.username).toBe('alice');
    expect(user.email).toBe('alice@example.com');
  });

  it('user objects do not expose the password field', async () => {
    const actor = await seedUser();
    await createTestUser({ username: 'alice', email: 'alice@example.com' });

    const res = await request(app)
      .get('/api/users/search?q=alice')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body.users[0].password).toBeUndefined();
  });

  it('response body has a top-level users array', async () => {
    const actor = await seedUser();

    const res = await request(app)
      .get('/api/users/search?q=alice')
      .set('Authorization', authHeader(actor._id));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(Array.isArray(res.body.users)).toBe(true);
  });
});
