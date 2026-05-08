/**
 * Integration tests — POST /api/groups
 * Tests the full route → controller → service → in-memory DB pipeline.
 *
 * Run:  npm test
 * Deps: supertest, mongodb-memory-server  (npm i -D supertest mongodb-memory-server)
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import { createTestUser, authHeader, TEST_JWT_SECRET } from '../helpers/authHelper.js';
import { createTestApp } from '../helpers/testApp.js';
import Group from '../../src/models/Group.js';

// ─── One-time setup ────────────────────────────────────────────────────────────

let app;

beforeAll(async () => {
  // Must be set before the auth middleware reads it at runtime
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  await connectTestDB();
  app = createTestApp();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates two distinct users in the DB and returns them together with
 * ready-to-use Authorization header values.
 */
const seedTwoUsers = async () => {
  const creator = await createTestUser({ username: 'creator', email: 'creator@example.com' });
  const member = await createTestUser({ username: 'member', email: 'member@example.com' });
  return { creator, member };
};

/**
 * Creates a group owned by `creator` with `creator` + `member` as members.
 */
const seedGroup = async (creator, member, name = 'Trip Group') => {
  return Group.create({
    name,
    members: [creator._id, member._id],
    createdBy: creator._id,
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/groups — Create group
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/groups', () => {
  it('201 — creates a group with valid name and memberIds', async () => {
    const { creator, member } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'Trip Group', memberIds: [creator._id.toString(), member._id.toString()] });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('group created');
    expect(res.body.group).toMatchObject({ name: 'Trip Group' });
    expect(res.body.group.members).toHaveLength(2);
  });

  it('400 — missing name', async () => {
    const { creator, member } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', authHeader(creator._id))
      .send({ memberIds: [creator._id.toString(), member._id.toString()] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name.*memberIds.*required/i);
  });

  it('400 — missing memberIds', async () => {
    const { creator } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'No Members' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('400 — memberIds is not an array', async () => {
    const { creator, member } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'Bad Members', memberIds: member._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/array/i);
  });

  it('400 — memberIds array has fewer than 2 elements', async () => {
    const { creator } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'Solo Group', memberIds: [creator._id.toString()] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 2 members/i);
  });

  it('401 — no auth token', async () => {
    const { creator, member } = await seedTwoUsers();

    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Trip', memberIds: [creator._id.toString(), member._id.toString()] });

    expect(res.status).toBe(401);
  });

  it('401 — malformed token', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ name: 'Trip', memberIds: ['id1', 'id2'] });

    expect(res.status).toBe(401);
  });

  it('500 / error — one or more memberIds do not exist in DB', async () => {
    const { creator } = await seedTwoUsers();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'Ghost Members', memberIds: [creator._id.toString(), fakeId.toString()] });

    // Service throws; error handler forwards it as 500
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.message).toMatch(/do not exist|invalid/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/groups — List all groups
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/groups', () => {
  it('200 — returns empty array when no groups exist', async () => {
    const { creator } = await seedTwoUsers();

    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('all groups fetched');
    expect(res.body.groups).toEqual([]);
  });

  it('200 — returns all groups with populated members', async () => {
    const { creator, member } = await seedTwoUsers();
    await seedGroup(creator, member);

    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].name).toBe('Trip Group');
    expect(res.body.groups[0].members[0]).toHaveProperty('email');
  });

  it('401 — no auth token', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/groups/:id — Group details
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/groups/:id', () => {
  it('200 — returns group details with populated members and expenses', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .get(`/api/groups/${group._id}`)
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('group details fetched');
    expect(res.body.group._id).toBe(group._id.toString());
    expect(res.body.expenses).toBeInstanceOf(Array);
  });

  it('400 — invalid ObjectId format', async () => {
    const { creator } = await seedTwoUsers();

    const res = await request(app)
      .get('/api/groups/not-a-valid-id')
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid group id/i);
  });

  it('404 — group does not exist', async () => {
    const { creator } = await seedTwoUsers();
    const nonExistentId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/groups/${nonExistentId}`)
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/group not found/i);
  });

  it('401 — no auth token', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app).get(`/api/groups/${group._id}`);
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/groups/:id — Update group (creator only)
// ══════════════════════════════════════════════════════════════════════════════

describe('PUT /api/groups/:id', () => {
  it('200 — creator can update the group name', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .put(`/api/groups/${group._id}`)
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('group updated');
    expect(res.body.group.name).toBe('Updated Name');
  });

  it('200 — creator can add new members', async () => {
    const { creator, member } = await seedTwoUsers();
    const newMember = await createTestUser({ username: 'newguy', email: 'newguy@example.com' });
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .put(`/api/groups/${group._id}`)
      .set('Authorization', authHeader(creator._id))
      .send({ addMemberIds: [newMember._id.toString()] });

    expect(res.status).toBe(200);
    const memberIds = res.body.group.members.map((m) => m._id);
    expect(memberIds).toContain(newMember._id.toString());
  });

  it('400 — nothing to update (empty payload)', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .put(`/api/groups/${group._id}`)
      .set('Authorization', authHeader(creator._id))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/nothing to update/i);
  });

  it('400 — invalid ObjectId', async () => {
    const { creator } = await seedTwoUsers();

    const res = await request(app)
      .put('/api/groups/bad-id')
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'Whatever' });

    expect(res.status).toBe(400);
    // isGroupCreator middleware fires before controller; Mongoose CastError
    // is formatted by the error handler as "Invalid _id: <value>"
    expect(res.body.message).toMatch(/invalid.*id/i);
  });

  it('403 — non-creator cannot update the group', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .put(`/api/groups/${group._id}`)
      .set('Authorization', authHeader(member._id))   // member, not creator
      .send({ name: 'Hijacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only the group creator/i);
  });

  it('404 — group not found (valid but non-existent id)', async () => {
    const { creator } = await seedTwoUsers();
    const nonExistentId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/api/groups/${nonExistentId}`)
      .set('Authorization', authHeader(creator._id))
      .send({ name: 'Ghost' });

    // isGroupCreator middleware returns 404 first
    expect(res.status).toBe(404);
  });

  it('401 — no auth token', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .put(`/api/groups/${group._id}`)
      .send({ name: 'New' });
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/groups/:id — Delete group (creator only)
// ══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/groups/:id', () => {
  it('200 — creator can delete their group', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .delete(`/api/groups/${group._id}`)
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('group deleted');

    // Verify DB removal
    const stillExists = await Group.findById(group._id);
    expect(stillExists).toBeNull();
  });

  it('403 — non-creator cannot delete the group', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app)
      .delete(`/api/groups/${group._id}`)
      .set('Authorization', authHeader(member._id));

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only the group creator/i);
  });

  it('400 — invalid ObjectId', async () => {
    const { creator } = await seedTwoUsers();

    const res = await request(app)
      .delete('/api/groups/not-valid')
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(400);
    // isGroupCreator middleware fires before controller; Mongoose CastError
    // is formatted by the error handler as "Invalid _id: <value>"
    expect(res.body.message).toMatch(/invalid.*id/i);
  });

  it('404 — group not found (valid but non-existent id)', async () => {
    const { creator } = await seedTwoUsers();
    const nonExistentId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/groups/${nonExistentId}`)
      .set('Authorization', authHeader(creator._id));

    expect(res.status).toBe(404);
  });

  it('401 — no auth token', async () => {
    const { creator, member } = await seedTwoUsers();
    const group = await seedGroup(creator, member);

    const res = await request(app).delete(`/api/groups/${group._id}`);
    expect(res.status).toBe(401);
  });
});
