const { Router } = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { validateEmail, validatePassword, validateName, sanitizeUser } = require('../utils/validation');

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const nameResult = validateName(name);
    if (!nameResult.valid) {
      return res.status(400).json({ error: nameResult.error });
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      return res.status(400).json({ error: emailResult.error });
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      return res.status(400).json({ error: passwordResult.error });
    }

    // Check for duplicate email
    const db = await getDb();
    const existing = db.exec('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);
    const role = 'user';

    db.run(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), email.trim(), passwordHash, role]
    );
    saveDb();

    const result = db.exec('SELECT * FROM users WHERE id = ?', [id]);
    const row = result[0].values[0];
    const user = {
      id: row[0],
      name: row[1],
      email: row[2],
      role: row[4],
      created_at: row[6],
    };

    const token = jwt.sign({ userId: id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      return res.status(400).json({ error: emailResult.error });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: '密码不能为空' });
    }

    const db = await getDb();
    const results = db.exec('SELECT * FROM users WHERE email = ?', [email.trim()]);
    if (results.length === 0 || results[0].values.length === 0) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const row = results[0].values[0];
    const user = {
      id: row[0],
      name: row[1],
      email: row[2],
      password_hash: row[3],
      role: row[4],
      created_at: row[6],
    };

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const results = db.exec('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (results.length === 0 || results[0].values.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const row = results[0].values[0];
    const user = {
      id: row[0],
      name: row[1],
      email: row[2],
      role: row[4],
      created_at: row[6],
    };

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
