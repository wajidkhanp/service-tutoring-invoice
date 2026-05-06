const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

console.log(`[storage] DATA_DIR: ${DATA_DIR}`);
try {
  const stat = fs.statSync(DATA_DIR);
  console.log(`[storage] DATA_DIR exists, isDirectory=${stat.isDirectory()}`);
  const files = fs.readdirSync(DATA_DIR);
  files.forEach((f) => {
    const s = fs.statSync(path.join(DATA_DIR, f));
    console.log(`[storage]   ${f} — ${s.size} bytes`);
  });
} catch {
  console.log('[storage] DATA_DIR does not exist yet (will be created on first write)');
}

const DEFAULTS = {
  'invoices.json':     [],
  'students.json':     [],
  'audit.json':        [],
  'attendance.json':   {},
  'daily_progress.json': {},
  'reportcards.json':  [],
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
  const data = JSON.parse(raw);
  if (Array.isArray(data)) console.log(`[storage] read ${filename} (${data.length} items)`);
  return data;
}

function writeJson(filename, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  const count = Array.isArray(data) ? `${data.length} items` : 'object';
  console.log(`[storage] wrote ${filepath} (${count})`);
}

module.exports = { readJson, writeJson };
