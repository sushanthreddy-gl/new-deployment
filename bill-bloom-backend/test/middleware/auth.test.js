/**
 * Unit tests — auth middleware
 *
 * jwt.verify and User.findById are mocked so tests focus purely on the
 * middleware's branching logic without needing a real DB or valid tokens.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../../src/models/User.js', () => ({
  default: {
    findById: vi.fn(),
  },
}));

import authMiddleware from '../../src/middleware/auth.js';
import jwt from 'jsonwebtoken';
import User from '../../src/models/User.js';

// ─── Test utilities ───────────────────────────────────────────────────────────

const makeReq = (headers = {}) => ({ headers });

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
// auth middleware
// ══════════════════════════════════════════════════════════════════════════════

describe('auth middleware', () => {
  it('calls next with a 401 error when the Authorization header is absent', async () => {
    const req = makeReq({});
    const next = vi.fn();

    await authMiddleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it('calls next with a 401 error when the header does not start with "Bearer "', async () => {
    const req = makeReq({ authorization: 'Token sometoken' });
    const next = vi.fn();

    await authMiddleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it('calls next with a 401 error when the token signature is invalid', async () => {
    jwt.verify.mockImplementation(() => {
      throw Object.assign(new Error('invalid signature'), { name: 'JsonWebTokenError' });
    });
    const req = makeReq({ authorization: 'Bearer bad.token.here' });
    const next = vi.fn();

    await authMiddleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it('calls next with a 401 error when the token is expired', async () => {
    jwt.verify.mockImplementation(() => {
      throw Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
    });
    const req = makeReq({ authorization: 'Bearer expired.token.here' });
    const next = vi.fn();

    await authMiddleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it('calls next with a 401 error when the decoded user does not exist in the DB', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    jwt.verify.mockReturnValue({ id: userId });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    const req = makeReq({ authorization: 'Bearer valid.format.token' });
    const next = vi.fn();

    await authMiddleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it('sets req.user and calls next() with no arguments when token is valid', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const fakeUser = { _id: userId, username: 'alice', email: 'alice@example.com' };
    jwt.verify.mockReturnValue({ id: userId });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(fakeUser) });
    const req = makeReq({ authorization: 'Bearer valid.format.token' });
    const next = vi.fn();

    await authMiddleware(req, makeRes(), next);

    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // no error argument
  });

  it('queries the DB omitting the password field', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const fakeUser = { _id: userId, username: 'alice' };
    jwt.verify.mockReturnValue({ id: userId });
    const mockSelect = vi.fn().mockResolvedValue(fakeUser);
    User.findById.mockReturnValue({ select: mockSelect });
    const req = makeReq({ authorization: 'Bearer valid.format.token' });

    await authMiddleware(req, makeRes(), vi.fn());

    expect(User.findById).toHaveBeenCalledWith(userId);
    expect(mockSelect).toHaveBeenCalledWith('-password');
  });
});
