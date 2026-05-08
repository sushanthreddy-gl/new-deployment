/**
 * Unit tests — authService
 *
 * User model and bcryptjs are mocked; tests verify that each service
 * function delegates to the correct underlying calls.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSave = vi.fn();
const mockConstructorCalls = [];

vi.mock('../../src/models/User.js', () => {
  function MockUser(data) {
    mockConstructorCalls.push(data);
    Object.assign(this, data);
    this.save = mockSave;
  }
  MockUser.findOne = vi.fn();
  return { default: MockUser };
});

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import * as authService from '../../src/services/authService.js';
import User from '../../src/models/User.js';
import bcrypt from 'bcryptjs';

beforeEach(() => {
  vi.clearAllMocks();
  mockConstructorCalls.length = 0;
});

// ══════════════════════════════════════════════════════════════════════════════
// findByEmail
// ══════════════════════════════════════════════════════════════════════════════

describe('authService.findByEmail', () => {
  it('calls User.findOne with { email } and returns the result', async () => {
    const fakeUser = { email: 'a@b.com' };
    User.findOne.mockResolvedValue(fakeUser);
    const result = await authService.findByEmail('a@b.com');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(result).toBe(fakeUser);
  });

  it('returns null when no user matches the email', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await authService.findByEmail('nope@b.com');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// findByUsername
// ══════════════════════════════════════════════════════════════════════════════

describe('authService.findByUsername', () => {
  it('calls User.findOne with { username } and returns the result', async () => {
    const fakeUser = { username: 'alice' };
    User.findOne.mockResolvedValue(fakeUser);
    const result = await authService.findByUsername('alice');
    expect(User.findOne).toHaveBeenCalledWith({ username: 'alice' });
    expect(result).toBe(fakeUser);
  });

  it('returns null when username is not found', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await authService.findByUsername('ghost');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// createUser
// ══════════════════════════════════════════════════════════════════════════════

describe('authService.createUser', () => {
  it('hashes the password with bcrypt salt 10 and saves the user', async () => {
    bcrypt.hash.mockResolvedValue('hashed_pw');
    const savedUser = { _id: 'uid1', username: 'alice', email: 'a@b.com', password: 'hashed_pw' };
    mockSave.mockResolvedValue(savedUser);

    const result = await authService.createUser({
      username: 'alice',
      email: 'a@b.com',
      password: 'plaintext',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
    expect(mockSave).toHaveBeenCalled();
    expect(result).toBe(savedUser);
  });

  it('stores the hashed password, not the plain-text one', async () => {
    bcrypt.hash.mockResolvedValue('hashed_pw');
    mockSave.mockResolvedValue({});

    await authService.createUser({ username: 'alice', email: 'a@b.com', password: 'plaintext' });

    // The MockUser constructor was called with the hashed password
    const constructorArg = mockConstructorCalls[0];
    expect(constructorArg).toMatchObject({ password: 'hashed_pw' });
    expect(constructorArg.password).not.toBe('plaintext');
  });

  it('returns the result of save()', async () => {
    bcrypt.hash.mockResolvedValue('hashed_pw');
    const savedUser = { _id: 'uid1' };
    mockSave.mockResolvedValue(savedUser);

    const result = await authService.createUser({ username: 'alice', email: 'a@b.com', password: 'pw' });
    expect(result).toBe(savedUser);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// comparePassword
// ══════════════════════════════════════════════════════════════════════════════

describe('authService.comparePassword', () => {
  it('returns true when bcrypt confirms the passwords match', async () => {
    bcrypt.compare.mockResolvedValue(true);
    const result = await authService.comparePassword('plain', 'hashed');
    expect(bcrypt.compare).toHaveBeenCalledWith('plain', 'hashed');
    expect(result).toBe(true);
  });

  it('returns false when passwords do not match', async () => {
    bcrypt.compare.mockResolvedValue(false);
    const result = await authService.comparePassword('wrong', 'hashed');
    expect(result).toBe(false);
  });
});
