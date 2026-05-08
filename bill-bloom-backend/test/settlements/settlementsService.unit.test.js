/**
 * Unit tests — settlementsService
 *
 * Uses MongoDB in-memory server so service logic (including Mongoose queries
 * and populate chains) is exercised against a real but ephemeral database.
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import * as settlementService from '../../src/services/settlementsService.js';
import Settlement from '../../src/models/Settlement.js';
import User from '../../src/models/User.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = async (username = 'user', email = `${username}@test.com`) => {
  const hashed = await bcrypt.hash('pass', 10);
  return User.create({ username, email, password: hashed });
};

// ══════════════════════════════════════════════════════════════════════════════
// createSettlement
// ══════════════════════════════════════════════════════════════════════════════

describe('settlementsService.createSettlement', () => {
  it('creates and returns a settlement document with all fields', async () => {
    const [from, to] = await Promise.all([
      makeUser('alice', 'alice@test.com'),
      makeUser('bob', 'bob@test.com'),
    ]);
    const groupId = new mongoose.Types.ObjectId();

    const settlement = await settlementService.createSettlement({
      fromUser: from._id,
      toUser: to._id,
      amount: 50,
      groupId,
    });

    expect(settlement._id).toBeDefined();
    expect(settlement.fromUser.toString()).toBe(from._id.toString());
    expect(settlement.toUser.toString()).toBe(to._id.toString());
    expect(settlement.amount).toBe(50);
    expect(settlement.groupId.toString()).toBe(groupId.toString());
  });

  it('persists the settlement to the database', async () => {
    const [from, to] = await Promise.all([
      makeUser('carol', 'carol@test.com'),
      makeUser('dave', 'dave@test.com'),
    ]);
    const groupId = new mongoose.Types.ObjectId();

    const created = await settlementService.createSettlement({
      fromUser: from._id,
      toUser: to._id,
      amount: 25,
      groupId,
    });

    const found = await Settlement.findById(created._id);
    expect(found).not.toBeNull();
    expect(found.amount).toBe(25);
  });

  it('rejects when fromUser is missing', async () => {
    const to = await makeUser('eve', 'eve@test.com');

    await expect(
      settlementService.createSettlement({
        toUser: to._id,
        amount: 10,
        groupId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  it('rejects when toUser is missing', async () => {
    const from = await makeUser('frank', 'frank@test.com');

    await expect(
      settlementService.createSettlement({
        fromUser: from._id,
        amount: 10,
        groupId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  it('rejects when amount is below the minimum (0)', async () => {
    const [from, to] = await Promise.all([
      makeUser('grace', 'grace@test.com'),
      makeUser('henry', 'henry@test.com'),
    ]);

    await expect(
      settlementService.createSettlement({
        fromUser: from._id,
        toUser: to._id,
        amount: 0,
        groupId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getSettlementsByGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('settlementsService.getSettlementsByGroup', () => {
  it('returns an empty array when no settlements exist for the group', async () => {
    const groupId = new mongoose.Types.ObjectId();
    const results = await settlementService.getSettlementsByGroup(groupId);
    expect(results).toEqual([]);
  });

  it('returns populated settlements for the given group', async () => {
    const [from, to] = await Promise.all([
      makeUser('iris', 'iris@test.com'),
      makeUser('jack', 'jack@test.com'),
    ]);
    const groupId = new mongoose.Types.ObjectId();

    await settlementService.createSettlement({
      fromUser: from._id,
      toUser: to._id,
      amount: 40,
      groupId,
    });

    const results = await settlementService.getSettlementsByGroup(groupId);

    expect(results).toHaveLength(1);
    expect(results[0].fromUser.username).toBe('iris');
    expect(results[0].toUser.username).toBe('jack');
    expect(results[0].amount).toBe(40);
  });

  it('returns only settlements belonging to the specified group', async () => {
    const [from, to] = await Promise.all([
      makeUser('kate', 'kate@test.com'),
      makeUser('leo', 'leo@test.com'),
    ]);
    const groupA = new mongoose.Types.ObjectId();
    const groupB = new mongoose.Types.ObjectId();

    await settlementService.createSettlement({ fromUser: from._id, toUser: to._id, amount: 10, groupId: groupA });
    await settlementService.createSettlement({ fromUser: from._id, toUser: to._id, amount: 20, groupId: groupB });

    const results = await settlementService.getSettlementsByGroup(groupA);

    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(10);
  });

  it('returns settlements sorted by createdAt descending (newest first)', async () => {
    const [from, to] = await Promise.all([
      makeUser('mia', 'mia@test.com'),
      makeUser('ned', 'ned@test.com'),
    ]);
    const groupId = new mongoose.Types.ObjectId();
    const now = Date.now();

    const older = await settlementService.createSettlement({ fromUser: from._id, toUser: to._id, amount: 15, groupId, createdAt: new Date(now - 5000) });
    const newer = await settlementService.createSettlement({ fromUser: from._id, toUser: to._id, amount: 30, groupId, createdAt: new Date(now) });

    const results = await settlementService.getSettlementsByGroup(groupId);

    expect(results[0]._id.toString()).toBe(newer._id.toString());
    expect(results[1]._id.toString()).toBe(older._id.toString());
  });

  it('populates only username and email fields on fromUser and toUser', async () => {
    const [from, to] = await Promise.all([
      makeUser('olivia', 'olivia@test.com'),
      makeUser('peter', 'peter@test.com'),
    ]);
    const groupId = new mongoose.Types.ObjectId();

    await settlementService.createSettlement({ fromUser: from._id, toUser: to._id, amount: 22, groupId });

    const [settlement] = await settlementService.getSettlementsByGroup(groupId);

    expect(settlement.fromUser.username).toBe('olivia');
    expect(settlement.fromUser.email).toBe('olivia@test.com');
    expect(settlement.fromUser.password).toBeUndefined();
    expect(settlement.toUser.username).toBe('peter');
    expect(settlement.toUser.email).toBe('peter@test.com');
  });
});
