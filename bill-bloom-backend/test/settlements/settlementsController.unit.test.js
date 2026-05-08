/**
 * Unit tests — settlementsController
 *
 * All external dependencies (settlementsService, User, Group, Expense models,
 * and settlementEngine) are mocked so tests focus purely on the controller's
 * validation and delegation logic.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── Mock external modules before importing the controller ────────────────────

vi.mock('../../src/services/settlementsService.js', () => ({
  createSettlement: vi.fn(),
  getSettlementsByGroup: vi.fn(),
}));

vi.mock('../../src/models/User.js', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('../../src/models/Group.js', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('../../src/models/Expense.js', () => ({
  default: { find: vi.fn() },
}));

vi.mock('../../src/utils/settlementEngine.js', () => ({
  settlementEngine: vi.fn(),
}));

import * as settlementsController from '../../src/controllers/settlementsController.js';
import * as settlementService from '../../src/services/settlementsService.js';
import User from '../../src/models/User.js';
import Group from '../../src/models/Group.js';
import Expense from '../../src/models/Expense.js';
import { settlementEngine } from '../../src/utils/settlementEngine.js';

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
// settleGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('settlementsController.settleGroup', () => {
  it('returns 400 for an invalid groupId', async () => {
    const req = makeReq({ params: { groupId: 'not-an-id' } });
    const res = makeRes();

    await settlementsController.settleGroup(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'invalid group id' })
    );
  });

  it('returns 404 when group is not found', async () => {
    Group.findById.mockResolvedValue(null);
    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();

    await settlementsController.settleGroup(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'group not found' })
    );
  });

  it('returns 200 with calculated settlements on success', async () => {
    const memberId1 = validId();
    const memberId2 = validId();
    const fakeGroup = { members: [memberId1, memberId2] };
    const fakeExpenses = [{ amount: 100, paidBy: memberId1, participants: [memberId1, memberId2] }];
    const fakeExisting = [];
    const fakeSettlements = [{ from: memberId2, to: memberId1, amount: 50 }];

    Group.findById.mockResolvedValue(fakeGroup);
    Expense.find.mockResolvedValue(fakeExpenses);
    settlementService.getSettlementsByGroup.mockResolvedValue(fakeExisting);
    settlementEngine.mockReturnValue(fakeSettlements);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();

    await settlementsController.settleGroup(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      message: 'settlements calculated',
      settlements: fakeSettlements,
    });
  });

  it('passes member IDs, expenses, and existing settlements to settlementEngine', async () => {
    const memberId = validId();
    const fakeGroup = { members: [memberId] };
    const fakeExpenses = [{ amount: 50 }];
    const fakeExisting = [{ amount: 20 }];

    Group.findById.mockResolvedValue(fakeGroup);
    Expense.find.mockResolvedValue(fakeExpenses);
    settlementService.getSettlementsByGroup.mockResolvedValue(fakeExisting);
    settlementEngine.mockReturnValue([]);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();

    await settlementsController.settleGroup(req, res, vi.fn());

    expect(settlementEngine).toHaveBeenCalledWith(
      [String(memberId)],
      fakeExpenses,
      fakeExisting
    );
  });

  it('calls next with error when DB throws', async () => {
    const dbError = new Error('DB failure');
    Group.findById.mockRejectedValue(dbError);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();
    const next = vi.fn();

    await settlementsController.settleGroup(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// create — input validation
// ══════════════════════════════════════════════════════════════════════════════

describe('settlementsController.create — input validation', () => {
  it('returns 400 when fromId is missing', async () => {
    const req = makeReq({ body: { toId: validId(), amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/fromId.*toId.*amount.*required/i) })
    );
  });

  it('returns 400 when toId is missing', async () => {
    const req = makeReq({ body: { fromId: validId(), amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when amount is null', async () => {
    const req = makeReq({ body: { fromId: validId(), toId: validId(), amount: null, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when fromId is not a valid ObjectId', async () => {
    const req = makeReq({ body: { fromId: 'bad-id', toId: validId(), amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/valid ids/i) })
    );
  });

  it('returns 400 when toId is not a valid ObjectId', async () => {
    const req = makeReq({ body: { fromId: validId(), toId: 'bad-id', amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when fromId and toId are the same', async () => {
    const id = validId();
    const req = makeReq({ body: { fromId: id, toId: id, amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/cannot be the same/i) })
    );
  });

  it('returns 400 when amount is NaN (non-numeric string)', async () => {
    const req = makeReq({
      body: { fromId: validId(), toId: validId(), amount: 'not-a-number', groupId: validId() },
    });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/positive number/i) })
    );
  });

  it('returns 400 when amount is zero', async () => {
    const req = makeReq({ body: { fromId: validId(), toId: validId(), amount: 0, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when amount is negative', async () => {
    const req = makeReq({ body: { fromId: validId(), toId: validId(), amount: -10, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when groupId is not a valid ObjectId', async () => {
    const req = makeReq({
      body: { fromId: validId(), toId: validId(), amount: 50, groupId: 'bad-group' },
    });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/invalid groupId/i) })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// create — DB lookups and business rules
// ══════════════════════════════════════════════════════════════════════════════

describe('settlementsController.create — DB lookups', () => {
  it('returns 404 when fromUser is not found in DB', async () => {
    User.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: validId() });
    Group.findById.mockResolvedValue({ members: [] });

    const req = makeReq({ body: { fromId: validId(), toId: validId(), amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/fromId or toId not found/i) })
    );
  });

  it('returns 404 when toUser is not found in DB', async () => {
    User.findById
      .mockResolvedValueOnce({ _id: validId() })
      .mockResolvedValueOnce(null);
    Group.findById.mockResolvedValue({ members: [] });

    const req = makeReq({ body: { fromId: validId(), toId: validId(), amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when group is not found in DB', async () => {
    User.findById.mockResolvedValue({ _id: validId() });
    Group.findById.mockResolvedValue(null);

    const req = makeReq({ body: { fromId: validId(), toId: validId(), amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'group not found' })
    );
  });

  it('returns 400 when users are not members of the group', async () => {
    const fromId = validId();
    const toId = validId();
    const outsider = validId();

    User.findById
      .mockResolvedValueOnce({ _id: fromId })
      .mockResolvedValueOnce({ _id: toId });
    Group.findById.mockResolvedValue({ members: [outsider] });

    const req = makeReq({ body: { fromId, toId, amount: 50, groupId: validId() } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/members of the group/i) })
    );
  });

  it('returns 201 with created settlement when all inputs are valid', async () => {
    const fromId = validId();
    const toId = validId();
    const groupId = validId();
    const fakeSettlement = { _id: validId(), fromUser: fromId, toUser: toId, amount: 50 };

    User.findById
      .mockResolvedValueOnce({ _id: fromId })
      .mockResolvedValueOnce({ _id: toId });
    Group.findById.mockResolvedValue({ members: [fromId, toId] });
    settlementService.createSettlement.mockResolvedValue(fakeSettlement);

    const req = makeReq({ body: { fromId, toId, amount: 50, groupId } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'settlement created',
      settlement: fakeSettlement,
    });
  });

  it('calls createSettlement with the correct payload', async () => {
    const fromId = validId();
    const toId = validId();
    const groupId = validId();

    User.findById
      .mockResolvedValueOnce({ _id: fromId })
      .mockResolvedValueOnce({ _id: toId });
    Group.findById.mockResolvedValue({ members: [fromId, toId] });
    settlementService.createSettlement.mockResolvedValue({ _id: validId() });

    const req = makeReq({ body: { fromId, toId, amount: '75', groupId } });
    const res = makeRes();

    await settlementsController.create(req, res, vi.fn());

    expect(settlementService.createSettlement).toHaveBeenCalledWith({
      fromUser: fromId,
      toUser: toId,
      amount: 75,
      groupId,
    });
  });

  it('calls next with error when service throws', async () => {
    const fromId = validId();
    const toId = validId();
    const groupId = validId();
    const dbError = new Error('DB failure');

    User.findById
      .mockResolvedValueOnce({ _id: fromId })
      .mockResolvedValueOnce({ _id: toId });
    Group.findById.mockResolvedValue({ members: [fromId, toId] });
    settlementService.createSettlement.mockRejectedValue(dbError);

    const req = makeReq({ body: { fromId, toId, amount: 50, groupId } });
    const res = makeRes();
    const next = vi.fn();

    await settlementsController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// listByGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('settlementsController.listByGroup', () => {
  it('returns 400 for an invalid groupId', async () => {
    const req = makeReq({ params: { groupId: 'not-valid' } });
    const res = makeRes();

    await settlementsController.listByGroup(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'invalid group id' })
    );
  });

  it('returns 404 when group is not found', async () => {
    Group.findById.mockResolvedValue(null);
    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();

    await settlementsController.listByGroup(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'group not found' })
    );
  });

  it('returns 200 with settlements list on success', async () => {
    const fakeSettlements = [{ _id: validId(), amount: 30 }];
    Group.findById.mockResolvedValue({ _id: validId() });
    settlementService.getSettlementsByGroup.mockResolvedValue(fakeSettlements);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();

    await settlementsController.listByGroup(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      message: 'group settlements fetched',
      settlements: fakeSettlements,
    });
  });

  it('returns 200 with an empty array when no settlements exist', async () => {
    Group.findById.mockResolvedValue({ _id: validId() });
    settlementService.getSettlementsByGroup.mockResolvedValue([]);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();

    await settlementsController.listByGroup(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      message: 'group settlements fetched',
      settlements: [],
    });
  });

  it('calls next with error when DB throws', async () => {
    const dbError = new Error('DB failure');
    Group.findById.mockRejectedValue(dbError);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();
    const next = vi.fn();

    await settlementsController.listByGroup(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});
