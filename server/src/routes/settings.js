const { Router } = require('express');
const { getDb, saveDb } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = Router();

// All routes require auth
router.use(verifyToken);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const results = db.exec(
      'SELECT settings_json, updated_at FROM user_settings WHERE user_id = ?',
      [req.user.userId]
    );
    if (results.length === 0 || results[0].values.length === 0) {
      return res.json({ settings: {} });
    }
    const row = results[0].values[0];
    res.json({
      settings: JSON.parse(row[0]),
      updatedAt: row[1],
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/settings — upsert user settings
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: '设置数据格式不正确' });
    }

    const db = await getDb();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const existing = db.exec('SELECT user_id FROM user_settings WHERE user_id = ?', [req.user.userId]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(
        'UPDATE user_settings SET settings_json = ?, updated_at = ? WHERE user_id = ?',
        [JSON.stringify(settings), now, req.user.userId]
      );
    } else {
      db.run(
        'INSERT INTO user_settings (user_id, settings_json, updated_at) VALUES (?, ?, ?)',
        [req.user.userId, JSON.stringify(settings), now]
      );
    }

    saveDb();
    res.json({ updatedAt: now });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
