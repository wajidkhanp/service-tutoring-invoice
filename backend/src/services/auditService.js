const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('./storageService');

const MAX_EVENTS = 100;

function appendEvent(event, description, userEmail) {
  const events = readJson('audit.json');
  const entry = {
    id: uuidv4(),
    event,
    description,
    user: userEmail || 'system',
    timestamp: new Date().toISOString(),
  };
  events.unshift(entry);
  if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
  writeJson('audit.json', events);
  return entry;
}

function getRecent(n = 5) {
  return readJson('audit.json').slice(0, n);
}

function getAll() {
  return readJson('audit.json');
}

module.exports = { appendEvent, getRecent, getAll };
