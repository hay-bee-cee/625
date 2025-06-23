const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const PORT = 3000;

// Setup SQLite database
const db = new sqlite3.Database('./users.db');

// Create users table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`);

// Create portfolio table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  image_path TEXT
)`);

// Create web_templates table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS web_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT,
  file_path TEXT
)`);

// Add a test user if not exists
const testUser = { username: 'admin', password: 'password123' };
db.get('SELECT * FROM users WHERE username = ?', [testUser.username], async (err, row) => {
  if (!row) {
    const hash = await bcrypt.hash(testUser.password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [testUser.username, hash]);
  }
});


app.use('/pictures', express.static('pictures'));
app.use(cors());
app.use(express.json());

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      res.json({ success: true, message: 'Login successful!' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// Registration endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (user) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Registration failed' });
      }
      res.json({ success: true, message: 'Registration successful!' });
    });
  });
});

// Get portfolio items
app.get('/portfolio', (req, res) => {
  db.all('SELECT * FROM portfolio', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch portfolio' });
    }
    res.json({ success: true, portfolio: rows });
  });
});

// Get web templates
app.get('/web-templates', (req, res) => {
  db.all('SELECT * FROM web_templates', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch web templates' });
    }
    res.json({ success: true, templates: rows });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});