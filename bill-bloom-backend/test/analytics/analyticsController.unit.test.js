/**
 * Unit tests — analyticsController
 *
 * All service dependencies are mocked so tests focus purely on the
 * controller's validation and delegation logic.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── Mock external modules before importing the controller ────────────────────

vi.mock('../../src/services/analyticsService.js', () => ({
  getPersonalMonthlySpending: vi.fn(),
  getGroupSpendingByUser: vi.fn(),
  getCategoryTotalsForGroup: vi.fn(),
  getCategoryTotalsForUser: vi.fn(),
}));

import * as analyticsController from '../../src/controllers/analyticsController.js';
import * as analyticsService from '../../src/services/analyticsService.js';

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

const makeNext = () => vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// personalMonthly
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsController.personalMonthly', () => {
  it('returns 200 json with message and data from the service', async () => {
    const mockData = [{ year: 2024, month: 1, total: 120 }];
    analyticsService.getPersonalMonthlySpending.mockResolvedValue(mockData);

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await analyticsController.personalMonthly(req, res, next);

    expect(analyticsService.getPersonalMonthlySpending).toHaveBeenCalledWith(req.user._id);
    expect(res.json).toHaveBeenCalledWith({ message: 'personal monthly spending', data: mockData });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an empty data array when the service returns []', async () => {
    analyticsService.getPersonalMonthlySpending.mockResolvedValue([]);

    const req = makeReq();
    const res = makeRes();

    await analyticsController.personalMonthly(req, res, makeNext());

    expect(res.json).toHaveBeenCalledWith({ message: 'personal monthly spending', data: [] });
  });

  it('calls next(err) when the service throws', async () => {
    const serviceError = new Error('DB failure');
    analyticsService.getPersonalMonthlySpending.mockRejectedValue(serviceError);

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await analyticsController.personalMonthly(req, res, next);

    expect(next).toHaveBeenCalledWith(serviceError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// groupSpending
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsController.groupSpending', () => {
  it('returns 200 json with message and data from the service', async () => {
    const mockData = [{ groupId: validId(), groupName: 'Flatmates', total: 300 }];
    analyticsService.getGroupSpendingByUser.mockResolvedValue(mockData);

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await analyticsController.groupSpending(req, res, next);

    expect(analyticsService.getGroupSpendingByUser).toHaveBeenCalledWith(req.user._id);
    expect(res.json).toHaveBeenCalledWith({ message: 'group spending summary', data: mockData });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an empty data array when the service returns []', async () => {
    analyticsService.getGroupSpendingByUser.mockResolvedValue([]);

    const req = makeReq();
    const res = makeRes();

    await analyticsController.groupSpending(req, res, makeNext());

    expect(res.json).toHaveBeenCalledWith({ message: 'group spending summary', data: [] });
  });

  it('calls next(err) when the service throws', async () => {
    const serviceError = new Error('aggregate failed');
    analyticsService.getGroupSpendingByUser.mockRejectedValue(serviceError);

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await analyticsController.groupSpending(req, res, next);

    expect(next).toHaveBeenCalledWith(serviceError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// groupCategories
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsController.groupCategories', () => {
  it('returns 400 for an invalid groupId', async () => {
    const req = makeReq({ params: { groupId: 'not-an-object-id' } });
    const res = makeRes();
    const next = makeNext();

    await analyticsController.groupCategories(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'invalid group id' });
    expect(analyticsService.getCategoryTotalsForGroup).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty string groupId', async () => {
    const req = makeReq({ params: { groupId: '' } });
    const res = makeRes();

    await analyticsController.groupCategories(req, res, makeNext());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 json with message and data for a valid groupId', async () => {
    const mockData = [{ category: 'Food', total: 80 }];
    analyticsService.getCategoryTotalsForGroup.mockResolvedValue(mockData);

    const gId = validId();
    const req = makeReq({ params: { groupId: gId } });
    const res = makeRes();
    const next = makeNext();

    await analyticsController.groupCategories(req, res, next);

    expect(analyticsService.getCategoryTotalsForGroup).toHaveBeenCalledWith(gId);
    expect(res.json).toHaveBeenCalledWith({ message: 'group category analytics', data: mockData });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an empty data array when the service returns []', async () => {
    analyticsService.getCategoryTotalsForGroup.mockResolvedValue([]);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();

    await analyticsController.groupCategories(req, res, makeNext());

    expect(res.json).toHaveBeenCalledWith({ message: 'group category analytics', data: [] });
  });

  it('calls next(err) when the service throws', async () => {
    const serviceError = new Error('aggregate error');
    analyticsService.getCategoryTotalsForGroup.mockRejectedValue(serviceError);

    const req = makeReq({ params: { groupId: validId() } });
    const res = makeRes();
    const next = makeNext();

    await analyticsController.groupCategories(req, res, next);

    expect(next).toHaveBeenCalledWith(serviceError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// personalCategories
// ══════════════════════════════════════════════════════════════════════════════

describe('analyticsController.personalCategories', () => {
  it('returns 200 json with message and data from the service', async () => {
    const mockData = [{ category: 'Transport', total: 45 }];
    analyticsService.getCategoryTotalsForUser.mockResolvedValue(mockData);

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await analyticsController.personalCategories(req, res, next);

    expect(analyticsService.getCategoryTotalsForUser).toHaveBeenCalledWith(req.user._id);
    expect(res.json).toHaveBeenCalledWith({ message: 'personal category analytics', data: mockData });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an empty data array when the service returns []', async () => {
    analyticsService.getCategoryTotalsForUser.mockResolvedValue([]);

    const req = makeReq();
    const res = makeRes();

    await analyticsController.personalCategories(req, res, makeNext());

    expect(res.json).toHaveBeenCalledWith({ message: 'personal category analytics', data: [] });
  });

  it('calls next(err) when the service throws', async () => {
    const serviceError = new Error('DB error');
    analyticsService.getCategoryTotalsForUser.mockRejectedValue(serviceError);

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await analyticsController.personalCategories(req, res, next);

    expect(next).toHaveBeenCalledWith(serviceError);
    expect(res.json).not.toHaveBeenCalled();
  });
});
