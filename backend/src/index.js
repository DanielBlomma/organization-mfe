const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3045;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'organizations.db');
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const MFE_HOST_API_URL = process.env.MFE_HOST_API_URL || 'http://localhost:3041';
const MFE_ADMIN_TOKEN = process.env.MFE_ADMIN_TOKEN || '';
const MFE_ENTRY_URL = process.env.MFE_ENTRY_URL || 'http://localhost:3044/assets/remoteEntry.js';

app.use(cors());
app.use(express.json());

// Ensure data dir exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// DB setup
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    org_number TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    zip TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    website TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT NULL
  )
`);

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /organizations
app.get('/organizations', auth, (req, res) => {
  const tenantId = req.user.tenantId;
  const orgs = db.prepare('SELECT * FROM organizations WHERE tenant_id = ? ORDER BY name').all(tenantId);
  res.json({ organizations: orgs });
});

// GET /organizations/:id
app.get('/organizations/:id', auth, (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenantId);
  if (!org) return res.status(404).json({ error: 'Not found' });
  res.json(org);
});

// POST /organizations
app.post('/organizations', auth, (req, res) => {
  const { name, org_number, address, city, zip, phone, email, website, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Namn krävs' });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO organizations (id, tenant_id, name, org_number, address, city, zip, phone, email, website, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.tenantId, name.trim(), org_number || '', address || '', city || '', zip || '', phone || '', email || '', website || '', description || '');
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
  res.status(201).json(org);
});

// PUT /organizations/:id
app.put('/organizations/:id', auth, (req, res) => {
  const existing = db.prepare('SELECT * FROM organizations WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenantId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, org_number, address, city, zip, phone, email, website, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Namn krävs' });
  db.prepare(`
    UPDATE organizations SET name=?, org_number=?, address=?, city=?, zip=?, phone=?, email=?, website=?, description=?, updated_at=datetime('now')
    WHERE id=? AND tenant_id=?
  `).run(name.trim(), org_number || '', address || '', city || '', zip || '', phone || '', email || '', website || '', description || '', req.params.id, req.user.tenantId);
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  res.json(org);
});

// DELETE /organizations/:id
app.delete('/organizations/:id', auth, (req, res) => {
  const existing = db.prepare('SELECT * FROM organizations WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenantId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM organizations WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenantId);
  res.json({ ok: true });
});

// Auto-register with MFE-Host
async function autoRegister() {
  if (!MFE_ADMIN_TOKEN) {
    console.log('No MFE_ADMIN_TOKEN set, skipping auto-registration');
    return;
  }
  try {
    const res = await fetch(`${MFE_HOST_API_URL}/api/admin/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': MFE_ADMIN_TOKEN,
      },
      body: JSON.stringify({
        name: 'Organisation',
        description: 'Organisation MFE - hantera företagsinformation',
        scope: 'organizationMfe',
        module: './App',
        entry_url: MFE_ENTRY_URL,
        icon: '🏢',
        route: '/organization',
      }),
    });
    if (res.ok) {
      console.log('✅ Auto-registered with MFE-Host');
    } else {
      const body = await res.text();
      console.log('Auto-registration response:', res.status, body);
    }
  } catch (e) {
    console.log('Auto-registration failed (host may not be ready):', e.message);
  }
}

app.listen(PORT, () => {
  console.log(`🏢 Organization MFE Backend running on port ${PORT}`);
  autoRegister();
});
