const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('./db');

async function createAdmin() {
  const db = await getDb();

  const crypto = require('crypto');
  const id = crypto.randomUUID();
  const name = 'Administrator';
  const email = 'admin@adastra.com';
  const password = 'admin123';
  const passwordHash = bcrypt.hashSync(password, 10);
  const role = 'admin';

  // Remove existing admin if any
  db.run('DELETE FROM users WHERE email = ?', [email]);

  db.run(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [id, name, email, passwordHash, role]
  );
  saveDb();

  console.log('Admin account created:');
  console.log('  Email:   ', email);
  console.log('  Password:', password);
  console.log('  Role:    ', role);
}

createAdmin().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
