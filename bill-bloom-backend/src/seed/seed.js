/**
 * Seed script — clears all collections and inserts sample data.
 * Passwords are bcrypt-hashed before insertion.
 *
 * Usage: node seed.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';

const SALT_ROUNDS = 10;

const seed = async () => {
  await connectDB();

  // ── Clear existing data ──────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Group.deleteMany({}),
    Expense.deleteMany({}),
    Settlement.deleteMany({})
  ]);
  console.log('✔ Cleared all collections');

  // ── Users ────────────────────────────────────────────────────────────────
  const rawUsers = [
    { username: 'alice', email: 'alice@example.com', password: 'password123' },
    { username: 'bob',   email: 'bob@example.com',   password: 'password123' },
    { username: 'carol', email: 'carol@example.com', password: 'password123' },
    { username: 'dave',  email: 'dave@example.com',  password: 'password123' }
  ];

  const hashedUsers = await Promise.all(
    rawUsers.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, SALT_ROUNDS)
    }))
  );

  const users = await User.insertMany(hashedUsers);
  const [alice, bob, carol, dave] = users;
  console.log(`✔ Inserted ${users.length} users`);

  // ── Groups ───────────────────────────────────────────────────────────────
  const groups = await Group.insertMany([
    {
      name: 'Delhi Trip',
      members: [alice._id, bob._id, carol._id],
      createdBy: alice._id
    },
    {
      name: 'Office Lunch Club',
      members: [bob._id, carol._id, dave._id],
      createdBy: bob._id
    }
  ]);
  const [delhiTrip, lunchClub] = groups;
  console.log(`✔ Inserted ${groups.length} groups`);

  // ── Expenses ─────────────────────────────────────────────────────────────
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  await Expense.insertMany([
    // Delhi Trip expenses
    {
      amount: 3000,
      paidBy: alice._id,
      participants: [alice._id, bob._id, carol._id],
      category: 'Travel',
      description: 'Train tickets',
      type: 'group',
      groupId: delhiTrip._id,
      date: now
    },
    {
      amount: 1500,
      paidBy: bob._id,
      participants: [alice._id, bob._id, carol._id],
      category: 'Food',
      description: 'Dinner at Karim\'s',
      type: 'group',
      groupId: delhiTrip._id,
      date: now
    },
    {
      amount: 2400,
      paidBy: carol._id,
      participants: [alice._id, bob._id, carol._id],
      category: 'Accommodation',
      description: 'Hotel (2 nights)',
      type: 'group',
      groupId: delhiTrip._id,
      date: monthAgo
    },

    // Office Lunch Club expenses
    {
      amount: 900,
      paidBy: bob._id,
      participants: [bob._id, carol._id, dave._id],
      category: 'Food',
      description: 'Monday lunch',
      type: 'group',
      groupId: lunchClub._id,
      date: now
    },
    {
      amount: 750,
      paidBy: dave._id,
      participants: [bob._id, carol._id, dave._id],
      category: 'Food',
      description: 'Friday lunch',
      type: 'group',
      groupId: lunchClub._id,
      date: monthAgo
    },

    // Personal expenses for alice
    {
      amount: 500,
      paidBy: alice._id,
      participants: [alice._id],
      category: 'Groceries',
      description: 'Weekly groceries',
      type: 'personal',
      date: now
    },
    {
      amount: 200,
      paidBy: alice._id,
      participants: [alice._id],
      category: 'Transport',
      description: 'Cab rides',
      type: 'personal',
      date: monthAgo
    }
  ]);
  console.log('✔ Inserted expenses');

  // ── Print login creds ─────────────────────────────────────────────────────
  console.log('\nSeed complete! You can log in with any of these accounts:');
  for (const u of rawUsers) {
    console.log(`  email: ${u.email}   password: ${u.password}`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
