# Local Demo Setup (No Cloudflare Required!)

## 🚀 Quick Start

### Start Mock Server
```bash
node mock-server.js
```

### Open Frontend
Open `frontend/index.html` in Chrome or Edge

## ✅ What Works

- ✅ Voice Input (Web Speech API)
- ✅ Text Input
- ✅ Language Toggle (Hindi/English)
- ✅ Scheme Recommendations
- ✅ Beautiful UI

## 📝 Test Queries

**Hindi:**
- "मैं एक किसान हूं"
- "मुझे घर चाहिए"
- "मुझे इलाज के लिए पैसे चाहिए"
- "मुझे काम चाहिए"
- "मुझे राशन कार्ड चाहिए"

**English:**
- "I am a farmer"
- "I need a house"
- "I need health insurance"
- "I need employment"
- "I need food assistance"

## 🎯 How It Works

The mock server:
- Listens on `http://localhost:8787`
- Detects keywords in your query
- Returns relevant scheme information
- No AI processing (pattern matching)
- Instant responses

## ⚠️ Limitations

This is a MOCK for demo purposes:
- No actual AI translation
- No RAG vector search
- Simple keyword matching
- Pre-defined responses

## 🌟 For Full AI Features

To use real Cloudflare AI:
1. Set up Cloudflare account
2. Get API token
3. Run `npm run dev` in worker folder
4. See DEPLOYMENT.md

---

**Enjoy the demo!** 🎉
