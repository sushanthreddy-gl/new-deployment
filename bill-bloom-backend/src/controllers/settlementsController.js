import mongoose from 'mongoose';
import * as settlementService from '../services/settlementsService.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import { settlementEngine } from '../utils/settlementEngine.js';

const isValidId = (id) => mongoose.isValidObjectId(id);

/**
 * Calculate minimal settlements for a group without persisting them.
 */
export const settleGroup = async (req, res, next) => {
  const { groupId } = req.params;
  if (!isValidId(groupId)) return res.status(400).json({ message: 'invalid group id' });

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'group not found' });

    const expenses = await Expense.find({ groupId });
    const existingSettlements = await settlementService.getSettlementsByGroup(groupId);

    const memberIds = group.members.map(String);
    const settlements = settlementEngine(memberIds, expenses, existingSettlements);

    return res.json({ message: 'settlements calculated', settlements });
  } catch (err) {
    next(err);
  }
};

/**
 * Store a manual settlement record.
 * Body: { fromId, fromName, toId, toName, amount, groupID }
 */
export const create = async (req, res, next) => {
  const { fromId, toId, amount, groupId } = req.body;

  if (!fromId || !toId || amount == null) {
    return res.status(400).json({ message: 'fromId, toId and amount are required' });
  }
  if (!isValidId(fromId) || !isValidId(toId)) {
    return res.status(400).json({ message: 'fromId and toId must be valid ids' });
  }
  if (fromId === toId) {
    return res.status(400).json({ message: 'fromId and toId cannot be the same' });
  }
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ message: 'amount must be a positive number' });
  }
  if (!isValidId(groupId)) {
    return res.status(400).json({ message: 'invalid groupId' });
  }

  try {
    const [from, to, group] = await Promise.all([
      User.findById(fromId),
      User.findById(toId),
      Group.findById(groupId)
    ]);
    if (!from || !to) return res.status(404).json({ message: 'fromId or toId not found' });
    if (!group) return res.status(404).json({ message: 'group not found' });

    const members = group.members.map(String);
    if (!members.includes(String(fromId)) || !members.includes(String(toId))) {
      return res.status(400).json({ message: 'both users must be members of the group' });
    }

    const settlement = await settlementService.createSettlement({
      fromUser: fromId,
      toUser: toId,
      amount: amt,
      groupId
    });

    return res.status(201).json({ message: 'settlement created', settlement });
  } catch (err) {
    next(err);
  }
};

/**
 * List all settlements for a group, populated with user names.
 */
export const listByGroup = async (req, res, next) => {
  const { groupId } = req.params;
  if (!isValidId(groupId)) return res.status(400).json({ message: 'invalid group id' });

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'group not found' });

    const settlements = await settlementService.getSettlementsByGroup(groupId);
    return res.json({ message: 'group settlements fetched', settlements });
  } catch (err) {
    next(err);
  }
};