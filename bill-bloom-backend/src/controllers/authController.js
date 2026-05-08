import jwt from 'jsonwebtoken';
import { findByEmail, findByUsername, createUser, comparePassword } from '../services/authService.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'username, email and password are required' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'password must be at least 6 characters' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'invalid email' });
  }

  try {
    const existingEmail = await findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: 'email already in use' });
    }
    const existingUsername = await findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ message: 'username already in use' });
    }

    const user = await createUser({ username, email, password });

    return res.status(201).json({
      message: 'user created',
      user: { id: user._id, username: user.username, email: user.email, createdAt: user.createdAt }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const token = generateToken(user._id);

    return res.json({
      message: 'login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res) => {
  const { _id, username, email } = req.user;
  return res.json({ user: { id: _id, username, email } });
};