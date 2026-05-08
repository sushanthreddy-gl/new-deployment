/**
 * Unit tests — expensesController
 *
 * All external dependencies (expensesService, Group, User models) are mocked
 * so tests focus purely on the controller's validation and delegation logic.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── Mock external modules before importing the controller ────────────────────

vi.mock('../../src/services/expensesService.js', () => ({
  createExpense: vi.fn(),
  getExpensesByGroup: vi.fn(),
  getPersonalExpensesByUser: vi.fn(),
  deleteExpenseById: vi.fn(),
}));

vi.mock('../../src/models/Group.js', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('../../src/models/User.js', () => ({
  default: { findById: vi.fn() },
}));

import * as expenseController from '../../src/controllers/expensesController.js';
import * as expenseService from '../../src/services/expensesService.js';
import Group from '../../src/models/Group.js';
import User from '../../src/models/User.js';

// ─── Test utilities ───────────────────────────────────────────────────────────

const validId = () => new mongoose.Types.ObjectId().toString();

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { _id: new mongoose.Types.ObjectId() },
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// create — amount validation
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.create — amount validation', () => {
  it('returns 400 if amount is missing', async () => {
    const req = makeReq({ body: { type: 'personal', paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/amount/i) })
    );
  });

  it('returns 400 if amount is zero', async () => {
    const req = makeReq({ body: { amount: 0, type: 'personal', paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if amount is negative', async () => {
    const req = makeReq({ body: { amount: -10, type: 'personal', paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if amount is a string instead of a number', async () => {
    const req = makeReq({ body: { amount: '50', type: 'personal', paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if amount is NaN', async () => {
    const req = makeReq({ body: { amount: NaN, type: 'personal', paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// create — type validation
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.create — type validation', () => {
  it('returns 400 if type is missing', async () => {
    const req = makeReq({ body: { amount: 50, paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/type/i) })
    );
  });

  it('returns 400 if type is an unrecognised value', async () => {
    const req = makeReq({ body: { amount: 50, type: 'unknown', paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/"group" or "personal"/i) })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// create — paidBy validation
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.create — paidBy validation', () => {
  it('returns 400 if paidBy is missing', async () => {
    const req = makeReq({ body: { amount: 50, type: 'personal' } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/paidBy is required/i) })
    );
  });

  it('returns 400 if paidBy is not a valid ObjectId', async () => {
    const req = makeReq({ body: { amount: 50, type: 'personal', paidBy: 'not-an-id' } });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if paidBy user does not exist in the DB', async () => {
    User.findById.mockResolvedValue(null);

    const req = makeReq({ body: { amount: 50, type: 'personal', paidBy: validId() } });
    const res = makeRes();
    await expenseController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/paidBy user does not exist/i) })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// create — group expense validation
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.create — group expense', () => {
  let payerId, groupId, member1Id, member2Id, fakeGroup;

  beforeEach(() => {
    payerId = validId();
    groupId = validId();
    member1Id = validId();
    member2Id = validId();
    fakeGroup = {
      _id: groupId,
      members: [
        new mongoose.Types.ObjectId(payerId),
        new mongoose.Types.ObjectId(member1Id),
        new mongoose.Types.ObjectId(member2Id),
      ],
    };
    User.findById.mockResolvedValue({ _id: payerId });
    Group.findById.mockResolvedValue(fakeGroup);
  });

  it('returns 400 if groupId is missing', async () => {
    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, participants: [payerId, member1Id] },
    });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/groupId.*required/i) })
    );
  });

  it('returns 400 if groupId is an invalid ObjectId', async () => {
    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, groupId: 'bad-id', participants: [payerId, member1Id] },
    });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 if the group does not exist', async () => {
    Group.findById.mockResolvedValue(null);

    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, groupId, participants: [payerId, member1Id] },
    });
    const res = makeRes();
    await expenseController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'group not found' }));
  });

  it('returns 400 if participants is not an array', async () => {
    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, groupId, participants: payerId },
    });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/participants array/i) })
    );
  });

  it('returns 400 if participants has fewer than 2 entries', async () => {
    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, groupId, participants: [payerId] },
    });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/2 or more/i) })
    );
  });

  it('returns 400 if a participant id is not a valid ObjectId', async () => {
    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, groupId, participants: [payerId, 'bad-id'] },
    });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/invalid participant id/i) })
    );
  });

  it('returns 400 if a participant is not a member of the group', async () => {
    const outsiderId = validId();
    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, groupId, participants: [payerId, outsiderId] },
    });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/not a member of the group/i) })
    );
  });

  it('returns 400 if paidBy is not a member of the group', async () => {
    const outsiderPayerId = validId();
    User.findById.mockResolvedValue({ _id: outsiderPayerId });

    const req = makeReq({
      body: {
        amount: 50,
        type: 'group',
        paidBy: outsiderPayerId,
        groupId,
        participants: [member1Id, member2Id],
      },
    });
    const res = makeRes();
    await expenseController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/paidBy must be a member/i) })
    );
  });

  it('returns 201 with the created expense on success', async () => {
    const fakeExpense = { _id: validId(), amount: 50, type: 'group' };
    expenseService.createExpense.mockResolvedValue(fakeExpense);

    const req = makeReq({
      body: {
        amount: 50,
        type: 'group',
        paidBy: payerId,
        groupId,
        participants: [payerId, member1Id],
        description: 'Dinner',
        category: 'Food',
      },
    });
    const res = makeRes();
    await expenseController.create(req, res);

    expect(expenseService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, type: 'group', groupId, paidBy: payerId })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'expense created', expense: fakeExpense });
  });

  it('returns 500 if the service throws', async () => {
    expenseService.createExpense.mockRejectedValue(new Error('DB error'));

    const req = makeReq({
      body: { amount: 50, type: 'group', paidBy: payerId, groupId, participants: [payerId, member1Id] },
    });
    const res = makeRes();
    await expenseController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'server error' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// create — personal expense
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.create — personal expense', () => {
  it('returns 201 with the created expense on success', async () => {
    const payerId = validId();
    const fakeExpense = { _id: validId(), amount: 30, type: 'personal' };
    User.findById.mockResolvedValue({ _id: payerId });
    expenseService.createExpense.mockResolvedValue(fakeExpense);

    const req = makeReq({
      body: { amount: 30, type: 'personal', paidBy: payerId, description: 'Coffee', category: 'Food' },
    });
    const res = makeRes();
    await expenseController.create(req, res);

    expect(expenseService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 30, type: 'personal', paidBy: payerId })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'expense created', expense: fakeExpense });
  });

  it('does not include groupId or participants in the service call', async () => {
    const payerId = validId();
    User.findById.mockResolvedValue({ _id: payerId });
    expenseService.createExpense.mockResolvedValue({});

    const req = makeReq({ body: { amount: 30, type: 'personal', paidBy: payerId } });
    const res = makeRes();
    await expenseController.create(req, res);

    const callArg = expenseService.createExpense.mock.calls[0][0];
    expect(callArg.groupId).toBeUndefined();
    expect(callArg.participants).toBeUndefined();
  });

  it('returns 500 if the service throws', async () => {
    const payerId = validId();
    User.findById.mockResolvedValue({ _id: payerId });
    expenseService.createExpense.mockRejectedValue(new Error('DB error'));

    const req = makeReq({ body: { amount: 30, type: 'personal', paidBy: payerId } });
    const res = makeRes();
    await expenseController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'server error' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// listByGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.listByGroup', () => {
  it('returns 400 for an invalid groupId', async () => {
    const req = makeReq({ params: { groupId: 'not-valid' } });
    const res = makeRes();
    await expenseController.listByGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'invalid group id' }));
  });

  it('returns 200 with expenses on success', async () => {
    const expenses = [{ _id: validId(), amount: 100 }];
    expenseService.getExpensesByGroup.mockResolvedValue(expenses);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();
    await expenseController.listByGroup(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'group expenses fetched', expenses });
  });

  it('returns 200 with an empty array when the group has no expenses', async () => {
    expenseService.getExpensesByGroup.mockResolvedValue([]);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();
    await expenseController.listByGroup(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'group expenses fetched', expenses: [] });
  });

  it('returns 500 if the service throws', async () => {
    expenseService.getExpensesByGroup.mockRejectedValue(new Error('DB error'));

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();
    await expenseController.listByGroup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'server error' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// listPersonal
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.listPersonal', () => {
  it('returns 200 with personal expenses for the authenticated user', async () => {
    const expenses = [{ _id: validId(), amount: 20, type: 'personal' }];
    expenseService.getPersonalExpensesByUser.mockResolvedValue(expenses);

    const userId = new mongoose.Types.ObjectId();
    const req = makeReq({ user: { _id: userId } });
    const res = makeRes();
    await expenseController.listPersonal(req, res);

    expect(expenseService.getPersonalExpensesByUser).toHaveBeenCalledWith(userId);
    expect(res.json).toHaveBeenCalledWith({ message: 'personal expenses fetched', expenses });
  });

  it('returns 200 with an empty array when the user has no personal expenses', async () => {
    expenseService.getPersonalExpensesByUser.mockResolvedValue([]);

    const req = makeReq({ user: { _id: new mongoose.Types.ObjectId() } });
    const res = makeRes();
    await expenseController.listPersonal(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'personal expenses fetched', expenses: [] });
  });

  it('returns 500 if the service throws', async () => {
    expenseService.getPersonalExpensesByUser.mockRejectedValue(new Error('DB error'));

    const req = makeReq({ user: { _id: new mongoose.Types.ObjectId() } });
    const res = makeRes();
    await expenseController.listPersonal(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'server error' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// remove
// ══════════════════════════════════════════════════════════════════════════════

describe('expensesController.remove', () => {
  it('returns 400 for an invalid expenseId', async () => {
    const req = makeReq({ params: { expenseId: 'not-valid' } });
    const res = makeRes();
    await expenseController.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'invalid expense id' }));
  });

  it('returns 404 when the expense does not exist', async () => {
    expenseService.deleteExpenseById.mockResolvedValue(null);

    const req = makeReq({ params: { expenseId: validId() } });
    const res = makeRes();
    await expenseController.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'expense not found' }));
  });

  it('returns 200 with deleted message on success', async () => {
    expenseService.deleteExpenseById.mockResolvedValue({ _id: validId() });

    const req = makeReq({ params: { expenseId: validId() } });
    const res = makeRes();
    await expenseController.remove(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'expense deleted' });
  });

  it('returns 500 if the service throws', async () => {
    expenseService.deleteExpenseById.mockRejectedValue(new Error('DB error'));

    const req = makeReq({ params: { expenseId: validId() } });
    const res = makeRes();
    await expenseController.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'server error' });
  });
});
