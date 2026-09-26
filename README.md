# Sarkari Simpler 🏛️

<p align="center">
  <img src="frontend/assets/hero-gov-friendly.jpg" alt="Sarkari Simpler" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Gemini%20Powered-8B5CF6?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Languages-16%20Indian-FF9933?style=for-the-badge" />
</p>

> **Find government schemes you're eligible for — just ask in your language.**

---

## What is Sarkari Simpler?

Sarkari Simpler helps every Indian citizen easily discover government schemes they qualify for. Just type or speak your question in any Indian language, and the app will find the right schemes for you.

No complicated forms. No confusing government websites. Just simple answers.

---

## Features

- 🔍 **Search Schemes** — Find from 66+ verified government schemes
- 🤖 **AI Assistant** — Ask questions naturally, get plain-language answers
- ✅ **Eligibility Checker** — See which schemes you personally qualify for
- 🎙️ **Voice Search** — Speak your query in your language
- 🌐 **16 Indian Languages** — Hindi, Tamil, Telugu, Bengali, and more
- 🔒 **Safe Redirects** — Only links to official `.gov.in` portals
- 👤 **Save Schemes** — Bookmark schemes to revisit later

---

## How to Run Locally

### 1. Clone the project
```bash
git clone https://github.com/khurana13/Sarkari-Simpler.git
cd Sarkari-Simpler
```

### 2. Add your API keys (optional)
```bash
cp .env.example .env
```
Open `.env` and add your keys. The app still works without them — it just uses the database directly.

### 3. Start the app
```bash
node start.js
```

Then open your browser at **http://localhost:8000** 

---

## Tech Stack

| Part | Technology |
|------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js (no external dependencies) |
| AI | Google Gemini 1.5 Flash / OpenAI GPT-3.5 |
| Database | JSON file (auto-generated from seed data) |
| Languages | Google Translate (16 Indian languages) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
GEMINI_API_KEY=your_key_here       # From Google AI Studio
OPENAI_API_KEY=your_key_here       # From OpenAI (optional fallback)
JWT_SECRET=any_random_secret       # For user auth
```

> The app works without any keys — it falls back to showing scheme data directly.

---

## Project Structure

```
Sarkari-Simpler/
├── frontend/          → The website (HTML, CSS, JS)
├── data/              → Government scheme database
├── mock-server.js     → Backend API server (port 8787)
├── start.js           → Starts both frontend and backend
└── .env.example       → Template for API keys
```

---

## Screenshots

| Home Page | Scheme Results |
|-----------|---------------|
| Dark glassmorphism hero with Parliament background | AI-powered answers with scheme cards |

---

*"A Simpler India for a Brighter Tomorrow"*
