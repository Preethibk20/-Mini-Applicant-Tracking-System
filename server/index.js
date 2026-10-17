const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, STAGES, seed } = require('./db');

seed();
const app = express();
app.use(express.json({ limit: '100kb' }));

const now = () => new Date().toISOString();
const SORTS = { created_at: 'created_at', updated_at: 'updated_at', name: 'name COLLATE NOCASE', experience: 'experience', stage: 'stage', role: 'role' };

function clean(body, { requireAll }) {
  const errors = {};
  const out = {};
  const str = (k, max = 200) => (body[k] == null ? '' : String(body[k]).trim().slice(0, max));

  if (requireAll || 'name' in body) {
    out.name = str('name', 100);
    if (!out.name) errors.name = 'Name is required';
  }
  if (requireAll || 'email' in body) {
    out.email = str('email', 150).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) errors.email = 'Enter a valid email';
  }
  if (requireAll || 'role' in body) {
    out.role = str('role', 100);
    if (!out.role) errors.role = 'Role is required';
  }
  if ('phone' in body) out.phone = str('phone', 30);
  if ('skills' in body) out.skills = str('skills', 300);
  if ('notes' in body) out.notes = str('notes', 2000);
  if ('resume_url' in body) {
    out.resume_url = str('resume_url', 300);
    if (out.resume_url && !/^https?:\/\//i.test(out.resume_url)) errors.resume_url = 'Resume link must start with http(s)://';
  }
  if ('experience' in body) {
    const n = Number(body.experience || 0);
    if (!Number.isNaN(n) && n < 0 || n > 60) errors.experience = 'Experience must be between 0 and 60 years';
    out.experience = n;
  }
  if ('rating' in body) {
    const n = Number(body.rating || 0);
    if (!Number.isNaN(n) && n >= 0 && n <= 5) out.rating = n;
  }
  if ('stage' in body && body.stage !== undefined) {
    if (!STAGES.includes(body.stage)) errors.stage = 'Invalid stage';
    out.stage = body.stage;
  }
  return { out, errors };
}

const bad = (res, errors) => res.status(400).json({ error: Object.values(errors)[0], errors });

// ---- candidates: list with search / filter / sort / pagination
app.get('/api/candidates', (req, res) => {
  const { q = '', stage = '', role = '', sort = 'created_at', order = 'desc' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 10));

  const where = [];
  const params = {};
  if (q.trim()) {
    where.push('(name LIKE @q OR email LIKE @q OR skills LIKE @q OR role LIKE @q)');
    params.q = `%${q.trim()}%`;
  }
  if (stage && STAGES.includes(stage)) { where.push('stage = @stage'); params.stage = stage; }
  if (role) { where.push('role = @role'); params.role = role; }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const col = SORTS[sort] || SORTS.created_at;
  const dir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) n FROM candidates ${w}`).get(params).n;
  const items = db.prepare(`SELECT * FROM candidates ${w} ORDER BY ${col} ${dir}, id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset: (page - 1) * limit });
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

app.get('/api/roles', (_req, res) => {
  res.json(db.prepare('SELECT DISTINCT role FROM candidates ORDER BY role').all().map((r) => r.role));
});

app.get('/api/stages', (_req, res) => res.json(STAGES));

app.get('/api/candidates/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Candidate not found' });
  c.history = db.prepare('SELECT * FROM stage_history WHERE candidate_id = ? ORDER BY changed_at DESC, id DESC').all(c.id);
  res.json(c);
});

app.post('/api/candidates', (req, res) => {
  const { out, errors } = clean(req.body || {}, { requireAll: true });
  if (Object.keys(errors).length) return bad(res, errors);
  if (db.prepare('SELECT 1 FROM candidates WHERE email = ?').get(out.email))
    return res.status(409).json({ error: 'A candidate with this email already exists', errors: { email: 'Email already exists' } });

  const t = now();
  const row = { phone: '', skills: '', experience: 0, resume_url: '', notes: '', rating: 4, stage: 'Applied', ...out, created_at: t, updated_at: t };
  const id = db.transaction(() => {
    const newId = db.prepare(`INSERT INTO candidates (name,email,phone,role,skills,experience,resume_url,notes,rating,stage,created_at,updated_at)
      VALUES (@name,@email,@phone,@role,@skills,@experience,@resume_url,@notes,@rating,@stage,@created_at,@updated_at)`).run(row).lastInsertRowid;
    db.prepare('INSERT INTO stage_history (candidate_id,from_stage,to_stage,changed_at) VALUES (?,?,?,?)').run(newId, null, row.stage, t);
    return newId;
  })();
  res.status(201).json(db.prepare('SELECT * FROM candidates WHERE id = ?').get(id));
});

app.put('/api/candidates/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Candidate not found' });
  const body = { ...(req.body || {}) };
  delete body.stage; // stage changes go through PATCH /stage so history is logged
  const { out, errors } = clean(body, { requireAll: false });
  if (Object.keys(errors).length) return bad(res, errors);
  if (out.email && db.prepare('SELECT 1 FROM candidates WHERE email = ? AND id != ?').get(out.email, existing.id))
    return res.status(409).json({ error: 'A candidate with this email already exists', errors: { email: 'Email already exists' } });

  const merged = { rating: 4, ...existing, ...out, updated_at: now() };
  db.prepare(`UPDATE candidates SET name=@name,email=@email,phone=@phone,role=@role,skills=@skills,experience=@experience,
    resume_url=@resume_url,notes=@notes,rating=@rating,updated_at=@updated_at WHERE id=@id`).run(merged);
  res.json(db.prepare('SELECT * FROM candidates WHERE id = ?').get(existing.id));
});

app.patch('/api/candidates/:id/stage', (req, res) => {
  const { stage } = req.body || {};
  if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
  const c = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Candidate not found' });
  if (c.stage !== stage) {
    const t = now();
    db.transaction(() => {
      db.prepare('UPDATE candidates SET stage = ?, updated_at = ? WHERE id = ?').run(stage, t, c.id);
      db.prepare('INSERT INTO stage_history (candidate_id,from_stage,to_stage,changed_at) VALUES (?,?,?,?)').run(c.id, c.stage, stage, t);
    })();
  }
  res.json(db.prepare('SELECT * FROM candidates WHERE id = ?').get(c.id));
});

app.delete('/api/candidates/:id', (req, res) => {
  const r = db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Candidate not found' });
  res.json({ ok: true });
});

// ---- dashboard metrics
app.get('/api/dashboard', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) n FROM candidates').get().n;
  const counts = Object.fromEntries(db.prepare('SELECT stage, COUNT(*) n FROM candidates GROUP BY stage').all().map((r) => [r.stage, r.n]));
  const byStage = STAGES.map((s) => ({ stage: s, count: counts[s] || 0 }));
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const newThisWeek = db.prepare('SELECT COUNT(*) n FROM candidates WHERE created_at >= ?').get(weekAgo).n;
  const hired = counts.Hired || 0;
  const rejected = counts.Rejected || 0;
  const active = total - hired - rejected;
  const byRole = db.prepare(`SELECT role, COUNT(*) total, SUM(stage='Hired') hired FROM candidates GROUP BY role ORDER BY total DESC`).all();

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const n = db.prepare('SELECT COUNT(*) n FROM candidates WHERE substr(created_at,1,10) = ?').get(key).n;
    days.push({ date: key, count: n });
  }

  const recent = db.prepare(`SELECT h.id, h.from_stage, h.to_stage, h.changed_at, c.id candidate_id, c.name, c.role
    FROM stage_history h JOIN candidates c ON c.id = h.candidate_id ORDER BY h.changed_at DESC, h.id DESC LIMIT 8`).all();

  res.json({
    total, active, hired, rejected, newThisWeek, byStage, byRole, last7Days: days, recent,
    conversionRate: total ? Math.round((hired / total) * 1000) / 10 : 0,
    interviewRate: total ? Math.round((((counts.Interview || 0) + (counts.Offer || 0) + hired) / total) * 1000) / 10 : 0
  });
});

app.get('/api/export', (_req, res) => {
  const items = db.prepare('SELECT id, name, email, phone, role, skills, experience, rating, stage, created_at, updated_at FROM candidates ORDER BY created_at DESC').all();
  res.json(items);
});

app.get('/api/export/csv', (req, res) => {
  const { q = '', stage = '', role = '', sort = 'created_at', order = 'desc' } = req.query;
  const where = [];
  const params = {};
  if (q.trim()) {
    where.push('(name LIKE @q OR email LIKE @q OR skills LIKE @q OR role LIKE @q)');
    params.q = `%${q.trim()}%`;
  }
  if (stage && STAGES.includes(stage)) { where.push('stage = @stage'); params.stage = stage; }
  if (role) { where.push('role = @role'); params.role = role; }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const col = SORTS[sort] || SORTS.created_at;
  const dir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const items = db.prepare(`SELECT id, name, email, phone, role, skills, experience, rating, stage, created_at FROM candidates ${w} ORDER BY ${col} ${dir}, id DESC`).all(params);
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Skills', 'Experience (Yrs)', 'Rating', 'Stage', 'Applied At'];
  const rows = items.map(c => [
    c.id,
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.email || '').replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.role || '').replace(/"/g, '""')}"`,
    `"${(c.skills || '').replace(/"/g, '""')}"`,
    c.experience || 0,
    c.rating || 4,
    c.stage,
    c.created_at
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const filename = `candidates_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

app.post('/api/seed/reset', (_req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM stage_history').run();
    db.prepare('DELETE FROM candidates').run();
  })();
  seed();
  res.json({ ok: true, message: 'Database reset to demo state' });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---- serve built frontend
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Mini ATS running on http://localhost:${PORT}`));
