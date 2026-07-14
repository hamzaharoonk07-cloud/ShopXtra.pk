const bcrypt = require('bcrypt');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

async function create({ name, email, password, phone }) {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, role, created_at`,
    [name, email, password_hash, phone || null]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

async function updateProfile(id, { name, phone }) {
  const { rows } = await pool.query(
    `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone)
     WHERE id = $1
     RETURNING id, name, email, phone, role, created_at`,
    [id, name, phone]
  );
  return rows[0];
}

async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function setRole(id, role) {
  const { rows } = await pool.query(
    'UPDATE users SET role = $2 WHERE id = $1 RETURNING id, name, email, phone, role, created_at',
    [id, role]
  );
  return rows[0] || null;
}

module.exports = { create, findByEmail, findById, verifyPassword, findAll, setRole, updateProfile };
