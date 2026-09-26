# Deployment Checklist

## Pre-Deployment

- [ ] **Cloudflare Account Setup**
  - Create account at https://dash.cloudflare.com/
  - Get Account ID from dashboard
  - Generate API Token with Workers & Vectorize permissions

- [ ] **Create Vectorize Index**
  ```bash
  cd worker
  npx wrangler vectorize create scheme-embeddings --dimensions=768 --metric=cosine
  ```

- [ ] **Configure Environment**
  ```bash
  cd data-ingestion
  cp .env.example .env
  # Edit .env with your credentials
  ```

## Data Ingestion

- [ ] **Install Python Dependencies**
  ```bash
  cd data-ingestion
  pip install -r requirements.txt
  ```

- [ ] **Run Ingestion Script**
  ```bash
  python ingest.py
  ```
  
  **Expected Output:**
  - "Processing 5 schemes..."
  - "Total chunks created: X"
  - "Uploading to Vectorize..."
  - "✅ Data ingestion complete!"

## Worker Deployment

- [ ] **Test Locally First**
  ```bash
  cd worker
  npm run dev
  # Test at http://localhost:8787
  ```

- [ ] **Deploy to Cloudflare**
  ```bash
  npm run deploy
  ```
  
  **Save the deployed URL!** (e.g., `https://sarkari-simpler.your-subdomain.workers.dev`)

## Frontend Deployment

- [ ] **Update Worker URL**
  Edit `frontend/app.js`:
  ```javascript
  const WORKER_URL = 'https://sarkari-simpler.YOUR_SUBDOMAIN.workers.dev';
  ```

- [ ] **Deploy to Cloudflare Pages**
  ```bash
  cd frontend
  npx wrangler pages deploy . --project-name=sarkari-simpler
  ```
  
  **OR** deploy to any static host (Netlify, Vercel, GitHub Pages)

## Testing

- [ ] **Test Worker Endpoints**
  ```bash
  # Health check
  curl https://YOUR_WORKER_URL/health
  
  # Test query
  curl -X POST https://YOUR_WORKER_URL/api/query \
    -H "Content-Type: application/json" \
    -d '{"query": "मैं एक किसान हूं", "language": "hi"}'
  ```

- [ ] **Test Frontend**
  - Open deployed frontend URL
  - Grant microphone permissions
  - Test voice input in Hindi
  - Test text input in English
  - Verify language toggle works
  - Check mobile responsiveness

## Post-Deployment

- [ ] **Monitor Usage**
  - Check Cloudflare dashboard for request metrics
  - Monitor AI model usage/credits

- [ ] **Set Rate Limits** (Optional)
  - Configure rate limiting in wrangler.toml if needed

- [ ] **Custom Domain** (Optional)
  - Add custom domain in Cloudflare dashboard
  - Update frontend to use custom domain

## Troubleshooting

**Worker Deploy Fails?**
- Check Cloudflare credentials: `npx wrangler whoami`
- Verify wrangler.toml is correct
- Check account has Workers enabled

**Vector Search Returns No Results?**
- Verify Vectorize index exists: `npx wrangler vectorize list`
- Check data ingestion completed successfully
- Verify index name matches in wrangler.toml

**Translation Not Working?**
- Check AI binding in wrangler.toml
- Verify account has AI features enabled
- Check model names are correct

**Voice Input Not Working?**
- Ensure frontend is served over HTTPS
- Test in Chrome/Edge (best Web Speech API support)
- Check browser console for errors

## Success Criteria

✅ Worker deployed and accessible  
✅ Vectorize index populated with scheme data  
✅ Frontend deployed and accessible  
✅ Voice input working on mobile  
✅ Translation working both ways  
✅ Scheme recommendations relevant  
✅ UI responsive on mobile devices  

---

**Your deployment is complete!** 🎉
