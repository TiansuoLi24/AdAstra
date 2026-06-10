const { Router } = require('express');
const crypto = require('crypto');
const { getDb, saveDb } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = Router();

const defaultTasks = {
  id: 'root',
  label: '',
  status: 'pending',
  children: [],
};

// All routes require auth
router.use(verifyToken);

// GET /api/maps — list all maps (without tasks for list view)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const results = db.exec(
      'SELECT id, name, created_at, updated_at FROM star_maps WHERE user_id = ? ORDER BY created_at ASC',
      [req.user.userId]
    );
    const maps = (results.length > 0 ? results[0].values : []).map((row) => ({
      id: row[0],
      name: row[1],
      createdAt: row[2],
      updatedAt: row[3],
    }));
    res.json({ maps });
  } catch (err) {
    console.error('List maps error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/maps/:id — get single map with full tasks
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const results = db.exec(
      'SELECT id, name, tasks_json, created_at, updated_at FROM star_maps WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (results.length === 0 || results[0].values.length === 0) {
      return res.status(404).json({ error: '星图不存在' });
    }
    const row = results[0].values[0];
    res.json({
      map: {
        id: row[0],
        name: row[1],
        tasks: JSON.parse(row[2]),
        createdAt: row[3],
        updatedAt: row[4],
      },
    });
  } catch (err) {
    console.error('Get map error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/maps — create a new map
router.post('/', async (req, res) => {
  try {
    const { name, tasks } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '星图名称不能为空' });
    }

    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const tasksData = tasks && typeof tasks === 'object' ? tasks : { ...defaultTasks, label: name.trim() };

    db.run(
      'INSERT INTO star_maps (id, user_id, name, tasks_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.userId, name.trim(), JSON.stringify(tasksData), now, now]
    );
    saveDb();

    res.status(201).json({ map: { id, name: name.trim(), createdAt: now, updatedAt: now } });
  } catch (err) {
    console.error('Create map error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/maps/:id — update a map (name and/or tasks)
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const existing = db.exec(
      'SELECT id FROM star_maps WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ error: '星图不存在' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updates = [];
    const params = [];

    if (req.body.name !== undefined) {
      updates.push('name = ?');
      params.push(req.body.name);
    }
    if (req.body.tasks !== undefined) {
      updates.push('tasks_json = ?');
      params.push(JSON.stringify(req.body.tasks));
    }
    updates.push('updated_at = ?');
    params.push(now);
    params.push(req.params.id, req.user.userId);

    if (updates.length > 1) {
      db.run(
        `UPDATE star_maps SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );
      saveDb();
    }

    res.json({ updatedAt: now });
  } catch (err) {
    console.error('Update map error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/maps/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.run(
      'DELETE FROM star_maps WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    saveDb();
    if (result.changes === 0) {
      return res.status(404).json({ error: '星图不存在' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete map error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/maps/sync — bulk sync: replace all maps for the user
router.post('/sync', async (req, res) => {
  try {
    const { maps } = req.body;
    if (!Array.isArray(maps)) {
      return res.status(400).json({ error: '数据格式不正确' });
    }

    const db = await getDb();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Delete all existing maps for this user
    db.run('DELETE FROM star_maps WHERE user_id = ?', [req.user.userId]);

    // Insert all maps
    const insertStmt = db.prepare(
      'INSERT INTO star_maps (id, user_id, name, tasks_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const map of maps) {
      const tasksData = map.tasks && typeof map.tasks === 'object' ? map.tasks : { ...defaultTasks, label: map.name };
      insertStmt.run([
        map.id,
        req.user.userId,
        map.name,
        JSON.stringify(tasksData),
        map.createdAt || now,
        map.updatedAt || now,
      ]);
    }

    saveDb();
    res.json({ synced: maps.length });
  } catch (err) {
    console.error('Sync maps error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
