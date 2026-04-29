const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '../config/users.json');

function loadUsers() {
  const raw = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(raw);
}

function findUser(id) {
  return loadUsers().find((u) => u.id === id) || null;
}

async function verifyPassword(id, password) {
  const user = findUser(id);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;
  return { id: user.id, name: user.name, role: user.role };
}

module.exports = { findUser, verifyPassword };
