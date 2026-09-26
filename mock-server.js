/**
 * Sarkari-Simpler Enterprise Backend Server (mock-server.js)
 * Features: Structured DB, Multi-Layer Verification Engine, Deterministic Eligibility Engine,
 * Automated Ingestion, Scheduler, AI Assistant Grounding, Authentication & Safe Redirects.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const db = require('./db');
const verifier = require('./verifier');
const eligibility = require('./eligibility');
const ingestor = require('./ingestor');
const scheduler = require('./scheduler');
const auth = require('./auth');

const PORT = 8787;
const HISTORY_FILE = path.join(__dirname, 'history.json');

// ─── API Keys Load ─────────────────────────────────────────────────────────────
let OPENAI_API_KEY = "";
let GEMINI_API_KEY = "";
try {
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const openaiMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
    const geminiMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
    if (openaiMatch) OPENAI_API_KEY = openaiMatch[1].trim();
    if (geminiMatch) GEMINI_API_KEY = geminiMatch[1].trim();
} catch (e) {
    console.log("ℹ️  .env file not present or partially defined. AI fallbacks will operate smoothly.");
}

// Start background scheduled verification service
scheduler.startScheduler();

// ─── AI Grounding Engine ─────────────────────────────────────────────────────
async function callGemini(query, contextSchemes, language = 'en', state = 'All India') {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('your-')) return null;

    const contextText = contextSchemes.map(s =>
        `Scheme ID: ${s.id}\nScheme Name: ${s.name}\nCategory: ${s.category}\nMinistry: ${s.ministry}\nBenefits: ${(s.benefits || []).join(', ')}\nEligibility Summary: ${s.eligibility?.criteria_summary || 'N/A'}\nApplication Steps: ${(s.application_steps || []).join(' -> ')}\nOfficial Portal: ${s.official_url}\nVerification Status: ${s.verification_status}`
    ).join('\n\n');

    const prompt = `You are 'Sarkari Simpler', an AI Government Scheme Assistant for Indian citizens.
Current User Location: ${state}
Requested Response Language: ${language}

CRITICAL MANDATORY DIRECTIVES:
1. Ground your answers EXCLUSIVELY in the provided verified government scheme context data below.
2. DO NOT invent or hallucinate scheme facts, eligibility criteria, benefits, documents, or external web URLs.
3. If the user's question cannot be answered from the provided context, state clearly: "I couldn't verify this information from the available official scheme data."
4. Structure your response with clear Markdown headers, bullet points, and steps.
5. Provide the safe application redirect button link: [Apply via Sarkari Simpler Portal](/api/schemes/{SCHEME_ID}/apply).

Verified Official Scheme Context:
${contextText}

User Query: ${query}`;

    const postData = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
    });

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        }, (res) => {
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(resData);
                    if (result.candidates && result.candidates[0].content) {
                        resolve({
                            answer: result.candidates[0].content.parts[0].text,
                            model: 'Gemini 1.5 Flash (Grounded)'
                        });
                    } else resolve(null);
                } catch (e) { resolve(null); }
            });
        });

        req.on('error', () => resolve(null));
        req.timeout = 8000;
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(postData);
        req.end();
    });
}

async function callOpenAI(query, contextSchemes, language = 'en', state = 'All India') {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith('your-')) return null;

    const limitedContext = contextSchemes.slice(0, 4);
    const contextText = limitedContext.map(s =>
        `Scheme: ${s.name}\nCategory: ${s.category}\nMinistry: ${s.ministry}\nBenefits: ${(s.benefits || []).join(', ')}\nEligibility: ${s.eligibility?.criteria_summary || ''}\nOfficial URL: ${s.official_url}`
    ).join('\n\n');

    const messages = [
        {
            role: "system",
            content: `You are 'Sarkari Simpler', an AI Government Scheme Consultant.
User Location: ${state}
Language: ${language}

STRICT RULE: Only use facts present in the provided scheme context data. Do not invent links or criteria.
Scheme Data:
${contextText}`
        },
        { role: "user", content: query }
    ];

    const postData = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.2
    });

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(resData);
                    if (result.choices && result.choices[0]) {
                        resolve({
                            answer: result.choices[0].message.content,
                            model: 'GPT-3.5-Turbo (Grounded)'
                        });
                    } else resolve(null);
                } catch (e) { resolve(null); }
            });
        });

        req.on('error', () => resolve(null));
        req.timeout = 8000;
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(postData);
        req.end();
    });
}

// ─── History Helpers ──────────────────────────────────────────────────────────
function loadHistory() {
    try {
        if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, '[]', 'utf8');
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) { return []; }
}

function saveHistory(records) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(records, null, 2), 'utf8');
        return true;
    } catch (e) { return false; }
}

function addHistoryRecord(query, language, answer, schemes) {
    const history = loadHistory();
    const record = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        query,
        language,
        answer,
        schemeNames: (schemes || []).map(s => s.name),
        schemeCount: (schemes || []).length
    };
    history.unshift(record);
    if (history.length > 200) history.splice(200);
    saveHistory(history);
    return record;
}

// ─── CORS & Response Helpers ──────────────────────────────────────────────────
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { reject(new Error('Invalid JSON payload')); }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, status, data) {
    res.writeHead(status, CORS);
    res.end(JSON.stringify(data));
}

// ─── Main HTTP Server Router ──────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
        res.writeHead(204, CORS);
        res.end();
        return;
    }

    try {
        // ── GET /health ───────────────────────────────────────────────────────
        if (pathname === '/health' && method === 'GET') {
            const stats = db.getStats();
            return sendJSON(res, 200, {
                status: 'healthy',
                version: '2.0.0-Enterprise',
                stats,
                timestamp: new Date().toISOString()
            });
        }

        // ── GET /api/stats ────────────────────────────────────────────────────
        if (pathname === '/api/stats' && method === 'GET') {
            return sendJSON(res, 200, db.getStats());
        }

        // ── GET /api/explore/metadata ─────────────────────────────────────────
        if (pathname === '/api/explore/metadata' && method === 'GET') {
            return sendJSON(res, 200, db.getExploreMetadata());
        }

        // ── POST /api/schemes/compare ─────────────────────────────────────────
        if (pathname === '/api/schemes/compare' && method === 'POST') {
            const body = await parseBody(req);
            const schemeIds = Array.isArray(body.scheme_ids) ? body.scheme_ids : [];
            const schemes = schemeIds.map(id => {
                const s = db.getSchemeById(id);
                if (!s) return null;
                const attachedDocs = (s.documents || []).map(docId => db.getDocumentById(docId)).filter(Boolean);
                return { ...s, document_details: attachedDocs };
            }).filter(Boolean);
            return sendJSON(res, 200, { schemes });
        }

        // ── GET /api/schemes ─────────────────────────────────────────────────
        if (pathname === '/api/schemes' && method === 'GET') {
            const category = url.searchParams.get('category');
            const state = url.searchParams.get('state');
            const ministry = url.searchParams.get('ministry');
            const search = url.searchParams.get('search');
            const status = url.searchParams.get('status') || 'ACTIVE';

            const schemes = db.getAllSchemes({ category, state, ministry, search, status });
            return sendJSON(res, 200, { schemes, total: schemes.length });
        }

        // ── GET /api/schemes/:id ─────────────────────────────────────────────
        const schemeIdMatch = pathname.match(/^\/api\/schemes\/([a-zA-Z0-9_-]+)$/);
        if (schemeIdMatch && method === 'GET' && !pathname.endsWith('/apply') && !pathname.endsWith('/verify-url')) {
            const id = schemeIdMatch[1];
            const scheme = db.getSchemeById(id);
            if (!scheme) return sendJSON(res, 404, { error: 'Scheme not found', id });

            // Fetch attached document details
            const attachedDocs = (scheme.documents || [])
                .map(docId => db.getDocumentById(docId))
                .filter(Boolean);

            return sendJSON(res, 200, { ...scheme, document_details: attachedDocs });
        }

        // ── POST /api/eligibility/check ──────────────────────────────────────
        if (pathname === '/api/eligibility/check' && method === 'POST') {
            const body = await parseBody(req);
            const { scheme_id, profile } = body;

            if (!scheme_id || !profile) {
                return sendJSON(res, 400, { error: 'scheme_id and profile object are required' });
            }

            const scheme = db.getSchemeById(scheme_id);
            if (!scheme) return sendJSON(res, 404, { error: 'Scheme not found' });

            const evaluation = eligibility.evaluateSchemeEligibility(scheme, profile);
            return sendJSON(res, 200, evaluation);
        }

        // ── POST /api/recommendations ("Find Schemes for Me") ─────────────────
        if (pathname === '/api/recommendations' && method === 'POST') {
            const body = await parseBody(req);
            const profile = body.profile || body;

            if (!profile || Object.keys(profile).length === 0) {
                return sendJSON(res, 400, { error: 'User profile attributes are required' });
            }

            const recommendations = eligibility.findSchemesForMe(profile);
            return sendJSON(res, 200, recommendations);
        }

        // ── GET /api/schemes/:id/verify-url ──────────────────────────────────
        const verifyMatch = pathname.match(/^\/api\/schemes\/([a-zA-Z0-9_-]+)\/verify-url$/);
        if (verifyMatch && method === 'GET') {
            const id = verifyMatch[1];
            const scheme = db.getSchemeById(id);
            if (!scheme) return sendJSON(res, 404, { error: 'Scheme not found' });

            const verification = await verifier.verifyUrl(scheme, scheme.official_url, scheme.source_url);
            return sendJSON(res, 200, verification);
        }

        // ── GET /api/schemes/:id/apply (Safe Redirection Endpoint) ───────────
        const applyMatch = pathname.match(/^\/api\/schemes\/([a-zA-Z0-9_-]+)\/apply$/);
        if (applyMatch && method === 'GET') {
            const id = applyMatch[1];
            const scheme = db.getSchemeById(id);
            if (!scheme) return sendJSON(res, 404, { error: 'Scheme not found' });

            const verification = await verifier.verifyUrl(scheme, scheme.official_url, scheme.source_url);

            const formatParam = url.searchParams.get('format');
            if (formatParam === 'json') {
                return sendJSON(res, 200, {
                    scheme_id: scheme.id,
                    scheme_name: scheme.name,
                    official_url: scheme.official_url,
                    verification
                });
            }

            // Safe Redirect Logic: If VERIFIED or high score, redirect 302
            if (verification.status === 'VERIFIED' || verification.score >= 70) {
                res.writeHead(302, { 'Location': scheme.official_url });
                res.end();
                return;
            }

            // Otherwise present safe warning HTML
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html><html><head><title>Safe Redirection Warning | Sarkari Simpler</title>
<style>body{font-family:sans-serif;background:#0f172a;color:#f1f5f9;padding:3rem;text-align:center;}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:2rem;max-width:600px;margin:auto;}
.badge{display:inline-block;padding:0.5rem 1rem;border-radius:999px;background:#f59e0b;color:#000;font-weight:bold;}
a.btn{display:inline-block;margin-top:1.5rem;padding:0.75rem 1.5rem;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;}
</style></head><body>
<div class="card">
  <h2>⚠️ Verification Notice</h2>
  <p>You are navigating to an external portal for <strong>${scheme.name}</strong>.</p>
  <p><span class="badge">Status: ${verification.status} (Score: ${verification.score}/100)</span></p>
  <p style="color:#94a3b8;font-size:0.9rem;">Target URL: <code>${scheme.official_url}</code></p>
  <p>Reason: ${verification.error_message || 'Domain requires additional verification check.'}</p>
  <a href="${scheme.official_url}" target="_blank" rel="noopener noreferrer" class="btn">Proceed to External Portal &rarr;</a>
</div></body></html>`);
            return;
        }

        // ── GET /api/documents & /api/documents/:id ──────────────────────────
        if (pathname === '/api/documents' && method === 'GET') {
            return sendJSON(res, 200, { documents: db.getAllDocuments() });
        }
        const docIdMatch = pathname.match(/^\/api\/documents\/([a-zA-Z0-9_-]+)$/);
        if (docIdMatch && method === 'GET') {
            const doc = db.getDocumentById(docIdMatch[1]);
            if (!doc) return sendJSON(res, 404, { error: 'Document not found' });
            return sendJSON(res, 200, doc);
        }

        // ── POST /api/query (Grounded AI Assistant) ──────────────────────────
        if (pathname === '/api/query' && method === 'POST') {
            const body = await parseBody(req);
            const { query, language, state, profile } = body;

            if (!query || typeof query !== 'string' || query.trim().length === 0) {
                return sendJSON(res, 400, { error: 'query string is required' });
            }

            // Search structured scheme DB using search & eligibility ranking
            const matchingSchemes = db.getAllSchemes({ search: query, status: 'ACTIVE' });
            let relevantSchemes = matchingSchemes.slice(0, 4);

            if (relevantSchemes.length === 0) {
                const recs = eligibility.findSchemesForMe(profile || { state: state || 'All India' });
                relevantSchemes = recs.recommendations.slice(0, 4);
            }

            // Run AI grounding
            let aiResult = await callGemini(query.trim(), relevantSchemes, language || 'en', state || 'All India');
            if (!aiResult) {
                aiResult = await callOpenAI(query.trim(), relevantSchemes, language || 'en', state || 'All India');
            }

            let answerText = '';
            if (aiResult) {
                answerText = aiResult.answer;
            } else {
                // Fallback deterministic response from scheme DB facts
                const primary = relevantSchemes[0];
                answerText = `### Information for **${primary.name}**\n\n` +
                             `**Category:** ${primary.category} (${primary.government_level})\n` +
                             `**Ministry:** ${primary.ministry}\n\n` +
                             `**Key Benefits:**\n${(primary.benefits || []).map(b => `• ${b}`).join('\n')}\n\n` +
                             `**Eligibility:**\n${primary.eligibility?.criteria_summary || 'Check guidelines'}\n\n` +
                             `**Application Steps:**\n${(primary.application_steps || []).map((s, i) => `${i+1}. ${s}`).join('\n')}\n\n` +
                             `🔗 **Official Portal:** [Apply via Official Portal](/api/schemes/${primary.id}/apply)`;
            }

            const responsePayload = {
                answer: answerText,
                language: language || 'en',
                relevantSchemes,
                model: aiResult ? aiResult.model : 'Factual DB Engine',
                timestamp: new Date().toISOString()
            };

            addHistoryRecord(query.trim(), language || 'en', answerText, relevantSchemes);
            return sendJSON(res, 200, responsePayload);
        }

        // ── Auth Endpoints ────────────────────────────────────────────────────
        if (pathname === '/api/auth/register' && method === 'POST') {
            const body = await parseBody(req);
            const { email, password, name } = body;
            if (!email || !password) return sendJSON(res, 400, { error: 'Email and password required' });

            if (db.getUserByEmail(email)) {
                return sendJSON(res, 400, { error: 'Account with this email already exists' });
            }

            const passwordHash = await auth.hashPassword(password);
            const user = db.createUser({ email, name, passwordHash, role: 'citizen' });
            const token = auth.generateToken(user);
            return sendJSON(res, 201, { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
        }

        if (pathname === '/api/auth/login' && method === 'POST') {
            const body = await parseBody(req);
            const { email, password } = body;
            if (!email || !password) return sendJSON(res, 400, { error: 'Email and password required' });

            const user = db.getUserByEmail(email);
            if (!user) return sendJSON(res, 401, { error: 'Invalid email or password' });

            const isMatch = await auth.verifyPassword(password, user.passwordHash);
            if (!isMatch) return sendJSON(res, 401, { error: 'Invalid email or password' });

            const token = auth.generateToken(user);
            return sendJSON(res, 200, { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
        }

        if (pathname === '/api/auth/me' && method === 'GET') {
            const authUser = auth.getAuthUser(req);
            if (!authUser) return sendJSON(res, 401, { error: 'Unauthorized' });
            return sendJSON(res, 200, { user: authUser });
        }

        // ── Saved Schemes Endpoints ──────────────────────────────────────────
        const saveMatch = pathname.match(/^\/api\/schemes\/([a-zA-Z0-9_-]+)\/save$/);
        if (saveMatch && method === 'POST') {
            const authUser = auth.getAuthUser(req);
            const userId = authUser ? authUser.id : 'guest_session';
            const resData = db.toggleSavedScheme(userId, saveMatch[1]);
            return sendJSON(res, 200, resData);
        }

        if (pathname === '/api/user/saved-schemes' && method === 'GET') {
            const authUser = auth.getAuthUser(req);
            const userId = authUser ? authUser.id : 'guest_session';
            return sendJSON(res, 200, { savedSchemes: db.getSavedSchemes(userId) });
        }

        // ── Admin Endpoints ──────────────────────────────────────────────────
        if (pathname.startsWith('/api/admin')) {
            if (!auth.isAdmin(req)) {
                return sendJSON(res, 403, { error: 'Forbidden: Admin authorization required' });
            }

            if (pathname === '/api/admin/schemes' && method === 'POST') {
                const body = await parseBody(req);
                const dupCheck = ingestor.detectDuplicate(body);
                if (dupCheck.isDuplicate) {
                    console.log(`[ADMIN] Duplicate warning during scheme add:`, dupCheck);
                }
                const newScheme = db.addScheme(body);
                return sendJSON(res, 201, { scheme: newScheme, duplicateWarning: dupCheck });
            }

            const adminSchemeIdMatch = pathname.match(/^\/api\/admin\/schemes\/([a-zA-Z0-9_-]+)$/);
            if (adminSchemeIdMatch && method === 'PUT') {
                const body = await parseBody(req);
                const updated = db.updateScheme(adminSchemeIdMatch[1], body);
                if (!updated) return sendJSON(res, 404, { error: 'Scheme not found' });
                return sendJSON(res, 200, updated);
            }

            if (adminSchemeIdMatch && method === 'DELETE') {
                const deleted = db.deleteScheme(adminSchemeIdMatch[1]);
                if (!deleted) return sendJSON(res, 404, { error: 'Scheme not found' });
                return sendJSON(res, 200, { success: true, message: 'Scheme deleted' });
            }

            if (pathname === '/api/admin/verification-logs' && method === 'GET') {
                return sendJSON(res, 200, { logs: db.getVerificationLogs(100) });
            }

            if (pathname === '/api/admin/scheme-updates' && method === 'GET') {
                return sendJSON(res, 200, { updates: db.getSchemeUpdates() });
            }

            if (pathname === '/api/admin/trigger-verification' && method === 'POST') {
                const sweepResult = await scheduler.runVerificationSweep();
                return sendJSON(res, 200, sweepResult);
            }
        }

        // ── GET /api/history (Legacy compatibility) ──────────────────────────
        if (pathname === '/api/history' && method === 'GET') {
            const history = loadHistory();
            return sendJSON(res, 200, { items: history, total: history.length });
        }

        // ── 404 Not Found ─────────────────────────────────────────────────────
        return sendJSON(res, 404, { error: 'Route not found', path: pathname });

    } catch (err) {
        console.error(`❌ Server Exception on ${method} ${pathname}:`, err);
        return sendJSON(res, 500, { error: 'Internal Server Error', message: err.message });
    }
});

server.listen(PORT, () => {
    console.log('\n🚀 Sarkari-Simpler Enterprise Backend Running!');
    console.log(`   API Base URL:        http://localhost:${PORT}`);
    console.log(`   Health Check:       http://localhost:${PORT}/health`);
    console.log(`   Schemes API:        http://localhost:${PORT}/api/schemes`);
    console.log(`   Recommendations:    http://localhost:${PORT}/api/recommendations  (POST)`);
    console.log(`   Safe Redirection:   http://localhost:${PORT}/api/schemes/:id/apply\n`);
});
