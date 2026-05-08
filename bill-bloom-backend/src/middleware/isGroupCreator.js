import Group from '../models/Group.js';

const isGroupCreator = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) {
      const err = new Error('Group not found');
      err.status = 404;
      return next(err);
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      const err = new Error('Access denied: only the group creator can perform this action');
      err.status = 403;
      return next(err);
    }

    next();
  } catch (err) {
    err.status = 500;
    next(err);
  }
};

export default isGroupCreator;
