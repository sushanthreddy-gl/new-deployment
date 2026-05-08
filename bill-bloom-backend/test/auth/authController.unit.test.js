/**
 * Unit tests — authController
 *
 * All external dependencies (authService, jsonwebtoken) are mocked so
 * tests focus purely on the controller's validation and delegation logic.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock external modules before importing the controller ────────────────────

vi.mock('../../src/services/authService.js', () => ({
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  createUser: vi.fn(),
  comparePassword: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked.jwt.token'),
  },
}));

import * as authController from '../../src/controllers/authController.js';
import * as authService from '../../src/services/authService.js';

// ─── Test utilities ───────────────────────────────────────────────────────────

const makeReq = (overrides = {}) => ({
  body: {},
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
// register
// ══════════════════════════════════════════════════════════════════════════════

describe('authController.register', () => {
  it('returns 400 when username is missing', async () => {
    const req = makeReq({ body: { email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/required/i) })
    );
  });

  it('returns 400 when email is missing', async () => {
    const req = makeReq({ body: { username: 'alice', password: 'password123' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when password is missing', async () => {
    const req = makeReq({ body: { username: 'alice', email: 'a@b.com' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when password is shorter than 6 characters', async () => {
    const req = makeReq({ body: { username: 'alice', email: 'a@b.com', password: 'abc' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/6 characters/i) })
    );
  });

  it('returns 400 when email format is invalid', async () => {
    const req = makeReq({ body: { username: 'alice', email: 'not-an-email', password: 'password123' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/invalid email/i) })
    );
  });

  it('returns 409 when email is already in use', async () => {
    authService.findByEmail.mockResolvedValue({ email: 'a@b.com' });
    const req = makeReq({ body: { username: 'alice', email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/email.*in use/i) })
    );
  });

  it('returns 409 when username is already in use', async () => {
    authService.findByEmail.mockResolvedValue(null);
    authService.findByUsername.mockResolvedValue({ username: 'alice' });
    const req = makeReq({ body: { username: 'alice', email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/username.*in use/i) })
    );
  });

  it('returns 201 with user info when registration succeeds', async () => {
    authService.findByEmail.mockResolvedValue(null);
    authService.findByUsername.mockResolvedValue(null);
    const fakeUser = { _id: 'uid1', username: 'alice', email: 'a@b.com', createdAt: new Date() };
    authService.createUser.mockResolvedValue(fakeUser);
    const req = makeReq({ body: { username: 'alice', email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'user created',
        user: expect.objectContaining({ username: 'alice', email: 'a@b.com' }),
      })
    );
  });

  it('does not include password in the 201 response', async () => {
    authService.findByEmail.mockResolvedValue(null);
    authService.findByUsername.mockResolvedValue(null);
    const fakeUser = { _id: 'uid1', username: 'alice', email: 'a@b.com', createdAt: new Date() };
    authService.createUser.mockResolvedValue(fakeUser);
    const req = makeReq({ body: { username: 'alice', email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.register(req, res, vi.fn());
    const [responseBody] = res.json.mock.calls[0];
    expect(responseBody.user).not.toHaveProperty('password');
  });

  it('calls next with error when service throws', async () => {
    authService.findByEmail.mockRejectedValue(new Error('DB error'));
    const req = makeReq({ body: { username: 'alice', email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    const next = vi.fn();
    await authController.register(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// login
// ══════════════════════════════════════════════════════════════════════════════

describe('authController.login', () => {
  it('returns 400 when email is missing', async () => {
    const req = makeReq({ body: { password: 'password123' } });
    const res = makeRes();
    await authController.login(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/required/i) })
    );
  });

  it('returns 400 when password is missing', async () => {
    const req = makeReq({ body: { email: 'a@b.com' } });
    const res = makeRes();
    await authController.login(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when user is not found', async () => {
    authService.findByEmail.mockResolvedValue(null);
    const req = makeReq({ body: { email: 'ghost@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.login(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/invalid credentials/i) })
    );
  });

  it('returns 401 when password does not match', async () => {
    authService.findByEmail.mockResolvedValue({ _id: 'uid1', password: 'hashed' });
    authService.comparePassword.mockResolvedValue(false);
    const req = makeReq({ body: { email: 'a@b.com', password: 'wrongpass' } });
    const res = makeRes();
    await authController.login(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/invalid credentials/i) })
    );
  });

  it('returns 200 with a token and user info on successful login', async () => {
    const fakeUser = { _id: 'uid1', username: 'alice', email: 'a@b.com', password: 'hashed' };
    authService.findByEmail.mockResolvedValue(fakeUser);
    authService.comparePassword.mockResolvedValue(true);
    const req = makeReq({ body: { email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.login(req, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'login successful',
        token: expect.any(String),
        user: expect.objectContaining({ username: 'alice', email: 'a@b.com' }),
      })
    );
  });

  it('does not include password in the login response', async () => {
    const fakeUser = { _id: 'uid1', username: 'alice', email: 'a@b.com', password: 'hashed' };
    authService.findByEmail.mockResolvedValue(fakeUser);
    authService.comparePassword.mockResolvedValue(true);
    const req = makeReq({ body: { email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    await authController.login(req, res, vi.fn());
    const [responseBody] = res.json.mock.calls[0];
    expect(responseBody.user).not.toHaveProperty('password');
  });

  it('calls next with error when service throws', async () => {
    authService.findByEmail.mockRejectedValue(new Error('DB failure'));
    const req = makeReq({ body: { email: 'a@b.com', password: 'password123' } });
    const res = makeRes();
    const next = vi.fn();
    await authController.login(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// me
// ══════════════════════════════════════════════════════════════════════════════

describe('authController.me', () => {
  it('returns 200 with the authenticated user info from req.user', async () => {
    const req = makeReq({ user: { _id: 'uid1', username: 'alice', email: 'a@b.com' } });
    const res = makeRes();
    await authController.me(req, res);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 'uid1', username: 'alice', email: 'a@b.com' },
    });
  });
});
