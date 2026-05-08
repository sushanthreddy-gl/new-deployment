/**
 * Unit tests — expensesService
 *
 * Uses MongoDB in-memory server so service logic (including Mongoose queries)
 * is exercised against a real (but ephemeral) database.
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import * as expenseService from '../../src/services/expensesService.js';
import Expense from '../../src/models/Expense.js';
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

const makeExpense = (overrides = {}) =>
  Expense.create({ amount: 100, type: 'personal', paidBy: new mongoose.Types.ObjectId(), ...overrides });

// ══════════════════════════════════════════════════════════════════════════════
// createExpense
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesService.createExpense', () => {
  it('creates and returns a personal expense with all required fields', async () => {
    const user = await makeUser('alice', 'alice@test.com');

    const expense = await expenseService.createExpense({
      amount: 50,
      type: 'personal',
      paidBy: user._id,
      description: 'Lunch',
      category: 'Food',
    });

    expect(expense._id).toBeDefined();
    expect(expense.amount).toBe(50);
    expect(expense.type).toBe('personal');
    expect(expense.paidBy.toString()).toBe(user._id.toString());
    expect(expense.description).toBe('Lunch');
    expect(expense.category).toBe('Food');
  });

  it('persists the expense to the database', async () => {
    const user = await makeUser('bob', 'bob@test.com');

    const created = await expenseService.createExpense({
      amount: 75,
      type: 'personal',
      paidBy: user._id,
    });

    const found = await Expense.findById(created._id);
    expect(found).not.toBeNull();
    expect(found.amount).toBe(75);
  });

  it('creates a group expense with participants and groupId', async () => {
    const payer = await makeUser('payer', 'payer@test.com');
    const member = await makeUser('mem', 'mem@test.com');
    const groupId = new mongoose.Types.ObjectId();

    const expense = await expenseService.createExpense({
      amount: 120,
      type: 'group',
      paidBy: payer._id,
      groupId,
      participants: [payer._id, member._id],
    });

    expect(expense.type).toBe('group');
    expect(expense.groupId.toString()).toBe(groupId.toString());
    expect(expense.participants).toHaveLength(2);
  });

  it('records the optional date field when provided', async () => {
    const user = await makeUser('dated', 'dated@test.com');
    const date = new Date('2025-06-15');

    const expense = await expenseService.createExpense({
      amount: 10,
      type: 'personal',
      paidBy: user._id,
      date,
    });

    expect(new Date(expense.date).toDateString()).toBe(date.toDateString());
  });

  it('throws a ValidationError when amount is missing', async () => {
    await expect(
      expenseService.createExpense({ type: 'personal', paidBy: new mongoose.Types.ObjectId() })
    ).rejects.toThrow();
  });

  it('throws a ValidationError when type is an invalid enum value', async () => {
    await expect(
      expenseService.createExpense({ amount: 10, type: 'invalid', paidBy: new mongoose.Types.ObjectId() })
    ).rejects.toThrow();
  });

  it('throws a ValidationError when required paidBy is missing', async () => {
    await expect(expenseService.createExpense({ amount: 10, type: 'personal' })).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getExpensesByGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesService.getExpensesByGroup', () => {
  it('returns all expenses belonging to the given group', async () => {
    const payer = await makeUser('pg1', 'pg1@test.com');
    const groupId = new mongoose.Types.ObjectId();

    await makeExpense({ type: 'group', groupId, paidBy: payer._id });
    await makeExpense({ type: 'group', groupId, paidBy: payer._id });
    // different group — must not appear
    await makeExpense({ type: 'group', groupId: new mongoose.Types.ObjectId(), paidBy: payer._id });

    const expenses = await expenseService.getExpensesByGroup(groupId);

    expect(expenses).toHaveLength(2);
    for (const e of expenses) {
      expect(e.groupId.toString()).toBe(groupId.toString());
    }
  });

  it('returns an empty array when the group has no expenses', async () => {
    const expenses = await expenseService.getExpensesByGroup(new mongoose.Types.ObjectId());
    expect(expenses).toEqual([]);
  });

  it('populates paidBy with username and email', async () => {
    const payer = await makeUser('payerPop', 'payerPop@test.com');
    const groupId = new mongoose.Types.ObjectId();
    await makeExpense({ type: 'group', groupId, paidBy: payer._id });

    const [expense] = await expenseService.getExpensesByGroup(groupId);

    expect(expense.paidBy.username).toBe('payerPop');
    expect(expense.paidBy.email).toBe('payerpop@test.com');
    expect(expense.paidBy.password).toBeUndefined();
  });

  it('populates participants with username and email', async () => {
    const payer = await makeUser('pp1', 'pp1@test.com');
    const participant = await makeUser('pp2', 'pp2@test.com');
    const groupId = new mongoose.Types.ObjectId();

    await makeExpense({
      type: 'group',
      groupId,
      paidBy: payer._id,
      participants: [payer._id, participant._id],
    });

    const [expense] = await expenseService.getExpensesByGroup(groupId);
    const usernames = expense.participants.map((p) => p.username);

    expect(usernames).toContain('pp1');
    expect(usernames).toContain('pp2');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getPersonalExpensesByUser
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesService.getPersonalExpensesByUser', () => {
  it('returns only personal expenses for the given user', async () => {
    const user = await makeUser('pu1', 'pu1@test.com');
    const other = await makeUser('pu2', 'pu2@test.com');

    await makeExpense({ type: 'personal', paidBy: user._id });
    await makeExpense({ type: 'personal', paidBy: user._id });
    await makeExpense({ type: 'personal', paidBy: other._id }); // different user

    const expenses = await expenseService.getPersonalExpensesByUser(user._id);

    expect(expenses).toHaveLength(2);
    for (const e of expenses) {
      expect(e.paidBy._id.toString()).toBe(user._id.toString());
    }
  });

  it('excludes group expenses for the same user', async () => {
    const user = await makeUser('pu3', 'pu3@test.com');

    await makeExpense({ type: 'group', paidBy: user._id, groupId: new mongoose.Types.ObjectId() });
    await makeExpense({ type: 'personal', paidBy: user._id });

    const expenses = await expenseService.getPersonalExpensesByUser(user._id);

    expect(expenses).toHaveLength(1);
    expect(expenses[0].type).toBe('personal');
  });

  it('returns an empty array when the user has no personal expenses', async () => {
    const user = await makeUser('pu4', 'pu4@test.com');
    const expenses = await expenseService.getPersonalExpensesByUser(user._id);
    expect(expenses).toEqual([]);
  });

  it('populates paidBy with username and email', async () => {
    const user = await makeUser('pu5', 'pu5@test.com');
    await makeExpense({ type: 'personal', paidBy: user._id });

    const [expense] = await expenseService.getPersonalExpensesByUser(user._id);

    expect(expense.paidBy.username).toBe('pu5');
    expect(expense.paidBy.email).toBe('pu5@test.com'); // already lowercase
    expect(expense.paidBy.password).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// deleteExpenseById
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesService.deleteExpenseById', () => {
  it('deletes the expense and returns the deleted document', async () => {
    const expense = await makeExpense();

    const deleted = await expenseService.deleteExpenseById(expense._id);

    expect(deleted._id.toString()).toBe(expense._id.toString());
    const found = await Expense.findById(expense._id);
    expect(found).toBeNull();
  });

  it('returns null when no expense with the given id exists', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const result = await expenseService.deleteExpenseById(fakeId);
    expect(result).toBeNull();
  });

  it('does not affect other expenses in the collection', async () => {
    const e1 = await makeExpense();
    const e2 = await makeExpense();

    await expenseService.deleteExpenseById(e1._id);

    const remaining = await Expense.find({});
    expect(remaining).toHaveLength(1);
    expect(remaining[0]._id.toString()).toBe(e2._id.toString());
  });
});
