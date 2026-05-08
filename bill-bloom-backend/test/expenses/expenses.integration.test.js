/**
 * Integration tests — expenses routes
 *
 * Tests the full route → controller → service → in-memory DB pipeline.
 * Covers POST /, GET /group/:groupId, GET /personal, DELETE /:expenseId.
 *
 * Run:  npm test
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import { createTestUser, authHeader, TEST_JWT_SECRET } from '../helpers/authHelper.js';
import expenseRoutes from '../../src/routes/expenses.js';
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
  app.use('/api/expenses', expenseRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const seedTwoUsers = async () => {
  const payer = await createTestUser({ username: 'payer', email: 'payer@example.com' });
  const member = await createTestUser({ username: 'member', email: 'member@example.com' });
  return { payer, member };
};

const seedGroup = (creator, member, name = 'Test Group') =>
  Group.create({ name, members: [creator._id, member._id], createdBy: creator._id });

const seedExpense = (overrides = {}) =>
  Expense.create({ amount: 100, type: 'personal', paidBy: new mongoose.Types.ObjectId(), ...overrides });

// ══════════════════════════════════════════════════════════════════════════════
// Auth guard
// ══════════════════════════════════════════════════════════════════════════════

describe('Expenses routes — auth guard', () => {
  it('401 — rejects POST /api/expenses without a token', async () => {
    const res = await request(app).post('/api/expenses').send({ amount: 50, type: 'personal' });
    expect(res.status).toBe(401);
  });

  it('401 — rejects GET /api/expenses/personal without a token', async () => {
    const res = await request(app).get('/api/expenses/personal');
    expect(res.status).toBe(401);
  });

  it('401 — rejects GET /api/expenses/group/:groupId without a token', async () => {
    const res = await request(app).get(`/api/expenses/group/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(401);
  });

  it('401 — rejects DELETE /api/expenses/:expenseId without a token', async () => {
    const res = await request(app).delete(`/api/expenses/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/expenses — personal expense
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/expenses — personal expense', () => {
  it('201 — creates a personal expense with valid data', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 25.5,
        type: 'personal',
        paidBy: payer._id.toString(),
        description: 'Coffee',
        category: 'Food',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('expense created');
    expect(res.body.expense).toMatchObject({ amount: 25.5, type: 'personal' });
  });

  it('201 — persists the expense in the database', async () => {
    const { payer } = await seedTwoUsers();

    await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({ amount: 40, type: 'personal', paidBy: payer._id.toString() });

    const count = await Expense.countDocuments({ type: 'personal', paidBy: payer._id });
    expect(count).toBe(1);
  });

  it('400 — missing amount field', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({ type: 'personal', paidBy: payer._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/amount/i);
  });

  it('400 — amount is zero', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({ amount: 0, type: 'personal', paidBy: payer._id.toString() });

    expect(res.status).toBe(400);
  });

  it('400 — amount is negative', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({ amount: -5, type: 'personal', paidBy: payer._id.toString() });

    expect(res.status).toBe(400);
  });

  it('400 — type is invalid', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({ amount: 10, type: 'cash', paidBy: payer._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/"group" or "personal"/i);
  });

  it('400 — paidBy is not a valid ObjectId', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({ amount: 10, type: 'personal', paidBy: 'bad-id' });

    expect(res.status).toBe(400);
  });

  it('400 — paidBy user does not exist in the DB', async () => {
    const { payer } = await seedTwoUsers();
    const ghostId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({ amount: 10, type: 'personal', paidBy: ghostId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/paidBy user does not exist/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/expenses — group expense
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/expenses — group expense', () => {
  it('201 — creates a group expense with valid data', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 60,
        type: 'group',
        paidBy: payer._id.toString(),
        groupId: group._id.toString(),
        participants: [payer._id.toString(), member._id.toString()],
        description: 'Dinner',
        category: 'Food',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('expense created');
    expect(res.body.expense).toMatchObject({ amount: 60, type: 'group' });
  });

  it('201 — persists the group expense in the database', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 60,
        type: 'group',
        paidBy: payer._id.toString(),
        groupId: group._id.toString(),
        participants: [payer._id.toString(), member._id.toString()],
      });

    const count = await Expense.countDocuments({ type: 'group', groupId: group._id });
    expect(count).toBe(1);
  });

  it('400 — groupId is missing', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 50,
        type: 'group',
        paidBy: payer._id.toString(),
        participants: [payer._id.toString(), new mongoose.Types.ObjectId().toString()],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/groupId.*required/i);
  });

  it('404 — group does not exist', async () => {
    const { payer, member } = await seedTwoUsers();
    const fakeGroupId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 60,
        type: 'group',
        paidBy: payer._id.toString(),
        groupId: fakeGroupId,
        participants: [payer._id.toString(), member._id.toString()],
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('group not found');
  });

  it('400 — participants array has fewer than 2 entries', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 60,
        type: 'group',
        paidBy: payer._id.toString(),
        groupId: group._id.toString(),
        participants: [payer._id.toString()],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/participants array with 2 or more/i);
  });

  it('400 — a participant is not a member of the group', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);
    const outsider = await createTestUser({ username: 'outsider', email: 'outsider@example.com' });

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 60,
        type: 'group',
        paidBy: payer._id.toString(),
        groupId: group._id.toString(),
        participants: [payer._id.toString(), outsider._id.toString()],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not a member of the group/i);
  });

  it('400 — paidBy is not a member of the group', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);
    const outsider = await createTestUser({ username: 'outsider2', email: 'outsider2@example.com' });

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', authHeader(payer._id))
      .send({
        amount: 60,
        type: 'group',
        paidBy: outsider._id.toString(),
        groupId: group._id.toString(),
        participants: [payer._id.toString(), member._id.toString()],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/paidBy must be a member/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/expenses/group/:groupId
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/expenses/group/:groupId', () => {
  it('200 — returns expenses for the given group', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    await seedExpense({ type: 'group', groupId: group._id, paidBy: payer._id });
    await seedExpense({ type: 'group', groupId: group._id, paidBy: member._id });

    const res = await request(app)
      .get(`/api/expenses/group/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('group expenses fetched');
    expect(res.body.expenses).toHaveLength(2);
  });

  it('200 — returns empty array when the group has no expenses', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .get(`/api/expenses/group/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.expenses).toEqual([]);
  });

  it('200 — does not return expenses belonging to a different group', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);
    const otherGroupId = new mongoose.Types.ObjectId();

    await seedExpense({ type: 'group', groupId: group._id, paidBy: payer._id });
    await seedExpense({ type: 'group', groupId: otherGroupId, paidBy: payer._id });

    const res = await request(app)
      .get(`/api/expenses/group/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.body.expenses).toHaveLength(1);
  });

  it('400 — invalid groupId format', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .get('/api/expenses/group/not-valid-id')
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('invalid group id');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/expenses/personal
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/expenses/personal', () => {
  it('200 — returns personal expenses for the authenticated user', async () => {
    const { payer, member } = await seedTwoUsers();

    await seedExpense({ type: 'personal', paidBy: payer._id });
    await seedExpense({ type: 'personal', paidBy: payer._id });
    await seedExpense({ type: 'personal', paidBy: member._id }); // different user

    const res = await request(app)
      .get('/api/expenses/personal')
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('personal expenses fetched');
    expect(res.body.expenses).toHaveLength(2);
  });

  it('200 — returns empty array when user has no personal expenses', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .get('/api/expenses/personal')
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.expenses).toEqual([]);
  });

  it('200 — excludes group expenses from the result', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    await seedExpense({ type: 'group', groupId: group._id, paidBy: payer._id });
    await seedExpense({ type: 'personal', paidBy: payer._id });

    const res = await request(app)
      .get('/api/expenses/personal')
      .set('Authorization', authHeader(payer._id));

    expect(res.body.expenses).toHaveLength(1);
    expect(res.body.expenses[0].type).toBe('personal');
  });

  it('200 — does not return personal expenses belonging to other users', async () => {
    const { payer, member } = await seedTwoUsers();

    await seedExpense({ type: 'personal', paidBy: member._id });

    const res = await request(app)
      .get('/api/expenses/personal')
      .set('Authorization', authHeader(payer._id));

    expect(res.body.expenses).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/expenses/:expenseId
// ══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/expenses/:expenseId', () => {
  it('200 — deletes an existing expense and removes it from the DB', async () => {
    const { payer } = await seedTwoUsers();
    const expense = await seedExpense({ type: 'personal', paidBy: payer._id });

    const res = await request(app)
      .delete(`/api/expenses/${expense._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('expense deleted');

    const found = await Expense.findById(expense._id);
    expect(found).toBeNull();
  });

  it('404 — expense does not exist', async () => {
    const { payer } = await seedTwoUsers();
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/expenses/${fakeId}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('expense not found');
  });

  it('400 — invalid expense id format', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .delete('/api/expenses/not-valid-id')
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('invalid expense id');
  });

  it('200 — does not remove other expenses when deleting one', async () => {
    const { payer } = await seedTwoUsers();
    const e1 = await seedExpense({ type: 'personal', paidBy: payer._id });
    const e2 = await seedExpense({ type: 'personal', paidBy: payer._id });

    await request(app)
      .delete(`/api/expenses/${e1._id}`)
      .set('Authorization', authHeader(payer._id));

    const remaining = await Expense.find({});
    expect(remaining).toHaveLength(1);
    expect(remaining[0]._id.toString()).toBe(e2._id.toString());
  });
});
