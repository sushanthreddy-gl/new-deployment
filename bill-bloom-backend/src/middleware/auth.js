import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('No token provided, authorization denied');
      err.status = 401;
      return next(err);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      const err = new Error('User not found');
      err.status = 401;
      return next(err);
    }

    req.user = user;
    next();
  } catch (err) {
    err.status = 401;
    next(err);
  }
};

export default auth;
