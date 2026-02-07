import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const router = express.Router();

const users = new Map();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (users.has(email)) {
      return res.status(409).json({ error: 'User already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: nanoid(), email, passwordHash, channelName: email.split('@')[0] };
    users.set(email, user);

    res.status(201).json({ id: user.id, email: user.email, channelName: user.channelName });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'dev-secret', {
      expiresIn: '8h'
    });
    res.json({ token, user: { id: user.id, email: user.email, channelName: user.channelName } });
  } catch (err) {
    next(err);
  }
});

export default router;
