# Sarkari Simpler 🏛️✨

<p align="center">
  <img src="frontend/assets/hero-gov-friendly.jpg" alt="Sarkari Simpler Banner" width="100%" style="border-radius: 12px;" />
</p>

<p align="center">
  <strong>"A Simpler India for a Brighter Tomorrow"</strong><br>
  <em>An AI-powered Government Scheme Discovery & Eligibility Platform bridging the gap between Indian citizens and government opportunities.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Frontend-Vanilla_JS_%7C_CSS3-6366F1?style=for-the-badge" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Node.js_(Zero_Deps)-8B5CF6?style=for-the-badge" alt="Backend" />
  <img src="https://img.shields.io/badge/AI-Gemini_1.5_Flash-A855F7?style=for-the-badge" alt="AI" />
  <img src="https://img.shields.io/badge/Languages-16_Indian_Languages-FF9933?style=for-the-badge" alt="Languages" />
</p>

---

## 🌟 Overview

**Sarkari Simpler** is a modern, high-performance web application designed to help every Indian citizen easily discover, understand, and apply for government schemes in their preferred native language.

Featuring a **futuristic dark glassmorphism interface**, **deterministic eligibility evaluator**, **multi-lingual voice search**, and **grounded AI assistance (Gemini / OpenAI)**, Sarkari Simpler simplifies complex government documentation into instant, actionable answers.

---

## Key Features

### Currently Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| Scheme Database | Working | JSON-backed structured DB with 60+ seeded government schemes across 15 categories |
| Eligibility Engine | Working | Deterministic rule-based evaluator (age, income, state, occupation, gender) |
| "Find Schemes for Me" | Working | Personalized recommendations ranked by match score |
| AI Query Assistant | Working | Grounded responses via Gemini 1.5 Flash → falls back to OpenAI GPT-3.5-Turbo → falls back to DB facts |
| Safe Redirection | Working | URL verification before redirecting users to official government portals |
| Scheme Verification | Working | Multi-layer link validator with allowlisted `.gov.in` / `.nic.in` domains |
| Background Scheduler | Working | Auto-runs verification sweeps every 12 hours; detects content changes |
| Auth (Register/Login) | Working | PBKDF2 password hashing + HMAC-SHA256 token auth (custom, no external JWT lib) |
| Saved Schemes | Working | Toggle-save schemes per user session |
| Admin Panel | Working | Admin-only endpoints: add/edit/delete schemes, trigger verification sweeps, view logs |
| Multilingual UI | Working | Language selector (16 Indian languages) integrated with Google Translate element |
| Voice Search | Working | Browser Web Speech API microphone input |
| Dark Mode UI | Working | Glassmorphism design with video background, gradient typography, smooth animations |
| History | Working | Query history stored in `history.json` (max 200 records) |
| Scheme Comparison | Working | Compare up to N schemes side-by-side via API |

### Under Development / Experimental

| Feature | Status | Notes |
|---------|--------|-------|
| Cloudflare Worker | **In Progress** | `worker/` contains TypeScript worker code with Vectorize (RAG) and AI bindings. **Not deployed.** Requires Cloudflare account & `wrangler` CLI. |
| Vector/RAG Ingestion | **In Progress** | `data-ingestion/ingest.py` pushes scheme embeddings to Cloudflare Vectorize. Requires CF credentials. |
| Scheme Update Detection | **Partial** | Content hash comparison works locally; full diff-and-notify pipeline not complete |
| Mobile Responsiveness | **Partial** | Desktop-first design; mobile improvements are ongoing |

---

## Technology Stack

### Frontend
- **HTML5** — Semantic structure, Single-Page Application (SPA)
- **CSS3** — Custom design system: glassmorphism, CSS variables, Flexbox/Grid
- **Vanilla JavaScript (ES6+)** — DOM manipulation, fetch API, Web Speech API
- **Google Translate Element** — Multilingual support (16 Indian languages)

### Backend
- **Node.js** — HTTP server (`mock-server.js`) using only built-in modules (`http`, `https`, `fs`, `crypto`)
- **No external npm dependencies** — Zero-dependency backend
- **JSON file store** — `data/db.json` serves as the runtime database (seeded from `data/seed-schemes.json`)

### AI Integrations
- **Google Gemini 1.5 Flash** — Primary AI grounding engine (requires `GEMINI_API_KEY`)
- **OpenAI GPT-3.5-Turbo** — Fallback AI engine (requires `OPENAI_API_KEY`)
- **Fallback DB Engine** — If neither AI is available, returns structured scheme facts from the database

### Cloudflare (Experimental / Not yet deployed)
- **Cloudflare Workers** — TypeScript worker in `worker/src/`
- **Cloudflare Vectorize** — Vector store for semantic scheme search
- **Cloudflare AI** — Alternative AI inference binding
- **Python ingestion script** — `data-ingestion/ingest.py` for seeding Vectorize index

### Runtime Tools
- **Python 3** — Used by `run.py` to orchestrate both servers (optional, for convenience)
- **`npx serve`** — Lightweight static file server for the frontend

---

## Project Structure

```
sarkari-simpler/
├── frontend/                    # Static frontend (SPA)
│   ├── index.html               # Main application page
│   ├── app.js                   # All frontend logic (~2400 lines)
│   ├── styles.css               # Design system & styles
│   └── assets/                  # Images and video background
│       ├── hero-building.jpg
│       ├── hero-gov-friendly.jpg
│       └── rashtrapati_background_web.mp4
│
├── data/                        # Data layer
│   ├── seed-schemes.json        # Source of truth: 60+ government schemes
│   ├── seed-documents.json      # Required document definitions
│   └── db.json                  # Runtime database (auto-generated, not committed)
│
├── data-ingestion/              # Cloudflare Vectorize ingestion (experimental)
│   ├── ingest.py                # Python script to push embeddings to Cloudflare
│   ├── check_cf.py              # Cloudflare connectivity checker
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Template for Cloudflare credentials
│   └── schemes/                 # Source scheme files for ingestion
│
├── worker/                      # Cloudflare Worker (experimental, not deployed)
│   ├── src/
│   │   ├── index.ts             # Main worker entry point
│   │   ├── rag.ts               # RAG (retrieval augmented generation) logic
│   │   ├── reasoning.ts         # AI reasoning pipeline
│   │   ├── translation.ts       # Translation handler
│   │   └── types.ts             # TypeScript type definitions
│   ├── wrangler.toml            # Cloudflare deployment config
│   └── package.json
│
├── tests/                       # Test suite
│   ├── test_eligibility.js      # Eligibility engine unit tests
│   ├── test_api.js              # API endpoint integration tests
│   └── test_verifier.js         # URL verifier tests
│
├── mock-server.js               # Main backend server (Node.js, port 8787)
├── db.js                        # Database engine (JSON file-backed)
├── eligibility.js               # Deterministic eligibility & recommendation engine
├── verifier.js                  # Multi-layer URL verification engine
├── ingestor.js                  # Scheme ingestion & update detection pipeline
├── scheduler.js                 # Background verification scheduler (12h interval)
├── auth.js                      # Auth: PBKDF2 hashing + HMAC token management
├── start.js                     # Node.js process launcher (starts both servers)
├── run.py                       # Python launcher (convenience script for Windows)
├── run.ps1                      # PowerShell launcher
├── package.json                 # npm scripts
│
├── .env.example                 # Template for required environment variables
├── .gitignore
└── README.md
```

---

## Installation & Setup

### Prerequisites

- **Node.js** v16 or higher — [Download](https://nodejs.org/)
- **Python 3** — [Download](https://python.org/) *(optional, only needed for `run.py`)*

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/sarkari-simpler.git
cd sarkari-simpler
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and add your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_custom_jwt_secret_here
```

> **Note:** The app works without API keys. If both are missing, the AI assistant falls back to returning structured scheme data directly from the database.

### 3. Install dependencies

The backend has **zero external npm dependencies**. No `npm install` is required for the core backend.

For the frontend static server (only needed for `npm run frontend`):
```bash
# No install needed - npx serve is used on-the-fly
```

For the experimental Cloudflare worker (optional):
```bash
cd worker && npm install
```

For the experimental Python data-ingestion pipeline (optional):
```bash
cd data-ingestion
pip install -r requirements.txt
cp .env.example .env   # Add your Cloudflare credentials
```

---

## How to Run

### Option 1: Python runner (recommended for Windows)

```bash
python run.py
```

This starts both servers and prints their URLs.

### Option 2: Node.js launcher

```bash
node start.js
```

### Option 3: Run servers separately

**Backend** (port 8787):
```bash
node mock-server.js
```

**Frontend** (port 8000):
```bash
npx -y serve frontend -p 8000
```

### Access the application

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:8000 |
| API Health | http://localhost:8787/health |
| Schemes API | http://localhost:8787/api/schemes |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health + DB stats |
| GET | `/api/schemes` | List schemes (filter: `category`, `state`, `ministry`, `search`) |
| GET | `/api/schemes/:id` | Get scheme details + document requirements |
| GET | `/api/schemes/:id/apply` | Safe redirect to official portal |
| GET | `/api/schemes/:id/verify-url` | Verify official URL live |
| POST | `/api/schemes/compare` | Compare multiple schemes |
| POST | `/api/eligibility/check` | Check eligibility for a specific scheme |
| POST | `/api/recommendations` | Find matching schemes for a citizen profile |
| POST | `/api/query` | AI-grounded natural language query |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (Bearer token) |
| POST | `/api/schemes/:id/save` | Toggle save/unsave a scheme |
| GET | `/api/user/saved-schemes` | List saved schemes for current user |
| GET | `/api/history` | Query history |
| POST | `/api/admin/schemes` | Add scheme (admin only) |
| PUT | `/api/admin/schemes/:id` | Update scheme (admin only) |
| DELETE | `/api/admin/schemes/:id` | Delete scheme (admin only) |
| POST | `/api/admin/trigger-verification` | Manually trigger verification sweep |
| GET | `/api/admin/verification-logs` | View verification logs |

---

## Current Limitations

- **No persistent database** — The runtime DB (`data/db.json`) is regenerated from seed files every time the server starts. User accounts, saved schemes, and content hashes are lost on restart.
- **No real-time government data** — Scheme data in `seed-schemes.json` was manually curated and may become outdated.
- **No HTTPS** — Runs on plain HTTP locally. Not suitable for production without a reverse proxy.
- **JWT secret has a default fallback** — The default `sarkari-simpler-secure-key-2026-v1` in `auth.js` is used if `JWT_SECRET` is not set. Always override this in production.
- **Cloudflare Worker is not deployed** — The `worker/` directory is experimental and requires a Cloudflare account to deploy.
- **Mobile UI is desktop-first** — Some layouts are not fully optimized for mobile screens yet.

---

## Future Improvements

- [ ] Persistent database (PostgreSQL or SQLite) to survive restarts
- [ ] Real-time scheme data scraping from `myscheme.gov.in` and state portals
- [ ] Full Cloudflare Workers deployment with Vectorize RAG for semantic search
- [ ] Progressive Web App (PWA) support for offline access
- [ ] Push notifications for scheme deadline reminders
- [ ] Document checklist generator per scheme
- [ ] Mobile-first responsive redesign
- [ ] OAuth2 login (Google / DigiLocker)
- [ ] Admin dashboard UI (currently admin endpoints are API-only)

---

## Security Notes

- Real API keys must **never** be committed. Copy `.env.example` to `.env` and fill in your credentials.
- The `data-ingestion/.env.example` contains only placeholders; copy to `.env` and add real Cloudflare credentials to use the ingestion pipeline.
- The default JWT secret fallback in `auth.js` is for local development only. Set `JWT_SECRET` in your `.env` before any production use.

---

## Acknowledgements

Built as an end-to-end demonstration of AI-powered civic tech using minimal dependencies, showcasing API design, eligibility reasoning, grounded AI, and inclusive multilingual UX.
