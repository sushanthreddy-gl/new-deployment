/**
 * Unit tests — analyticsService
 *
 * Uses MongoDB in-memory server so all aggregation pipelines run against a
 * real (but ephemeral) database.
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import * as analyticsService from '../../src/services/analyticsService.js';
import Expense from '../../src/models/Expense.js';
import Group from '../../src/models/Group.js';
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

const makeGroup = (creator, name = 'Test Group') =>
  Group.create({ name, members: [creator._id], createdBy: creator._id });

const makeExpense = (overrides = {}) =>
  Expense.create({
    amount: 100,
    type: 'personal',
    paidBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });

// ══════════════════════════════════════════════════════════════════════════════
// getPersonalMonthlySpending
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsService.getPersonalMonthlySpending', () => {
  it('returns an empty array when the user has no expenses', async () => {
    const user = await makeUser();
    const result = await analyticsService.getPersonalMonthlySpending(user._id);
    expect(result).toEqual([]);
  });

  it('groups personal expenses by year and month with correct totals', async () => {
    const user = await makeUser();
    await makeExpense({ amount: 40, type: 'personal', paidBy: user._id, date: new Date('2024-01-10') });
    await makeExpense({ amount: 60, type: 'personal', paidBy: user._id, date: new Date('2024-01-20') });
    await makeExpense({ amount: 30, type: 'personal', paidBy: user._id, date: new Date('2024-02-05') });

    const result = await analyticsService.getPersonalMonthlySpending(user._id);

    expect(result).toHaveLength(2);
    const jan = result.find((r) => r.month === 1);
    const feb = result.find((r) => r.month === 2);
    expect(jan).toBeDefined();
    expect(jan.total).toBe(100);
    expect(feb.total).toBe(30);
  });

  it('ignores group expenses paid by the same user', async () => {
    const user = await makeUser();
    const groupId = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 200, type: 'group', paidBy: user._id, groupId, date: new Date('2024-03-01') });
    await makeExpense({ amount: 20, type: 'personal', paidBy: user._id, date: new Date('2024-03-01') });

    const result = await analyticsService.getPersonalMonthlySpending(user._id);

    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(20);
  });

  it('does not include expenses paid by other users', async () => {
    const user = await makeUser('alice', 'alice@test.com');
    const other = await makeUser('bob', 'bob@test.com');
    await makeExpense({ amount: 100, type: 'personal', paidBy: other._id, date: new Date('2024-03-01') });

    const result = await analyticsService.getPersonalMonthlySpending(user._id);

    expect(result).toEqual([]);
  });

  it('returns entries sorted most recent first', async () => {
    const user = await makeUser();
    await makeExpense({ amount: 10, type: 'personal', paidBy: user._id, date: new Date('2023-06-01') });
    await makeExpense({ amount: 20, type: 'personal', paidBy: user._id, date: new Date('2024-03-01') });

    const result = await analyticsService.getPersonalMonthlySpending(user._id);

    expect(result[0].year).toBeGreaterThanOrEqual(result[1].year);
  });

  it('rounds totals to 2 decimal places', async () => {
    const user = await makeUser();
    await makeExpense({ amount: 10.005, type: 'personal', paidBy: user._id, date: new Date('2024-05-01') });

    const result = await analyticsService.getPersonalMonthlySpending(user._id);

    expect(result[0].total).toBe(Math.round(10.005 * 100) / 100);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getGroupSpendingByUser
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsService.getGroupSpendingByUser', () => {
  it('returns an empty array when the user has no group expenses', async () => {
    const user = await makeUser();
    const result = await analyticsService.getGroupSpendingByUser(user._id);
    expect(result).toEqual([]);
  });

  it('returns per-group totals with group name', async () => {
    const user = await makeUser();
    const group = await makeGroup(user, 'Weekend Trip');
    await makeExpense({ amount: 80, type: 'group', paidBy: user._id, groupId: group._id });
    await makeExpense({ amount: 120, type: 'group', paidBy: user._id, groupId: group._id });

    const result = await analyticsService.getGroupSpendingByUser(user._id);

    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe('Weekend Trip');
    expect(result[0].total).toBe(200);
  });

  it('uses "Unknown" as group name when the group no longer exists', async () => {
    const user = await makeUser();
    const orphanGroupId = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 50, type: 'group', paidBy: user._id, groupId: orphanGroupId });

    const result = await analyticsService.getGroupSpendingByUser(user._id);

    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe('Unknown');
  });

  it('excludes personal expenses', async () => {
    const user = await makeUser();
    await makeExpense({ amount: 200, type: 'personal', paidBy: user._id });

    const result = await analyticsService.getGroupSpendingByUser(user._id);

    expect(result).toEqual([]);
  });

  it('aggregates across multiple groups separately', async () => {
    const user = await makeUser();
    const group1 = await makeGroup(user, 'Group A');
    const group2 = await makeGroup(user, 'Group B');
    await makeExpense({ amount: 100, type: 'group', paidBy: user._id, groupId: group1._id });
    await makeExpense({ amount: 50, type: 'group', paidBy: user._id, groupId: group2._id });

    const result = await analyticsService.getGroupSpendingByUser(user._id);

    expect(result).toHaveLength(2);
    const totals = result.map((r) => r.total).sort((a, b) => b - a);
    expect(totals).toEqual([100, 50]);
  });

  it('does not include group expenses paid by other users', async () => {
    const alice = await makeUser('alice', 'a@test.com');
    const bob = await makeUser('bob', 'b@test.com');
    const group = await makeGroup(bob, 'Bobs Group');
    await makeExpense({ amount: 999, type: 'group', paidBy: bob._id, groupId: group._id });

    const result = await analyticsService.getGroupSpendingByUser(alice._id);

    expect(result).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getCategoryTotalsForGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsService.getCategoryTotalsForGroup', () => {
  it('returns an empty array when the group has no expenses', async () => {
    const groupId = new mongoose.Types.ObjectId();
    const result = await analyticsService.getCategoryTotalsForGroup(groupId);
    expect(result).toEqual([]);
  });

  it('returns category totals summed correctly', async () => {
    const groupId = new mongoose.Types.ObjectId();
    const payer = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 60, type: 'group', paidBy: payer, groupId, category: 'Food' });
    await makeExpense({ amount: 40, type: 'group', paidBy: payer, groupId, category: 'Food' });
    await makeExpense({ amount: 30, type: 'group', paidBy: payer, groupId, category: 'Transport' });

    const result = await analyticsService.getCategoryTotalsForGroup(groupId);

    expect(result).toHaveLength(2);
    const food = result.find((r) => r.category === 'Food');
    const transport = result.find((r) => r.category === 'Transport');
    expect(food.total).toBe(100);
    expect(transport.total).toBe(30);
  });

  it('assigns "Uncategorised" to expenses without a category', async () => {
    const groupId = new mongoose.Types.ObjectId();
    const payer = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 25, type: 'group', paidBy: payer, groupId });

    const result = await analyticsService.getCategoryTotalsForGroup(groupId);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Uncategorised');
  });

  it('only includes expenses belonging to the specified group', async () => {
    const groupA = new mongoose.Types.ObjectId();
    const groupB = new mongoose.Types.ObjectId();
    const payer = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 100, type: 'group', paidBy: payer, groupId: groupA, category: 'Food' });
    await makeExpense({ amount: 200, type: 'group', paidBy: payer, groupId: groupB, category: 'Travel' });

    const result = await analyticsService.getCategoryTotalsForGroup(groupA);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Food');
    expect(result[0].total).toBe(100);
  });

  it('returns results sorted by total descending', async () => {
    const groupId = new mongoose.Types.ObjectId();
    const payer = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 10, type: 'group', paidBy: payer, groupId, category: 'Small' });
    await makeExpense({ amount: 90, type: 'group', paidBy: payer, groupId, category: 'Large' });

    const result = await analyticsService.getCategoryTotalsForGroup(groupId);

    expect(result[0].total).toBeGreaterThanOrEqual(result[1].total);
  });

  it('rounds category totals to 2 decimal places', async () => {
    const groupId = new mongoose.Types.ObjectId();
    const payer = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 33.333, type: 'group', paidBy: payer, groupId, category: 'Misc' });

    const result = await analyticsService.getCategoryTotalsForGroup(groupId);

    expect(result[0].total).toBe(Math.round(33.333 * 100) / 100);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getCategoryTotalsForUser
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsService.getCategoryTotalsForUser', () => {
  it('returns an empty array when the user has no expenses', async () => {
    const user = await makeUser();
    const result = await analyticsService.getCategoryTotalsForUser(user._id);
    expect(result).toEqual([]);
  });

  it('aggregates all expense types by category', async () => {
    const user = await makeUser();
    const groupId = new mongoose.Types.ObjectId();
    await makeExpense({ amount: 50, type: 'personal', paidBy: user._id, category: 'Food' });
    await makeExpense({ amount: 30, type: 'group', paidBy: user._id, groupId, category: 'Food' });
    await makeExpense({ amount: 20, type: 'personal', paidBy: user._id, category: 'Transport' });

    const result = await analyticsService.getCategoryTotalsForUser(user._id);

    expect(result).toHaveLength(2);
    const food = result.find((r) => r.category === 'Food');
    expect(food.total).toBe(80);
  });

  it('assigns "Uncategorised" to expenses without a category', async () => {
    const user = await makeUser();
    await makeExpense({ amount: 100, type: 'personal', paidBy: user._id });

    const result = await analyticsService.getCategoryTotalsForUser(user._id);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Uncategorised');
  });

  it('only includes expenses paid by the specified user', async () => {
    const alice = await makeUser('alice', 'a@test.com');
    const bob = await makeUser('bob', 'b@test.com');
    await makeExpense({ amount: 50, type: 'personal', paidBy: bob._id, category: 'Food' });

    const result = await analyticsService.getCategoryTotalsForUser(alice._id);

    expect(result).toEqual([]);
  });

  it('returns results sorted by total descending', async () => {
    const user = await makeUser();
    await makeExpense({ amount: 10, type: 'personal', paidBy: user._id, category: 'Small' });
    await makeExpense({ amount: 200, type: 'personal', paidBy: user._id, category: 'Large' });

    const result = await analyticsService.getCategoryTotalsForUser(user._id);

    expect(result[0].total).toBeGreaterThanOrEqual(result[1].total);
  });

  it('rounds category totals to 2 decimal places', async () => {
    const user = await makeUser();
    await makeExpense({ amount: 10.005, type: 'personal', paidBy: user._id, category: 'Test' });

    const result = await analyticsService.getCategoryTotalsForUser(user._id);

    expect(result[0].total).toBe(Math.round(10.005 * 100) / 100);
  });
});
