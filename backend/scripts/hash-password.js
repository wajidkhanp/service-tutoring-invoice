#!/usr/bin/env node
// Usage: node scripts/hash-password.js <password>
// Outputs a bcrypt hash to paste into src/config/users.json
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
