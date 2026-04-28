const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../services/storageService');
const requireAuth = require('../middleware/requireAuth');
const { appendEvent } = require('../services/auditService');

const router = express.Router();
const STUDENTS_FILE = 'students.json';

function loadStudents() {
  return readJson(STUDENTS_FILE);
}

function saveStudents(students) {
  writeJson(STUDENTS_FILE, students);
}

router.use(requireAuth);

router.get('/', (req, res) => {
  const students = loadStudents();
  res.json({ students });
});

router.post('/', (req, res) => {
  const { name, email, rate, notes, address, grade, joinDate } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const students = loadStudents();
  const student = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim(),
    rate: Number(rate) || 0,
    notes: notes?.trim() || '',
    address: address?.trim() || '',
    grade: grade?.trim() || '',
    joinDate: joinDate || null,
    createdAt: new Date().toISOString(),
  };

  students.push(student);
  saveStudents(students);
  appendEvent('student:create', `${req.user.email} added student ${student.name}`, req.user.email);

  res.status(201).json({ student });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, rate, notes, address, grade, joinDate } = req.body;
  const students = loadStudents();
  const index = students.findIndex((student) => student.id === id);
  if (index === -1) return res.status(404).json({ error: 'Student not found' });

  students[index] = {
    ...students[index],
    name: name?.trim() || students[index].name,
    email: email?.trim() || students[index].email,
    rate: rate !== undefined ? Number(rate) : students[index].rate,
    notes: notes !== undefined ? notes.trim() : students[index].notes,
    address: address !== undefined ? address.trim() : students[index].address,
    grade: grade !== undefined ? grade.trim() : students[index].grade,
    joinDate: joinDate !== undefined ? (joinDate || null) : students[index].joinDate,
    updatedAt: new Date().toISOString(),
  };

  saveStudents(students);
  appendEvent('student:update', `${req.user.email} updated student ${students[index].name}`, req.user.email);
  res.json({ student: students[index] });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const students = loadStudents();
  const index = students.findIndex((student) => student.id === id);
  if (index === -1) return res.status(404).json({ error: 'Student not found' });

  const [removed] = students.splice(index, 1);
  saveStudents(students);
  appendEvent('student:delete', `${req.user.email} removed student ${removed.name}`, req.user.email);
  res.json({ success: true });
});

module.exports = router;
