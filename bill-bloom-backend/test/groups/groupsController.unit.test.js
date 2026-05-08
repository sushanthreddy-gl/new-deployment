/**
 * Unit tests — groupsController
 *
 * All external dependencies (groupsService, Expense model) are mocked so
 * tests focus purely on the controller's validation and delegation logic.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── Mock external modules before importing the controller ────────────────────

vi.mock('../../src/services/groupsService.js', () => ({
  createGroup: vi.fn(),
  getAllGroups: vi.fn(),
  getGroupById: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
}));

vi.mock('../../src/models/Expense.js', () => ({
  default: { find: vi.fn() },
}));

import * as groupController from '../../src/controllers/groupsController.js';
import * as groupService from '../../src/services/groupsService.js';
import Expense from '../../src/models/Expense.js';

// ─── Test utilities ───────────────────────────────────────────────────────────

const validId = () => new mongoose.Types.ObjectId().toString();

/**
 * Creates a minimal Express-like req object.
 */
const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { _id: new mongoose.Types.ObjectId() },
  ...overrides,
});

/**
 * Creates a chainable res mock that records status and json calls.
 */
const makeRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

/**
 * Builds a mock Expense query chain that resolves to `data`.
 */
const mockExpenseChain = (data = []) => {
  const populate2 = vi.fn().mockResolvedValue(data);
  const populate1 = vi.fn().mockReturnValue({ populate: populate2 });
  const select = vi.fn().mockReturnValue({ populate: populate1 });
  Expense.find.mockReturnValue({ select });
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// create
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsController.create', () => {
  it('returns 400 when name is missing', async () => {
    const req = makeReq({ body: { memberIds: [validId(), validId()] } });
    const res = makeRes();
    await groupController.create(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/required/i) }));
  });

  it('returns 400 when memberIds is missing', async () => {
    const req = makeReq({ body: { name: 'Trip' } });
    const res = makeRes();
    await groupController.create(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when memberIds is not an array', async () => {
    const req = makeReq({ body: { name: 'Trip', memberIds: 'not-an-array' } });
    const res = makeRes();
    await groupController.create(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/array/i) }));
  });

  it('returns 400 when memberIds has fewer than 2 elements', async () => {
    const req = makeReq({ body: { name: 'Solo', memberIds: [validId()] } });
    const res = makeRes();
    await groupController.create(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/at least 2/i) }));
  });

  it('returns 201 and group when service succeeds', async () => {
    const fakeGroup = { _id: validId(), name: 'Trip', members: [] };
    groupService.createGroup.mockResolvedValue(fakeGroup);

    const userId = new mongoose.Types.ObjectId();
    const req = makeReq({
      body: { name: 'Trip', memberIds: [validId(), validId()] },
      user: { _id: userId },
    });
    const res = makeRes();
    await groupController.create(req, res, vi.fn());

    expect(groupService.createGroup).toHaveBeenCalledWith({
      name: 'Trip',
      memberIds: expect.any(Array),
      createdBy: userId,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'group created', group: fakeGroup });
  });

  it('calls next(err) when service throws', async () => {
    const error = new Error('DB error');
    groupService.createGroup.mockRejectedValue(error);

    const req = makeReq({ body: { name: 'Trip', memberIds: [validId(), validId()] } });
    const res = makeRes();
    const next = vi.fn();
    await groupController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// list
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsController.list', () => {
  it('returns 200 with groups array on success', async () => {
    const groups = [{ _id: validId(), name: 'A' }];
    groupService.getAllGroups.mockResolvedValue(groups);

    const res = makeRes();
    await groupController.list(makeReq(), res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ message: 'all groups fetched', groups });
  });

  it('returns empty array when there are no groups', async () => {
    groupService.getAllGroups.mockResolvedValue([]);
    const res = makeRes();
    await groupController.list(makeReq(), res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ message: 'all groups fetched', groups: [] });
  });

  it('calls next(err) when service throws', async () => {
    const error = new Error('DB down');
    groupService.getAllGroups.mockRejectedValue(error);

    const next = vi.fn();
    await groupController.list(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// details
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsController.details', () => {
  it('returns 400 for an invalid ObjectId', async () => {
    const req = makeReq({ params: { id: 'bad-id' } });
    const res = makeRes();
    await groupController.details(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'invalid group id' }));
  });

  it('returns 404 when group is not found', async () => {
    groupService.getGroupById.mockResolvedValue(null);
    const req = makeReq({ params: { id: validId() } });
    const res = makeRes();
    await groupController.details(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'group not found' }));
  });

  it('returns 200 with group and expenses on success', async () => {
    const groupId = validId();
    const fakeGroup = { _id: groupId, name: 'G1' };
    const fakeExpenses = [{ _id: validId(), amount: 50 }];

    groupService.getGroupById.mockResolvedValue(fakeGroup);
    mockExpenseChain(fakeExpenses);

    const req = makeReq({ params: { id: groupId } });
    const res = makeRes();
    await groupController.details(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      message: 'group details fetched',
      group: fakeGroup,
      expenses: fakeExpenses,
    });
  });

  it('calls next(err) when service throws', async () => {
    groupService.getGroupById.mockRejectedValue(new Error('fail'));
    const req = makeReq({ params: { id: validId() } });
    const next = vi.fn();
    await groupController.details(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// update
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsController.update', () => {
  it('returns 400 for an invalid ObjectId', async () => {
    const req = makeReq({ params: { id: 'not-valid' }, body: { name: 'X' } });
    const res = makeRes();
    await groupController.update(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'invalid group id' }));
  });

  it('returns 400 when body contains nothing to update', async () => {
    const req = makeReq({ params: { id: validId() }, body: {} });
    const res = makeRes();
    await groupController.update(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/nothing to update/i) }));
  });

  it('returns 400 when addMemberIds is an empty array', async () => {
    const req = makeReq({ params: { id: validId() }, body: { addMemberIds: [] } });
    const res = makeRes();
    await groupController.update(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when service returns null', async () => {
    groupService.updateGroup.mockResolvedValue(null);
    const req = makeReq({ params: { id: validId() }, body: { name: 'New Name' } });
    const res = makeRes();
    await groupController.update(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'group not found' }));
  });

  it('returns 200 with updated group on success', async () => {
    const updated = { _id: validId(), name: 'New Name' };
    groupService.updateGroup.mockResolvedValue(updated);

    const req = makeReq({ params: { id: validId() }, body: { name: 'New Name' } });
    const res = makeRes();
    await groupController.update(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ message: 'group updated', group: updated });
  });

  it('calls next(err) when service throws', async () => {
    groupService.updateGroup.mockRejectedValue(new Error('DB error'));
    const req = makeReq({ params: { id: validId() }, body: { name: 'X' } });
    const next = vi.fn();
    await groupController.update(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// remove
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsController.remove', () => {
  it('returns 400 for an invalid ObjectId', async () => {
    const req = makeReq({ params: { id: 'bad' } });
    const res = makeRes();
    await groupController.remove(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'invalid group id' }));
  });

  it('returns 404 when service returns null (group not found)', async () => {
    groupService.deleteGroup.mockResolvedValue(null);
    const req = makeReq({ params: { id: validId() } });
    const res = makeRes();
    await groupController.remove(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'group not found' }));
  });

  it('returns 200 on successful deletion', async () => {
    groupService.deleteGroup.mockResolvedValue({ _id: validId() });
    const req = makeReq({ params: { id: validId() } });
    const res = makeRes();
    await groupController.remove(req, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ message: 'group deleted' });
  });

  it('calls next(err) when service throws', async () => {
    groupService.deleteGroup.mockRejectedValue(new Error('fail'));
    const next = vi.fn();
    await groupController.remove(makeReq({ params: { id: validId() } }), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
