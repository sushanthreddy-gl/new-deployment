import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const findByEmail = (email) => User.findOne({ email });

export const findByUsername = (username) => User.findOne({ username });

export const createUser = async (userData) => {
  const hashed = await bcrypt.hash(userData.password, 10);
  const user = new User({ ...userData, password: hashed });
  return user.save();
};

export const comparePassword = (plain, hashed) => bcrypt.compare(plain, hashed);