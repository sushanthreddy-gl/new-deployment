import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Group from '../models/Group.js';

/**
 * Personal monthly spending — aggregate personal expenses paid by the user,
 * grouped by year and month.
 */
export const getPersonalMonthlySpending = (userId) =>
  Expense.aggregate([
    {
      $match: {
        type: 'personal',
        paidBy: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        total: { $round: ['$total', 2] }
      }
    }
  ]);

/**
 * Group spending by the logged-in user — for every group the user is a member
 * of, sum the user's equal share in each group expense.
 */
export const getGroupSpendingByUser = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // All groups the user belongs to
  const userGroups = await Group.find({ members: userObjectId }).select('name');
  const groupIds = userGroups.map((g) => g._id);

  // All group expenses across those groups
  const expenses = await Expense.find({
    type: 'group',
    groupId: { $in: groupIds }
  }).select('groupId amount participants');

  // Sum user's share per group
  const totals = {};
  for (const exp of expenses) {
    const participantCount = exp.participants.length;
    const isParticipant = exp.participants.some((p) => p.equals(userObjectId));
    if (!isParticipant || participantCount === 0) continue;

    const share = exp.amount / participantCount;
    const key = String(exp.groupId);
    totals[key] = (totals[key] || 0) + share;
  }

  return userGroups.map((g) => ({
    groupId: g._id,
    groupName: g.name,
    total: Math.round((totals[String(g._id)] || 0) * 100) / 100
  }));
};

/**
 * Category-based analytics for a group.
 */
export const getCategoryTotalsForGroup = (groupId) =>
  Expense.aggregate([
    {
      $match: { groupId: new mongoose.Types.ObjectId(groupId) }
    },
    {
      $group: {
        _id: { $ifNull: ['$category', 'Uncategorised'] },
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { total: -1 }
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        total: { $round: ['$total', 2] }
      }
    }
  ]);

/**
 * Category-based analytics for a user's personal expenses.
 */
export const getCategoryTotalsForUser = (userId) =>
  Expense.aggregate([
    {
      $match: { paidBy: new mongoose.Types.ObjectId(userId) }
    },
    {
      $group: {
        _id: { $ifNull: ['$category', 'Uncategorised'] },
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { total: -1 }
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        total: { $round: ['$total', 2] }
      }
    }
  ]);
