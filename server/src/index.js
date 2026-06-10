const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const authRoutes = require('./routes/auth');
const mapsRoutes = require('./routes/maps');
const settingsRoutes = require('./routes/settings');

async function main() {
  // Initialize database before starting server
  await getDb();

  const app = express();
  const PORT = process.env.SERVER_PORT || 3001;

  app.use(cors({ origin: 'http://localhost:3000' }));
  app.use(express.json({ limit: '5mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/maps', mapsRoutes);
  app.use('/api/settings', settingsRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(PORT, () => {
    console.log(`Auth server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
