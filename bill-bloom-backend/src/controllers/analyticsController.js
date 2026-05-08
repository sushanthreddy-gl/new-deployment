import mongoose from 'mongoose';
import {
  getPersonalMonthlySpending,
  getGroupSpendingByUser,
  getCategoryTotalsForGroup,
  getCategoryTotalsForUser
} from '../services/analyticsService.js';

const isValidId = (id) => mongoose.isValidObjectId(id);

/**
 * GET /api/analytics/personal
 * Monthly personal spending for the logged-in user.
 */
export const personalMonthly = async (req, res, next) => {
  try {
    const data = await getPersonalMonthlySpending(req.user._id);
    return res.json({ message: 'personal monthly spending', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/groups
 * The logged-in user's spending summary per group.
 */
export const groupSpending = async (req, res, next) => {
  try {
    const data = await getGroupSpendingByUser(req.user._id);
    return res.json({ message: 'group spending summary', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/group/:groupId/categories
 * Category-wise expense totals for a group.
 */
export const groupCategories = async (req, res, next) => {
  const { groupId } = req.params;
  if (!isValidId(groupId)) return res.status(400).json({ message: 'invalid group id' });
  try {
    const data = await getCategoryTotalsForGroup(groupId);
    return res.json({ message: 'group category analytics', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/personal/categories
 * Category-wise personal expense totals for the logged-in user.
 */
export const personalCategories = async (req, res, next) => {
  try {
    const data = await getCategoryTotalsForUser(req.user._id);
    return res.json({ message: 'personal category analytics', data });
  } catch (err) {
    next(err);
  }
};
