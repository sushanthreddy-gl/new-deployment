/**
 * Integration tests — analytics routes
 *
 * Tests the full route → controller → service → in-memory DB pipeline.
 * Covers:
 *   GET /api/analytics/personal
 *   GET /api/analytics/groups
 *   GET /api/analytics/personal/categories
 *   GET /api/analytics/group/:groupId/categories
 *
 * Run:  npm test
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import { createTestUser, authHeader, TEST_JWT_SECRET } from '../helpers/authHelper.js';
import analyticsRoutes from '../../src/routes/analytics.js';
import errorHandler from '../../src/middleware/errorHandler.js';
import Group from '../../src/models/Group.js';
import Expense from '../../src/models/Expense.js';

// ─── One-time setup ────────────────────────────────────────────────────────────

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  await connectTestDB();
  app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const seedUser = (overrides = {}) =>
  createTestUser({ username: 'testuser', email: 'test@example.com', ...overrides });

const seedGroup = (creator, name = 'Trip') =>
  Group.create({ name, members: [creator._id], createdBy: creator._id });

const seedExpense = (overrides = {}) =>
  Expense.create({
    amount: 100,
    type: 'personal',
    paidBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });

// ══════════════════════════════════════════════════════════════════════════════
// Auth guard
// ══════════════════════════════════════════════════════════════════════════════

describe('Analytics routes — auth guard', () => {
  it('401 — rejects GET /api/analytics/personal without a token', async () => {
    const res = await request(app).get('/api/analytics/personal');
    expect(res.status).toBe(401);
  });

  it('401 — rejects GET /api/analytics/groups without a token', async () => {
    const res = await request(app).get('/api/analytics/groups');
    expect(res.status).toBe(401);
  });

  it('401 — rejects GET /api/analytics/personal/categories without a token', async () => {
    const res = await request(app).get('/api/analytics/personal/categories');
    expect(res.status).toBe(401);
  });

  it('401 — rejects GET /api/analytics/group/:groupId/categories without a token', async () => {
    const res = await request(app).get(
      `/api/analytics/group/${new mongoose.Types.ObjectId()}/categories`
    );
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/personal
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/analytics/personal', () => {
  it('200 — returns an empty data array when no personal expenses exist', async () => {
    const user = await seedUser();

    const res = await request(app)
      .get('/api/analytics/personal')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('personal monthly spending');
    expect(res.body.data).toEqual([]);
  });

  it('200 — returns monthly totals for the authenticated user', async () => {
    const user = await seedUser();
    await seedExpense({ amount: 50, type: 'personal', paidBy: user._id, date: new Date('2024-03-10') });
    await seedExpense({ amount: 30, type: 'personal', paidBy: user._id, date: new Date('2024-03-25') });

    const res = await request(app)
      .get('/api/analytics/personal')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ year: 2024, month: 3, total: 80 });
  });

  it('200 — spans across multiple months correctly', async () => {
    const user = await seedUser();
    await seedExpense({ amount: 40, type: 'personal', paidBy: user._id, date: new Date('2024-01-05') });
    await seedExpense({ amount: 60, type: 'personal', paidBy: user._id, date: new Date('2024-03-15') });

    const res = await request(app)
      .get('/api/analytics/personal')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('200 — does not include expenses of other users', async () => {
    const user = await seedUser();
    const other = await createTestUser({ username: 'other', email: 'other@example.com' });
    await seedExpense({ amount: 200, type: 'personal', paidBy: other._id, date: new Date('2024-01-01') });

    const res = await request(app)
      .get('/api/analytics/personal')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('200 — ignores group expenses paid by the same user', async () => {
    const user = await seedUser();
    const group = await seedGroup(user);
    await seedExpense({ amount: 500, type: 'group', paidBy: user._id, groupId: group._id, date: new Date('2024-04-01') });
    await seedExpense({ amount: 20, type: 'personal', paidBy: user._id, date: new Date('2024-04-05') });

    const res = await request(app)
      .get('/api/analytics/personal')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].total).toBe(20);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/groups
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/analytics/groups', () => {
  it('200 — returns an empty array when the user has no group expenses', async () => {
    const user = await seedUser();

    const res = await request(app)
      .get('/api/analytics/groups')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('group spending summary');
    expect(res.body.data).toEqual([]);
  });

  it('200 — returns total spending per group with group name', async () => {
    const user = await seedUser();
    const group = await seedGroup(user, 'Holiday');
    await seedExpense({ amount: 100, type: 'group', paidBy: user._id, groupId: group._id });
    await seedExpense({ amount: 150, type: 'group', paidBy: user._id, groupId: group._id });

    const res = await request(app)
      .get('/api/analytics/groups')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ groupName: 'Holiday', total: 250 });
  });

  it('200 — reports "Unknown" when the group has been deleted', async () => {
    const user = await seedUser();
    const orphanGroupId = new mongoose.Types.ObjectId();
    await seedExpense({ amount: 75, type: 'group', paidBy: user._id, groupId: orphanGroupId });

    const res = await request(app)
      .get('/api/analytics/groups')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data[0].groupName).toBe('Unknown');
  });

  it('200 — excludes personal expenses from the summary', async () => {
    const user = await seedUser();
    await seedExpense({ amount: 300, type: 'personal', paidBy: user._id });

    const res = await request(app)
      .get('/api/analytics/groups')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('200 — returns separate entries for different groups', async () => {
    const user = await seedUser();
    const group1 = await seedGroup(user, 'Alpha');
    const group2 = await seedGroup(user, 'Beta');
    await seedExpense({ amount: 100, type: 'group', paidBy: user._id, groupId: group1._id });
    await seedExpense({ amount: 200, type: 'group', paidBy: user._id, groupId: group2._id });

    const res = await request(app)
      .get('/api/analytics/groups')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const names = res.body.data.map((d) => d.groupName);
    expect(names).toContain('Alpha');
    expect(names).toContain('Beta');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/personal/categories
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/analytics/personal/categories', () => {
  it('200 — returns an empty array when the user has no expenses', async () => {
    const user = await seedUser();

    const res = await request(app)
      .get('/api/analytics/personal/categories')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('personal category analytics');
    expect(res.body.data).toEqual([]);
  });

  it('200 — returns category totals for the authenticated user', async () => {
    const user = await seedUser();
    await seedExpense({ amount: 40, type: 'personal', paidBy: user._id, category: 'Food' });
    await seedExpense({ amount: 60, type: 'personal', paidBy: user._id, category: 'Food' });
    await seedExpense({ amount: 25, type: 'personal', paidBy: user._id, category: 'Transport' });

    const res = await request(app)
      .get('/api/analytics/personal/categories')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    const food = res.body.data.find((d) => d.category === 'Food');
    const transport = res.body.data.find((d) => d.category === 'Transport');
    expect(food.total).toBe(100);
    expect(transport.total).toBe(25);
  });

  it('200 — uses "Uncategorised" for expenses with no category', async () => {
    const user = await seedUser();
    await seedExpense({ amount: 50, type: 'personal', paidBy: user._id });

    const res = await request(app)
      .get('/api/analytics/personal/categories')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data[0].category).toBe('Uncategorised');
  });

  it('200 — only includes expenses belonging to the authenticated user', async () => {
    const user = await seedUser();
    const stranger = await createTestUser({ username: 'stranger', email: 'stranger@example.com' });
    await seedExpense({ amount: 999, type: 'personal', paidBy: stranger._id, category: 'Other' });

    const res = await request(app)
      .get('/api/analytics/personal/categories')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/group/:groupId/categories
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/analytics/group/:groupId/categories', () => {
  it('400 — returns an error for an invalid groupId', async () => {
    const user = await seedUser();

    const res = await request(app)
      .get('/api/analytics/group/invalid-id/categories')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('invalid group id');
  });

  it('200 — returns an empty array when the group has no expenses', async () => {
    const user = await seedUser();
    const group = await seedGroup(user);

    const res = await request(app)
      .get(`/api/analytics/group/${group._id}/categories`)
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('group category analytics');
    expect(res.body.data).toEqual([]);
  });

  it('200 — returns category totals for the group', async () => {
    const user = await seedUser();
    const group = await seedGroup(user);
    await seedExpense({ amount: 80, type: 'group', paidBy: user._id, groupId: group._id, category: 'Food' });
    await seedExpense({ amount: 45, type: 'group', paidBy: user._id, groupId: group._id, category: 'Transport' });

    const res = await request(app)
      .get(`/api/analytics/group/${group._id}/categories`)
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    const food = res.body.data.find((d) => d.category === 'Food');
    const transport = res.body.data.find((d) => d.category === 'Transport');
    expect(food.total).toBe(80);
    expect(transport.total).toBe(45);
  });

  it('200 — uses "Uncategorised" when expenses have no category', async () => {
    const user = await seedUser();
    const group = await seedGroup(user);
    await seedExpense({ amount: 50, type: 'group', paidBy: user._id, groupId: group._id });

    const res = await request(app)
      .get(`/api/analytics/group/${group._id}/categories`)
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data[0].category).toBe('Uncategorised');
  });

  it('200 — only includes expenses from the specified group', async () => {
    const user = await seedUser();
    const groupA = await seedGroup(user, 'Group A');
    const otherGroupId = new mongoose.Types.ObjectId();
    await seedExpense({ amount: 100, type: 'group', paidBy: user._id, groupId: groupA._id, category: 'Food' });
    await seedExpense({ amount: 999, type: 'group', paidBy: user._id, groupId: otherGroupId, category: 'Misc' });

    const res = await request(app)
      .get(`/api/analytics/group/${groupA._id}/categories`)
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('Food');
  });
});
