import Expense from '../models/Expense.js';

export const createExpense = (data) => {
  const e = new Expense(data);
  return e.save();
};

export const getExpensesByGroup = (groupId) =>
  Expense.find({ groupId }).populate('paidBy', 'username email').populate('participants', 'username email');

export const getPersonalExpensesByUser = (userId) =>
  Expense.find({ type: 'personal', paidBy: userId }).populate('paidBy', 'username email');

export const deleteExpenseById = (id) => Expense.findByIdAndDelete(id);