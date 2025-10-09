import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  getEvaluationById,
  upsertEvaluation,
  setEvaluationStatus,
  ensureStorageReady
} from './storage/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static serving of uploaded files
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = uuidv4();
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${unique}_${safeOriginal}`);
  }
});
const upload = multer({ storage });

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileId = path.basename(req.file.filename);
  const url = `/uploads/${fileId}`;
  res.json({ fileId, url, originalname: req.file.originalname, mimetype: req.file.mimetype });
});

// Create or update evaluation
app.post('/api/evaluations', async (req, res) => {
  try {
    const { id, fileId, marksByQuestion, maxMarksByQuestion, status } = req.body || {};
    if (!fileId && !id) {
      return res.status(400).json({ error: 'fileId or id is required' });
    }
    const evaluationId = id || uuidv4();
    const evaluation = await upsertEvaluation({
      id: evaluationId,
      fileId,
      marksByQuestion: marksByQuestion || {},
      maxMarksByQuestion: maxMarksByQuestion || {},
      status: status || 'in_progress'
    });
    res.json(evaluation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
});

// Get evaluation by id
app.get('/api/evaluations/:id', async (req, res) => {
  try {
    const evaluation = await getEvaluationById(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Not found' });
    res.json(evaluation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load evaluation' });
  }
});

// Complete evaluation
app.post('/api/evaluations/:id/complete', async (req, res) => {
  try {
    const evaluation = await setEvaluationStatus(req.params.id, 'completed');
    if (!evaluation) return res.status(404).json({ error: 'Not found' });
    res.json(evaluation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete evaluation' });
  }
});

// Reject evaluation
app.post('/api/evaluations/:id/reject', async (req, res) => {
  try {
    const evaluation = await setEvaluationStatus(req.params.id, 'rejected');
    if (!evaluation) return res.status(404).json({ error: 'Not found' });
    res.json(evaluation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject evaluation' });
  }
});

// Ensure storage file exists then start
ensureStorageReady().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});




