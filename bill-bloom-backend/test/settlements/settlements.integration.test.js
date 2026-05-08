/**
 * Integration tests — settlements routes
 *
 * Tests the full route → controller → service → in-memory DB pipeline.
 * Covers:
 *   GET  /api/settlements/settleGroup/:groupId  — calculate minimal settlements
 *   POST /api/settlements                       — record a manual settlement
 *   GET  /api/settlements/group/:groupId        — list group settlements
 *
 * Run:  npm test
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import { createTestUser, authHeader, TEST_JWT_SECRET } from '../helpers/authHelper.js';
import settlementRoutes from '../../src/routes/settlements.js';
import errorHandler from '../../src/middleware/errorHandler.js';
import Group from '../../src/models/Group.js';
import Expense from '../../src/models/Expense.js';
import Settlement from '../../src/models/Settlement.js';

// ─── One-time setup ────────────────────────────────────────────────────────────

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  await connectTestDB();
  app = express();
  app.use(express.json());
  app.use('/api/settlements', settlementRoutes);
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

const seedGroup = (creator, ...extraMembers) =>
  Group.create({
    name: 'Test Group',
    members: [creator._id, ...extraMembers.map((m) => m._id)],
    createdBy: creator._id,
  });

const fakeId = () => new mongoose.Types.ObjectId().toString();

// ══════════════════════════════════════════════════════════════════════════════
// Auth guard
// ══════════════════════════════════════════════════════════════════════════════

describe('Settlements routes — auth guard', () => {
  it('401 — GET /settleGroup/:groupId without token', async () => {
    const res = await request(app).get(`/api/settlements/settleGroup/${fakeId()}`);
    expect(res.status).toBe(401);
  });

  it('401 — POST / without token', async () => {
    const res = await request(app).post('/api/settlements').send({});
    expect(res.status).toBe(401);
  });

  it('401 — GET /group/:groupId without token', async () => {
    const res = await request(app).get(`/api/settlements/group/${fakeId()}`);
    expect(res.status).toBe(401);
  });

  it('401 — rejects a malformed Bearer token', async () => {
    const res = await request(app)
      .get(`/api/settlements/group/${fakeId()}`)
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/settlements/settleGroup/:groupId
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/settlements/settleGroup/:groupId', () => {
  it('400 — invalid groupId format', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .get('/api/settlements/settleGroup/not-an-id')
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid group id/i);
  });

  it('404 — group does not exist', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .get(`/api/settlements/settleGroup/${fakeId()}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/group not found/i);
  });

  it('200 — returns empty settlements when no expenses exist', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .get(`/api/settlements/settleGroup/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('settlements calculated');
    expect(res.body.settlements).toEqual([]);
  });

  it('200 — calculates settlements when the group has unbalanced expenses', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    // payer covered 100 for both → member owes 50
    await Expense.create({
      amount: 100,
      type: 'group',
      groupId: group._id,
      paidBy: payer._id,
      participants: [payer._id, member._id],
    });

    const res = await request(app)
      .get(`/api/settlements/settleGroup/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.settlements).toHaveLength(1);
    expect(res.body.settlements[0].amount).toBe(50);
    expect(res.body.settlements[0].from).toBe(member._id.toString());
    expect(res.body.settlements[0].to).toBe(payer._id.toString());
  });

  it('200 — existing settlements reduce the outstanding balance', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    await Expense.create({
      amount: 100,
      type: 'group',
      groupId: group._id,
      paidBy: payer._id,
      participants: [payer._id, member._id],
    });

    // member already paid back the full 50
    await Settlement.create({
      fromUser: member._id,
      toUser: payer._id,
      amount: 50,
      groupId: group._id,
    });

    const res = await request(app)
      .get(`/api/settlements/settleGroup/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.settlements).toEqual([]);
  });

  it('200 — response includes the settlements calculated key', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .get(`/api/settlements/settleGroup/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('settlements');
    expect(Array.isArray(res.body.settlements)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/settlements
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/settlements — validation', () => {
  it('400 — missing fromId', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({ toId: member._id.toString(), amount: 50, groupId: group._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('400 — missing toId', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({ fromId: member._id.toString(), amount: 50, groupId: group._id.toString() });

    expect(res.status).toBe(400);
  });

  it('400 — missing amount', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({ fromId: member._id.toString(), toId: payer._id.toString(), groupId: group._id.toString() });

    expect(res.status).toBe(400);
  });

  it('400 — invalid fromId format', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({ fromId: 'bad-id', toId: payer._id.toString(), amount: 50, groupId: group._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid ids/i);
  });

  it('400 — fromId and toId are the same', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: payer._id.toString(),
        toId: payer._id.toString(),
        amount: 50,
        groupId: group._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot be the same/i);
  });

  it('400 — amount is zero', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: member._id.toString(),
        toId: payer._id.toString(),
        amount: 0,
        groupId: group._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/positive number/i);
  });

  it('400 — amount is negative', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: member._id.toString(),
        toId: payer._id.toString(),
        amount: -20,
        groupId: group._id.toString(),
      });

    expect(res.status).toBe(400);
  });

  it('400 — invalid groupId format', async () => {
    const { payer, member } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: member._id.toString(),
        toId: payer._id.toString(),
        amount: 50,
        groupId: 'bad-group-id',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid groupId/i);
  });
});

describe('POST /api/settlements — DB lookups', () => {
  it('404 — fromId user does not exist', async () => {
    const { payer } = await seedTwoUsers();
    const group = await Group.create({
      name: 'G',
      members: [payer._id, new mongoose.Types.ObjectId()],
      createdBy: payer._id,
    });

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: fakeId(),
        toId: payer._id.toString(),
        amount: 50,
        groupId: group._id.toString(),
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/fromId or toId not found/i);
  });

  it('404 — group does not exist', async () => {
    const { payer, member } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: member._id.toString(),
        toId: payer._id.toString(),
        amount: 50,
        groupId: fakeId(),
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/group not found/i);
  });

  it('400 — users are not members of the group', async () => {
    const { payer, member } = await seedTwoUsers();
    const outsider = await createTestUser({ username: 'outsider', email: 'outsider@example.com' });
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: outsider._id.toString(),
        toId: payer._id.toString(),
        amount: 50,
        groupId: group._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/members of the group/i);
  });

  it('201 — creates a settlement and returns it', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: member._id.toString(),
        toId: payer._id.toString(),
        amount: 75,
        groupId: group._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('settlement created');
    expect(res.body.settlement).toMatchObject({ amount: 75 });
    expect(res.body.settlement.fromUser.toString()).toBe(member._id.toString());
    expect(res.body.settlement.toUser.toString()).toBe(payer._id.toString());
  });

  it('201 — settlement is persisted in the database', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .post('/api/settlements')
      .set('Authorization', authHeader(payer._id))
      .send({
        fromId: member._id.toString(),
        toId: payer._id.toString(),
        amount: 30,
        groupId: group._id.toString(),
      });

    const inDB = await Settlement.findById(res.body.settlement._id);
    expect(inDB).not.toBeNull();
    expect(inDB.amount).toBe(30);
    expect(inDB.groupId.toString()).toBe(group._id.toString());
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/settlements/group/:groupId
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/settlements/group/:groupId', () => {
  it('400 — invalid groupId format', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .get('/api/settlements/group/not-an-id')
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid group id/i);
  });

  it('404 — group not found', async () => {
    const { payer } = await seedTwoUsers();

    const res = await request(app)
      .get(`/api/settlements/group/${fakeId()}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/group not found/i);
  });

  it('200 — returns empty array when no settlements exist for the group', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const res = await request(app)
      .get(`/api/settlements/group/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('group settlements fetched');
    expect(res.body.settlements).toEqual([]);
  });

  it('200 — returns settlements with populated fromUser and toUser', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    await Settlement.create({ fromUser: member._id, toUser: payer._id, amount: 60, groupId: group._id });

    const res = await request(app)
      .get(`/api/settlements/group/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.settlements).toHaveLength(1);
    expect(res.body.settlements[0].fromUser.username).toBe('member');
    expect(res.body.settlements[0].toUser.username).toBe('payer');
    expect(res.body.settlements[0].amount).toBe(60);
  });

  it('200 — does not expose user passwords in populated fields', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    await Settlement.create({ fromUser: member._id, toUser: payer._id, amount: 20, groupId: group._id });

    const res = await request(app)
      .get(`/api/settlements/group/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.body.settlements[0].fromUser.password).toBeUndefined();
    expect(res.body.settlements[0].toUser.password).toBeUndefined();
  });

  it('200 — returns only settlements for the specified group', async () => {
    const { payer, member } = await seedTwoUsers();
    const groupA = await seedGroup(payer, member);
    const groupB = await Group.create({
      name: 'Group B',
      members: [payer._id, member._id],
      createdBy: payer._id,
    });

    await Settlement.create({ fromUser: member._id, toUser: payer._id, amount: 10, groupId: groupA._id });
    await Settlement.create({ fromUser: member._id, toUser: payer._id, amount: 20, groupId: groupB._id });

    const res = await request(app)
      .get(`/api/settlements/group/${groupA._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.settlements).toHaveLength(1);
    expect(res.body.settlements[0].amount).toBe(10);
  });

  it('200 — returns settlements sorted newest first', async () => {
    const { payer, member } = await seedTwoUsers();
    const group = await seedGroup(payer, member);

    const now = Date.now();
    const older = await Settlement.create({ fromUser: member._id, toUser: payer._id, amount: 15, groupId: group._id, createdAt: new Date(now - 5000) });
    const newer = await Settlement.create({ fromUser: member._id, toUser: payer._id, amount: 35, groupId: group._id, createdAt: new Date(now) });

    const res = await request(app)
      .get(`/api/settlements/group/${group._id}`)
      .set('Authorization', authHeader(payer._id));

    expect(res.status).toBe(200);
    expect(res.body.settlements[0]._id).toBe(newer._id.toString());
    expect(res.body.settlements[1]._id).toBe(older._id.toString());
  });
});
