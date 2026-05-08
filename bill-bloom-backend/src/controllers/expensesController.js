import mongoose from 'mongoose';
import * as expenseService from '../services/expensesService.js';
import Group from '../models/Group.js';
import User from '../models/User.js';

const isValidId = (id) => mongoose.isValidObjectId(id);

export const create = async (req, res) => {
  const { amount, description, type, groupId, paidBy, participants, category, date } = req.body;

  // basic validation
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'amount must be a positive number' });
  }
  if (!type || !['group', 'personal'].includes(type)) {
    return res.status(400).json({ message: 'type must be "group" or "personal"' });
  }
  if (!paidBy || !isValidId(paidBy)) {
    return res.status(400).json({ message: 'paidBy is required and must be a valid user id' });
  }
  const payer = await User.findById(paidBy);
  if (!payer) return res.status(400).json({ message: 'paidBy user does not exist' });

  if (type === 'group') {
    if (!groupId || !isValidId(groupId)) return res.status(400).json({ message: 'groupId is required for group expense' });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'group not found' });

    if (!Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ message: 'group expense must have participants array with 2 or more users' });
    }

    // validate participants ids and membership in group
    for (const pid of participants) {
      if (!isValidId(pid)) return res.status(400).json({ message: `invalid participant id ${pid}` });
      if (!group.members.map(String).includes(String(pid))) {
        return res.status(400).json({ message: `participant ${pid} is not a member of the group` });
      }
    }

    // ensure paidBy is a group member
    if (!group.members.map(String).includes(String(paidBy))) {
      return res.status(400).json({ message: 'paidBy must be a member of the group for group expenses' });
    }

    try {
      const expense = await expenseService.createExpense({
        amount,
        description,
        type,
        groupId,
        paidBy,
        participants,
        category,
        date
      });
      return res.status(201).json({ message: 'expense created', expense });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'server error' });
    }
  }

  // personal expense
  try {
    const expense = await expenseService.createExpense({
      amount,
      description,
      type,
      paidBy,
      category,
      date
    });
    return res.status(201).json({ message: 'expense created', expense });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'server error' });
  }
};

export const listByGroup = async (req, res) => {
  const { groupId } = req.params;
  if (!isValidId(groupId)) return res.status(400).json({ message: 'invalid group id' });
  try {
    const expenses = await expenseService.getExpensesByGroup(groupId);
    console.log(`Fetched`, expenses);
    return res.json({ message: 'group expenses fetched', expenses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'server error' });
  }
};

export const listPersonal = async (req, res) => {
  const userId = req.user._id;
  try {
    const expenses = await expenseService.getPersonalExpensesByUser(userId);
    return res.json({ message: 'personal expenses fetched', expenses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'server error' });
  }
};

export const remove = async (req, res) => {
  const { expenseId } = req.params;
  if (!isValidId(expenseId)) return res.status(400).json({ message: 'invalid expense id' });
  try {
    const deleted = await expenseService.deleteExpenseById(expenseId);
    if (!deleted) return res.status(404).json({ message: 'expense not found' });
    return res.json({ message: 'expense deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'server error' });
  }
};