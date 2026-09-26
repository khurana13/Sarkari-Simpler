# Quick Start Guide

## 🎯 For Hackathon Demo

### Step 1: Clone/Navigate to Project
```bash
cd d:\Hackathon\sarkari-simpler
```

### Step 2: Start the Worker (Local Development)
```bash
cd worker
npm run dev
```

The Worker will be available at `http://localhost:8787`

### Step 3: Open Frontend
1. Open `frontend/index.html` in your browser (Chrome/Edge recommended)
2. Grant microphone permissions when prompted
3. Try the voice input or type your query!

### Example Queries to Test

**In Hindi (हिंदी):**
- "मैं एक किसान हूं, मुझे क्या योजनाएं मिल सकती हैं?"
- "मुझे घर चाहिए"
- "मुझे इलाज के लिए पैसे चाहिए"
- "मुझे काम चाहिए"
- "मुझे राशन कार्ड चाहिए"

**In English:**
- "I am a farmer, what schemes can I get?"
- "I need a house"
- "I need money for medical treatment"
- "I need employment"
- "I need food assistance"

## 🔧 Troubleshooting

### Worker Not Starting?
- Make sure you're in the `worker` directory
- Run `npm install` if you haven't already
- Check Node.js version: `node --version` (should be v20+)

### Voice Input Not Working?
- Use Chrome or Edge browser (best support for Web Speech API)
- Grant microphone permissions
- Try text input as fallback

### No Results?
- **Important**: Vector database is empty by default!
- You need to run the data ingestion script first (see below)
- For demo purposes, the Worker will work but won't have real data

## 📊 Loading Scheme Data (Optional for Demo)

**Note:** The ingestion script uses mock embeddings for local development.

```bash
cd data-ingestion
pip install -r requirements.txt
python ingest.py
```

This will create `vectors_output.json` with scheme data. 

**For production**, you'd need to:
1. Set Cloudflare credentials in `.env`
2. Create Vectorize index
3. Run the ingestion script to upload

## 🎥 Demo Flow

1. **Show the Interface** - Clean, bilingual design
2. **Test Voice Input** - Click mic button, speak in Hindi
3. **Show Translation** - Query gets translated to English
4. **Show Results** - AI-generated response with relevant schemes
5. **Toggle Language** - Switch to English and test again

## 📌 Key Features to Highlight

✅ **Voice-First** - Natural language input  
✅ **Bilingual** - Hindi & English support  
✅ **AI-Powered** - Translation, RAG, and LLM reasoning  
✅ **Edge Computing** - Runs on Cloudflare Workers  
✅ **Accessible** - Designed for rural users  

---

**Ready to demo!** 🚀
