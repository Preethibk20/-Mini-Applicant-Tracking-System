const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const dir = process.env.DB_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, 'ats.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL,
  skills TEXT DEFAULT '',
  experience REAL DEFAULT 0,
  resume_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Applied',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cand_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_cand_role ON candidates(role);
CREATE INDEX IF NOT EXISTS idx_hist_cand ON stage_history(candidate_id);
`);

try {
  db.exec(`ALTER TABLE candidates ADD COLUMN rating REAL DEFAULT 4.0`);
} catch (e) {}

function seed() {
  const { n } = db.prepare('SELECT COUNT(*) n FROM candidates').get();
  if (n > 0) return;

  const first = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Karthik', 'Meera', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Ishita', 'Nikhil', 'Pooja', 'Siddharth', 'Neha', 'Aditya', 'Riya', 'Manish', 'Divya', 'Harsh', 'Tanvi', 'Varun', 'Shreya'];
  const last = ['Sharma', 'Iyer', 'Reddy', 'Nair', 'Gowda', 'Patel', 'Menon', 'Rao', 'Kulkarni', 'Singh', 'Bhat', 'Joshi'];
  const roles = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Analyst', 'UI/UX Designer', 'QA Engineer'];
  const skillSets = {
    'Frontend Developer': 'React, TypeScript, CSS, Next.js',
    'Backend Developer': 'Node.js, PostgreSQL, Docker, REST',
    'Full Stack Developer': 'React, Node.js, MongoDB, AWS',
    'Data Analyst': 'SQL, Python, Tableau, Excel',
    'UI/UX Designer': 'Figma, Prototyping, Research, Design Systems',
    'QA Engineer': 'Selenium, Cypress, Jest, API Testing'
  };
  const flows = {
    Applied: ['Applied'],
    Screening: ['Applied', 'Screening'],
    Interview: ['Applied', 'Screening', 'Interview'],
    Offer: ['Applied', 'Screening', 'Interview', 'Offer'],
    Hired: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'],
    Rejected: ['Applied', 'Screening', 'Rejected']
  };
  const stageOrder = ['Applied', 'Applied', 'Applied', 'Screening', 'Screening', 'Interview', 'Interview', 'Offer', 'Hired', 'Rejected', 'Rejected'];

  let s = 42;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const DAY = 86400000;

  const insC = db.prepare(`INSERT INTO candidates (name,email,phone,role,skills,experience,resume_url,notes,stage,created_at,updated_at)
    VALUES (@name,@email,@phone,@role,@skills,@experience,@resume_url,@notes,@stage,@created_at,@updated_at)`);
  const insH = db.prepare('INSERT INTO stage_history (candidate_id,from_stage,to_stage,changed_at) VALUES (?,?,?,?)');

  db.transaction(() => {
    first.forEach((f, i) => {
      const l = last[(i * 5) % last.length];
      const role = roles[i % roles.length];
      const stage = pick(stageOrder);
      const flow = flows[stage];
      const created = Date.now() - Math.floor(rnd() * 25 * DAY) - DAY / 2;
      const step = Math.max(1, (Date.now() - created) / (flow.length + 1));
      const id = insC.run({
        name: `${f} ${l}`,
        email: `${f}.${l}${i}@example.com`.toLowerCase(),
        phone: `+91 9${String(Math.floor(rnd() * 1e9)).padStart(9, '0')}`,
        role,
        skills: skillSets[role],
        experience: Math.round(rnd() * 60) / 10,
        resume_url: '',
        notes: '',
        stage,
        created_at: new Date(created).toISOString(),
        updated_at: new Date(created + step * (flow.length - 1)).toISOString()
      }).lastInsertRowid;
      flow.forEach((st, k) => insH.run(id, k === 0 ? null : flow[k - 1], st, new Date(created + step * k).toISOString()));
    });
  })();
}

module.exports = { db, STAGES, seed };
