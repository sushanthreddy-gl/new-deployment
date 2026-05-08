/**
 * Unit tests — usersService
 *
 * Uses MongoDB in-memory server so the Mongoose query logic is exercised
 * against a real (but ephemeral) database.
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import * as usersService from '../../src/services/usersService.js';
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

const makeUser = async (username, email = `${username}@test.com`) => {
  const hashed = await bcrypt.hash('pass123', 10);
  return User.create({ username, email, password: hashed });
};

// ══════════════════════════════════════════════════════════════════════════════
// searchUsers — empty / whitespace queries
// ══════════════════════════════════════════════════════════════════════════════

describe('usersService.searchUsers — empty / whitespace queries', () => {
  it('returns [] for an empty string without querying the DB', async () => {
    await makeUser('alice');

    const result = await usersService.searchUsers('');

    expect(result).toEqual([]);
  });

  it('returns [] for a whitespace-only string', async () => {
    await makeUser('bob');

    const result = await usersService.searchUsers('   ');

    expect(result).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// searchUsers — matching behaviour
// ══════════════════════════════════════════════════════════════════════════════

describe('usersService.searchUsers — matching behaviour', () => {
  it('returns a user whose username exactly matches the query', async () => {
    await makeUser('alice');

    const result = await usersService.searchUsers('alice');

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('alice');
  });

  it('matches partial substrings', async () => {
    await makeUser('alice');
    await makeUser('alan');
    await makeUser('bob');

    const result = await usersService.searchUsers('al');

    expect(result).toHaveLength(2);
    const names = result.map((u) => u.username);
    expect(names).toContain('alice');
    expect(names).toContain('alan');
  });

  it('performs a case-insensitive search', async () => {
    await makeUser('Charlie');

    const result = await usersService.searchUsers('charlie');

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('Charlie');
  });

  it('returns [] when no users match the query', async () => {
    await makeUser('alice');

    const result = await usersService.searchUsers('zzznobody');

    expect(result).toEqual([]);
  });

  it('returns all matching users when multiple exist', async () => {
    await makeUser('testA');
    await makeUser('testB');
    await makeUser('testC');
    await makeUser('other');

    const result = await usersService.searchUsers('test');

    expect(result).toHaveLength(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// searchUsers — returned fields
// ══════════════════════════════════════════════════════════════════════════════

describe('usersService.searchUsers — returned fields', () => {
  it('includes _id, username, and email in the result', async () => {
    await makeUser('alice', 'alice@example.com');

    const result = await usersService.searchUsers('alice');

    expect(result[0]._id).toBeDefined();
    expect(result[0].username).toBe('alice');
    expect(result[0].email).toBe('alice@example.com');
  });

  it('does not expose the password field', async () => {
    await makeUser('alice');

    const result = await usersService.searchUsers('alice');

    expect(result[0].password).toBeUndefined();
  });
});
