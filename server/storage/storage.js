import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageDir = path.join(__dirname);
const dbFile = path.join(storageDir, 'evaluations.json');
const recordsFile = path.join(storageDir, 'records.json');

export async function ensureStorageReady() {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ evaluations: {} }, null, 2));
  }
  if (!fs.existsSync(recordsFile)) {
    fs.writeFileSync(recordsFile, JSON.stringify({ records: [] }, null, 2));
  }
}

function readDb() {
  const raw = fs.readFileSync(dbFile, 'utf-8');
  return JSON.parse(raw);
}

function readRecords() {
  const raw = fs.readFileSync(recordsFile, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(db) {
  const tmp = dbFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, dbFile);
}

function writeRecords(records) {
  const tmp = recordsFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2));
  fs.renameSync(tmp, recordsFile);
}

export async function getEvaluationById(id) {
  const db = readDb();
  return db.evaluations[id] || null;
}

export async function upsertEvaluation(evaluation) {
  const db = readDb();
  const now = new Date().toISOString();
  const current = db.evaluations[evaluation.id] || {};
  const merged = {
    id: evaluation.id,
    fileId: evaluation.fileId || current.fileId,
    marksByQuestion: { ...(current.marksByQuestion || {}), ...(evaluation.marksByQuestion || {}) },
    maxMarksByQuestion: { ...(current.maxMarksByQuestion || {}), ...(evaluation.maxMarksByQuestion || {}) },
    status: evaluation.status || current.status || 'in_progress',
    updatedAt: now
  };
  db.evaluations[merged.id] = merged;
  writeDb(db);
  return merged;
}

export async function setEvaluationStatus(id, status) {
  const db = readDb();
  const existing = db.evaluations[id];
  if (!existing) return null;
  existing.status = status;
  existing.updatedAt = new Date().toISOString();
  writeDb(db);
  return existing;
}

// Records management functions
export async function getAllRecords() {
  const data = readRecords();
  return data.records || [];
}

export async function addRecord(record) {
  const data = readRecords();
  const newRecord = {
    id: record.id || Date.now().toString(),
    dummyNumber: record.dummyNumber,
    answerScriptFilename: record.answerScriptFilename,
    answerScriptUrl: record.answerScriptUrl,
    totalMarks: record.totalMarks,
    evaluationId: record.evaluationId,
    createdAt: new Date().toISOString()
  };
  data.records.push(newRecord);
  writeRecords(data);
  return newRecord;
}

export async function updateRecord(id, updates) {
  const data = readRecords();
  const recordIndex = data.records.findIndex(r => r.id === id);
  if (recordIndex === -1) return null;
  
  data.records[recordIndex] = {
    ...data.records[recordIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  writeRecords(data);
  return data.records[recordIndex];
}

export async function deleteRecord(id) {
  const data = readRecords();
  const recordIndex = data.records.findIndex(r => r.id === id);
  if (recordIndex === -1) return false;
  
  data.records.splice(recordIndex, 1);
  writeRecords(data);
  return true;
}




