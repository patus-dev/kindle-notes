const express = require('express');
const cors = require('cors')
const fs = require('fs');
const os = require('os');
const path = require('path'); 

// Server config
const app = express();
const PORT = process.env.PORT || 3000;

// Data files
const DATA_PATH = path.join(__dirname,'data');
const NOTES_FILE = path.join(DATA_PATH, 'notes.json');
const TRASH_FILE = path.join(DATA_PATH, 'trash.json');

// Notes config
const MAX_TEXT_LENGTH = 160;
const TRASH_DAYS = 1;
const DAY_TO_MS = 24 * 60 * 60 * 1000;

// Create data folder if it doesn't exist
fs.mkdirSync(DATA_PATH, { recursive: true });
[NOTES_FILE, TRASH_FILE].forEach(function (file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});

// Read/write json
function read(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return []; 
  }
}

function write(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function parseNoteText(text) {
  return String(text === undefined || text === null ? '' : text).slice(0, MAX_TEXT_LENGTH);
}

function cleanTrash() {
  const today = Date.now();
  const trash = read(TRASH_FILE);
  const valid = trash.filter(function (n) {
    return today - n.deleteAt > 0; // deleteAt is in the past
  });
  if (valid.length !== trash.length) write(TRASH_FILE, valid);
}
setInterval(cleanTrash, DAY_TO_MS / 2); // every half day

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Express middlewares
app.use(cors())
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', function (req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
});

// Uncomment to log requests
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   next();
// });

app.get('/health', function (req, res) {
  res.json({ ok: true });
});

// Notes routes
app.get('/api/notes', function (req, res) {
  res.json(read(NOTES_FILE))
});

app.post('/api/notes', function (req, res) {
  const notes = read(NOTES_FILE);
  const note = {
    id: genId(),
    text: parseNoteText(req.body.text)
  };
  notes.push(note);
  write(NOTES_FILE, notes);
  res.status(201).json(note);
});

app.put('/api/notes/:id', function (req, res) {
  const notes = read(NOTES_FILE);
  const note = notes.find(function (n) { return n.id === req.params.id; });
  if (!note) return res.status(404).json({ error: 'Not found' });

  note.text = parseNoteText(req.body.text);
  write(NOTES_FILE, notes);
  res.json(note);
});

app.delete('/api/notes/:id', function (req, res) {
  const notes = read(NOTES_FILE);
  const note = notes.find(function (n) { return n.id === req.params.id; });
  if (!note) return res.status(404).json({ error: 'Not found' });

  const trash = read(TRASH_FILE);
  trash.push({
    id: note.id,
    text: note.text,
    deleteAt: Date.now() + DAY_TO_MS * TRASH_DAYS
  });
  write(TRASH_FILE, trash);
  write(NOTES_FILE, notes.filter(function (n) { return n.id !== note.id; }));
  res.json({ ok: true });
});

// Trash routes
app.get('/api/trash', function (req, res) {
  res.json(read(TRASH_FILE));
});

app.post('/api/trash/:id/restore', function (req, res) {
  const trash = read(TRASH_FILE);
  const item = trash.find(function (n) { return n.id === req.params.id; });
  if (!item) return res.status(404).json({ error: 'Not found' });

  const notes = read(NOTES_FILE);
  let note = notes.find(function (n) { return n.id === item.id; });
  if (!note) {
    note = { 
      id: item.id, 
      text: item.text
    };
    notes.push(note);
    write(NOTES_FILE, notes);
  }
  write(TRASH_FILE, trash.filter(function (n) { return n.id !== item.id; }));
  res.json(note);
});

app.delete('/api/trash/:id', function (req, res) {
  const trash = read(TRASH_FILE);
  const item = trash.find(function (n) { return n.id === req.params.id; });
  if (!item) return res.status(404).json({ error: 'Not found' });

  write(TRASH_FILE, trash.filter(function (n) { return n.id !== item.id; }));
  res.json({ ok: true });
});

// Start server
app.listen(PORT, '0.0.0.0', function () {
  console.log('Server running! Open in Kindle (or any network device):');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(function (nome) {
    interfaces[nome].forEach(function (i) {
      if (i.family === 'IPv4' && !i.internal) {
        console.log('  http://' + i.address + ':' + PORT);
      }
    });
  });
  console.log('Trash keeps notes for ' + TRASH_DAYS + ' days.');
});