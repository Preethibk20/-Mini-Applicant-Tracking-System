# TalentPulse ATS · Modern Applicant Tracking System

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.19-green.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL--Mode-003B57.svg)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A high-performance, modern **Applicant Tracking System (ATS)** built with React 18, Express, and SQLite. Features real-time candidate management, an interactive hiring pipeline Kanban board with drag-and-drop & one-click advance, search & multi-attribute filters, an executive analytics dashboard, dark/light themes, and instant CSV export.

---

## 🚀 Key Features

### 1. 👥 Candidate Management
- **Full Lifecycle Tracking:** Add, edit, review, and delete candidates.
- **Rich Profiles:** Candidate full name, email, phone, target role, years of experience, skill tags, external resume/portfolio links, and interviewer notes.
- **Stage Progression Log:** Complete timestamped audit trail of every stage transition with source and target stages.
- **Duplicate Prevention:** Case-insensitive duplicate email detection.

### 2. 📋 Interactive Hiring Pipeline (Kanban Board)
- **6 Milestones:** `Applied` → `Screening` → `Interview` → `Offer` → `Hired` (or `Rejected`).
- **Flexible Workflow:** Native HTML5 Drag-and-Drop or instant 1-click **"Advance →"** buttons right on each candidate card.
- **Card Badges:** Personalized gradient avatars derived from candidate names, experience pills, skill tags, and stage accent bars.
- **Board Search & Role Filter:** Instant in-board filtering to isolate specific skills or roles without leaving the board.

### 3. 🔍 Search, Filters & Directory
- **Instant Search:** Debounced search matching against Name, Email, Skills, or Role.
- **Multi-Factor Filters:** Filter by Stage, Role, or Sort (Newest, Oldest, Name A–Z, Experience).
- **Server-Side Pagination:** Smooth pagination with configurable limits.
- **1-Click CSV Export:** Export either the entire candidate pool or current filtered view to standard CSV with one click.

### 4. 📊 Executive Dashboard & Metrics
- **KPI Stat Cards:**
  - Total Applicants
  - Active Pipeline (In progress)
  - Interview Conversion Rate (%)
  - Hire Conversion Rate (%)
  - Application Intake (Last 7 Days)
- **Pipeline Funnel Chart:** Visual progress bars with stage percentages and total counts.
- **7-Day Intake Histogram:** Daily application volume bars with weekday markers.
- **Role Breakdown:** Table showing candidate distribution and hires by role.
- **Live Stage Activity Feed:** Real-time stream of stage changes with quick links to candidate profiles.

### 5. 🎨 World-Class Design System
- **Dark & Light Mode:** Toggleable theme with persistent local storage.
- **Modern Typography:** Styled with *Plus Jakarta Sans* and *Outfit* font pairings.
- **Micro-Animations & Toasts:** Interactive feedback for stage moves, candidate updates, and exports.
- **Sample Seed Data:** Automatically seeds 24 realistic candidates across various roles and stages on initial launch, with a **"Reset Demo"** option for quick testing.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Vanilla CSS Design System with CSS variables and glassmorphism.
- **Backend:** Node.js, Express 4.19 (serves both REST API endpoints and production frontend bundle).
- **Database:** SQLite with `better-sqlite3`, WAL mode, foreign keys, and indexed queries.
- **Zero Heavy External UI Libs:** Native HTML5 Drag-and-drop, pure SVG icons, and responsive layouts.

---

## 💻 Local Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/Preethibk20/mini_ATS.git
cd mini_ATS

# 2. Install root and client dependencies
npm install
npm --prefix client install

# 3. Build the production client
npm run build

# 4. Start the server
npm start
```

Visit **`http://localhost:3001`** in your browser.

### Hot-Reload Development (Optional)

Run the server and client dev servers simultaneously:

```bash
# Terminal 1: Backend API with hot-reload (:3001)
npm run dev:server

# Terminal 2: Vite Frontend with HMR (:5173, proxies /api)
npm run dev:client
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/candidates?q=&stage=&role=&sort=&order=&page=&limit=` | List candidates with search, filters, pagination |
| `POST` | `/api/candidates` | Create candidate (validates email uniqueness & fields) |
| `GET` | `/api/candidates/:id` | Get candidate details with full stage history timeline |
| `PUT` | `/api/candidates/:id` | Update candidate details |
| `PATCH` | `/api/candidates/:id/stage` | Update candidate stage (appends to history log) |
| `DELETE` | `/api/candidates/:id` | Delete candidate and cascade stage history |
| `GET` | `/api/dashboard` | Aggregated hiring metrics, funnel, 7-day intake, recent activity |
| `GET` | `/api/roles` | Distinct candidate roles for filter dropdowns |
| `GET` | `/api/stages` | Ordered array of pipeline stages |
| `GET` | `/api/export` | Export all candidates as JSON for CSV generation |
| `POST` | `/api/seed/reset` | Reset database back to default demo state |

---

## 🌐 Deployment Guide

Because Express serves the compiled frontend from `client/dist`, the entire application deploys as a single web service.

### Option A: Deploy on Render (Recommended, Free)

1. Push this repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New → Web Service**.
3. Connect your repository.
4. Configure service settings:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Click **Deploy Web Service**.
   - Your live ATS will be available at `https://<service-name>.onrender.com`.

### Option B: Deploy on Railway / Fly.io

1. Connect the GitHub repository.
2. Railway detects Node.js and executes `npm run build` followed by `npm start`.
3. Set the environment variable `PORT` to the assigned platform port.

---

## 📁 Repository Structure

```
mini_ATS/
├── client/                     # Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx             # Topbar, theme toggle, toast alerts, navigation
│   │   ├── Board.jsx           # Kanban pipeline with drag-and-drop & advance
│   │   ├── Candidates.jsx      # Candidate directory, search, filters, table
│   │   ├── CandidateModal.jsx  # Candidate details, edit form, stage timeline
│   │   ├── Dashboard.jsx       # KPI cards, funnel chart, 7-day spark, activity
│   │   ├── api.js              # Fetch client wrapper
│   │   ├── constants.js        # Stage configs, color tokens, avatars, CSV export
│   │   ├── styles.css          # Design system & dark/light theme stylesheet
│   │   └── main.jsx            # React root mount
│   ├── index.html              # HTML shell with Google Fonts & metadata
│   ├── vite.config.js          # Vite config with API proxy
│   └── package.json
├── server/                     # Backend Express + SQLite
│   ├── db.js                   # Schema, indexes, WAL configuration, seed data
│   └── index.js                # Express REST API routes & static file server
├── docs/                       # Project documentation & demo media
│   └── demo/                   # Walkthrough video recording & screenshots
├── package.json                # Root package & build scripts
└── README.md                   # Project documentation
```
