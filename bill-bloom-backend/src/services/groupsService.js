import Group from '../models/Group.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import mongoose from 'mongoose';

export const createGroup = async ({ name, memberIds, createdBy }) => {
  // ensure all ids are ObjectId and users exist
  const validIds = memberIds.filter((id) => mongoose.isValidObjectId(id));
  if (validIds.length !== memberIds.length) {
    throw new Error('One or more memberIds are invalid');
  }

  const usersCount = await User.countDocuments({ _id: { $in: memberIds } });
  if (usersCount !== memberIds.length) {
    throw new Error('One or more members do not exist');
  }

  if (!mongoose.isValidObjectId(createdBy)) {
    throw new Error('createdBy is invalid');
  }
  const creator = await User.findById(createdBy);
  if (!creator) throw new Error('creator user does not exist');

  if (memberIds.length < 2) throw new Error('A group must have at least 2 members');

  const group = new Group({
    name,
    members: memberIds,
    createdBy
  });
  return group.save();
};

export const getAllGroups = (userId) =>
  Group.find({ members: userId }).populate('members', 'username email').populate('createdBy', 'username');

export const getGroupById = (id) =>
  Group.findById(id)
    .populate('members', 'username email')
    .populate('createdBy', 'username email');

export const updateGroup = async (id, { name, addMemberIds = [] }) => {
  const update = {};
  if (name) update.name = name;

  if (addMemberIds && addMemberIds.length > 0) {
    // validate member ids exist
    const validIds = addMemberIds.filter((m) => mongoose.isValidObjectId(m));
    if (validIds.length !== addMemberIds.length) throw new Error('One or more addMemberIds invalid');

    const usersCount = await User.countDocuments({ _id: { $in: addMemberIds } });
    if (usersCount !== addMemberIds.length) throw new Error('One or more members to add do not exist');

    // use $addToSet to avoid duplicates
    return Group.findByIdAndUpdate(
      id,
      { ...(update.name ? { name: update.name } : {}), $addToSet: { members: { $each: addMemberIds } } },
      { new: true }
    ).populate('members', 'username email').populate('createdBy', 'username email');
  }

  return Group.findByIdAndUpdate(id, update, { new: true }).populate('members', 'username email').populate('createdBy', 'username email');
};

export const deleteGroup = async (id) => {
  await Expense.deleteMany({ groupId: id });
  await Settlement.deleteMany({ groupId: id });
  return Group.findByIdAndDelete(id);
};