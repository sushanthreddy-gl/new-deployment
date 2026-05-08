import Settlement from '../models/Settlement.js';

export const createSettlement = (data) => {
  const s = new Settlement(data);
  return s.save();
};

export const getSettlementsByGroup = (groupId) =>
  Settlement.find({ groupId }).populate('fromUser', 'username email').populate('toUser', 'username email').sort({ createdAt: -1 });