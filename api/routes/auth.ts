import express from 'express';
import bcrypt from 'bcryptjs';
import { dbOps, rowToUser } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, phone } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  const existingUser = await dbOps.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    return res.status(400).json({ success: false, error: '该邮箱已被注册' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = await dbOps.run(`
    INSERT INTO users (username, email, password_hash, phone)
    VALUES (?, ?, ?, ?)
  `, [username, email, passwordHash, phone || null]);
  const userId = result.lastID as number;

  req.session.userId = userId;

  const userRow = await dbOps.get('SELECT * FROM users WHERE id = ?', [userId]);
  const user = rowToUser(userRow);

  res.json({ success: true, data: user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: '请填写邮箱和密码' });
  }

  const userRow = await dbOps.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!userRow) {
    return res.status(401).json({ success: false, error: '邮箱或密码错误' });
  }

  const user = rowToUser(userRow);

  if (!bcrypt.compareSync(password, userRow.password_hash)) {
    return res.status(401).json({ success: false, error: '邮箱或密码错误' });
  }

  if (user?.isFrozen) {
    return res.status(401).json({ success: false, error: '账户已被冻结，请联系管理员' });
  }

  req.session.userId = user!.id;

  res.json({ success: true, data: user });
});

router.post('/logout', async (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json({ success: true, data: user });
});

export default router;
