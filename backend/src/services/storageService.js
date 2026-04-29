const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

const DEFAULTS = {
  'invoices.json': [],
  'students.json': [],
  'audit.json':    [],
  'config.json': {
    nextInvoiceNumber: 1000,
    organizationName: 'Noor Tutoring',
    operatedBy: 'Momin Services of Arizona (Nonprofit)',
    address: '55 North Matlock Street, Mesa, AZ 85203',
    phone: '(602) 816-7428',
    orgEmail: 'info@noortutoring.com',
    ein: '20-1330259',
    representative: 'Tariq Khalil',
  },
};

function ensureFile(filename) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(DEFAULTS[filename] ?? [], null, 2), 'utf8');
  }
}

function readJson(filename) {
  ensureFile(filename);
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
  return JSON.parse(raw);
}

function writeJson(filename, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJson, writeJson };
