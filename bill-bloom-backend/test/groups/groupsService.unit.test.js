/**
 * Unit tests — groupsService
 *
 * Uses MongoDB in-memory server so service logic (including Mongoose queries)
 * is exercised against a real (but ephemeral) database.
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { connectTestDB, closeTestDB, clearCollections } from '../helpers/dbSetup.js';
import * as groupService from '../../src/services/groupsService.js';
import Group from '../../src/models/Group.js';
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

const makeGroup = async (creator, member, name = 'Test Group') =>
  Group.create({ name, members: [creator._id, member._id], createdBy: creator._id });

// ══════════════════════════════════════════════════════════════════════════════
// createGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsService.createGroup', () => {
  it('creates and returns a group when all inputs are valid', async () => {
    const creator = await makeUser('alice', 'alice@test.com');
    const member = await makeUser('bob', 'bob@test.com');

    const group = await groupService.createGroup({
      name: 'Road Trip',
      memberIds: [creator._id.toString(), member._id.toString()],
      createdBy: creator._id.toString(),
    });

    expect(group._id).toBeDefined();
    expect(group.name).toBe('Road Trip');
    expect(group.members).toHaveLength(2);
    expect(group.createdBy.toString()).toBe(creator._id.toString());
  });

  it('throws when a memberId is not a valid ObjectId', async () => {
    const creator = await makeUser('alice2', 'alice2@test.com');
    await expect(
      groupService.createGroup({
        name: 'Bad IDs',
        memberIds: [creator._id.toString(), 'not-an-id'],
        createdBy: creator._id.toString(),
      })
    ).rejects.toThrow(/invalid/i);
  });

  it('throws when a member user does not exist in the DB', async () => {
    const creator = await makeUser('alice3', 'alice3@test.com');
    const fakeId = new mongoose.Types.ObjectId();

    await expect(
      groupService.createGroup({
        name: 'Ghost Member',
        memberIds: [creator._id.toString(), fakeId.toString()],
        createdBy: creator._id.toString(),
      })
    ).rejects.toThrow(/do not exist/i);
  });

  it('throws when the creator user does not exist in the DB', async () => {
    const member1 = await makeUser('m1', 'm1@test.com');
    const member2 = await makeUser('m2', 'm2@test.com');
    const fakeCreatorId = new mongoose.Types.ObjectId();

    await expect(
      groupService.createGroup({
        name: 'No Creator',
        memberIds: [member1._id.toString(), member2._id.toString()],
        createdBy: fakeCreatorId.toString(),
      })
    ).rejects.toThrow(/creator user does not exist/i);
  });

  it('throws when memberIds has fewer than 2 valid users', async () => {
    const creator = await makeUser('solo', 'solo@test.com');

    await expect(
      groupService.createGroup({
        name: 'Solo Group',
        memberIds: [creator._id.toString()],
        createdBy: creator._id.toString(),
      })
    ).rejects.toThrow(/at least 2 members/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getAllGroups
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsService.getAllGroups', () => {
  it('returns an empty array when no groups exist', async () => {
    const groups = await groupService.getAllGroups();
    expect(groups).toEqual([]);
  });

  it('returns all groups with populated members and createdBy', async () => {
    const creator = await makeUser('c1', 'c1@test.com');
    const member = await makeUser('m1', 'm1@test.com');
    await makeGroup(creator, member, 'Alpha');
    await makeGroup(creator, member, 'Beta');

    const groups = await groupService.getAllGroups();
    expect(groups).toHaveLength(2);
    expect(groups[0].members[0]).toHaveProperty('email');
    expect(groups[0].createdBy).toHaveProperty('username');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getGroupById
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsService.getGroupById', () => {
  it('returns the group with populated fields when found', async () => {
    const creator = await makeUser('creator', 'creator@test.com');
    const member = await makeUser('member', 'member@test.com');
    const group = await makeGroup(creator, member);

    const found = await groupService.getGroupById(group._id.toString());

    expect(found._id.toString()).toBe(group._id.toString());
    expect(found.members[0]).toHaveProperty('email');
    expect(found.createdBy).toHaveProperty('username');
  });

  it('returns null for a non-existent group id', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const result = await groupService.getGroupById(id);
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsService.updateGroup', () => {
  it('updates the group name', async () => {
    const creator = await makeUser('upd1', 'upd1@test.com');
    const member = await makeUser('upd2', 'upd2@test.com');
    const group = await makeGroup(creator, member, 'Old Name');

    const updated = await groupService.updateGroup(group._id.toString(), { name: 'New Name' });

    expect(updated.name).toBe('New Name');
  });

  it('adds new members without duplicating existing ones', async () => {
    const creator = await makeUser('upd3', 'upd3@test.com');
    const member = await makeUser('upd4', 'upd4@test.com');
    const newMember = await makeUser('upd5', 'upd5@test.com');
    const group = await makeGroup(creator, member);

    const updated = await groupService.updateGroup(group._id.toString(), {
      addMemberIds: [newMember._id.toString()],
    });

    const memberIds = updated.members.map((m) => m._id.toString());
    expect(memberIds).toContain(newMember._id.toString());
    expect(memberIds).toHaveLength(3);
  });

  it('does not duplicate members when the same id is added twice ($addToSet)', async () => {
    const creator = await makeUser('upd6', 'upd6@test.com');
    const member = await makeUser('upd7', 'upd7@test.com');
    const group = await makeGroup(creator, member);

    // Add an already-existing member
    const updated = await groupService.updateGroup(group._id.toString(), {
      addMemberIds: [member._id.toString()],
    });

    expect(updated.members).toHaveLength(2);   // no duplicate
  });

  it('throws when addMemberIds contains an invalid ObjectId', async () => {
    const creator = await makeUser('upd8', 'upd8@test.com');
    const member = await makeUser('upd9', 'upd9@test.com');
    const group = await makeGroup(creator, member);

    await expect(
      groupService.updateGroup(group._id.toString(), { addMemberIds: ['not-valid-id'] })
    ).rejects.toThrow(/invalid/i);
  });

  it('throws when a member to add does not exist in the DB', async () => {
    const creator = await makeUser('upd10', 'upd10@test.com');
    const member = await makeUser('upd11', 'upd11@test.com');
    const group = await makeGroup(creator, member);
    const ghostId = new mongoose.Types.ObjectId();

    await expect(
      groupService.updateGroup(group._id.toString(), { addMemberIds: [ghostId.toString()] })
    ).rejects.toThrow(/do not exist/i);
  });

  it('returns null for a non-existent group id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await groupService.updateGroup(fakeId, { name: 'Ghost Update' });
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// deleteGroup
// ══════════════════════════════════════════════════════════════════════════════

describe('groupsService.deleteGroup', () => {
  it('deletes the group and returns the removed document', async () => {
    const creator = await makeUser('del1', 'del1@test.com');
    const member = await makeUser('del2', 'del2@test.com');
    const group = await makeGroup(creator, member, 'To Delete');

    const deleted = await groupService.deleteGroup(group._id.toString());

    expect(deleted._id.toString()).toBe(group._id.toString());
    expect(await Group.findById(group._id)).toBeNull();
  });

  it('returns null when the group does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await groupService.deleteGroup(fakeId);
    expect(result).toBeNull();
  });
});
