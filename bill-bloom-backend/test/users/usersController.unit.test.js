/**
 * Unit tests — usersController
 *
 * The service layer is mocked so tests focus purely on the controller's
 * parameter handling and delegation logic.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock external modules before importing the controller ────────────────────

vi.mock('../../src/services/usersService.js', () => ({
  searchUsers: vi.fn(),
}));

import * as usersController from '../../src/controllers/usersController.js';
import * as usersService from '../../src/services/usersService.js';

// ─── Test utilities ───────────────────────────────────────────────────────────

const makeReq = (overrides = {}) => ({
  query: {},
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
// search — query forwarding
// ══════════════════════════════════════════════════════════════════════════════

describe('usersController.search — query forwarding', () => {
  it('passes the query string to the service', async () => {
    usersService.searchUsers.mockResolvedValue([]);

    const req = makeReq({ query: { q: 'alice' } });
    const res = makeRes();

    await usersController.search(req, res);

    expect(usersService.searchUsers).toHaveBeenCalledWith('alice');
  });

  it('defaults to an empty string when q is absent', async () => {
    usersService.searchUsers.mockResolvedValue([]);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await usersController.search(req, res);

    expect(usersService.searchUsers).toHaveBeenCalledWith('');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// search — success responses
// ══════════════════════════════════════════════════════════════════════════════

describe('usersController.search — success responses', () => {
  it('returns 200 json with users array from the service', async () => {
    const mockUsers = [
      { _id: '64a1', username: 'alice', email: 'alice@example.com', avatarUrl: null },
    ];
    usersService.searchUsers.mockResolvedValue(mockUsers);

    const req = makeReq({ query: { q: 'alice' } });
    const res = makeRes();

    await usersController.search(req, res);

    expect(res.json).toHaveBeenCalledWith({ users: mockUsers });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 200 json with an empty users array when nothing is found', async () => {
    usersService.searchUsers.mockResolvedValue([]);

    const req = makeReq({ query: { q: 'zzznobody' } });
    const res = makeRes();

    await usersController.search(req, res);

    expect(res.json).toHaveBeenCalledWith({ users: [] });
  });

  it('returns all users the service provides', async () => {
    const mockUsers = [
      { _id: '1', username: 'alice', email: 'a@test.com', avatarUrl: null },
      { _id: '2', username: 'alan', email: 'al@test.com', avatarUrl: null },
    ];
    usersService.searchUsers.mockResolvedValue(mockUsers);

    const req = makeReq({ query: { q: 'al' } });
    const res = makeRes();

    await usersController.search(req, res);

    expect(res.json).toHaveBeenCalledWith({ users: mockUsers });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// search — failure handling
// ══════════════════════════════════════════════════════════════════════════════

describe('usersController.search — failure handling', () => {
  it('returns 500 when the service throws', async () => {
    usersService.searchUsers.mockRejectedValue(new Error('DB error'));

    const req = makeReq({ query: { q: 'alice' } });
    const res = makeRes();

    await usersController.search(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to search users' });
  });
});
