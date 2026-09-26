/**
 * SARKARI SIMPLER - Automated Scheme Ingestion & Update Pipeline (ingestor.js)
 * Collects, normalizes, detects duplicates, and audits scheme updates from approved government sources.
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const db = require('./db');
const verifier = require('./verifier');

/**
 * Normalize string for similarity comparison
 */
function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^\w\s]/gi, '') // Remove punctuation
        .replace(/\s+/g, ' ')      // Collapse whitespace
        .trim();
}

/**
 * Token similarity score (Jaccard similarity) between 0 and 1
 */
function calculateSimilarity(str1, str2) {
    const set1 = new Set(normalizeString(str1).split(' '));
    const set2 = new Set(normalizeString(str2).split(' '));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/**
 * Duplicate Detection Engine
 * Checks if a candidate scheme matches any existing scheme in DB.
 */
function detectDuplicate(candidateScheme) {
    const allSchemes = db.getAllSchemes();
    const candidateNameNorm = normalizeString(candidateScheme.name);

    for (const existing of allSchemes) {
        // Direct URL match
        if (candidateScheme.official_url && existing.official_url && candidateScheme.official_url === existing.official_url) {
            return { isDuplicate: true, matchedId: existing.id, matchType: 'EXACT_URL_MATCH', similarity: 1.0 };
        }

        // High name similarity match
        const sim = calculateSimilarity(candidateScheme.name, existing.name);
        if (sim >= 0.75) {
            return { isDuplicate: true, matchedId: existing.id, matchType: 'HIGH_NAME_SIMILARITY', similarity: sim };
        }

        // Ministry + Partial Name similarity
        if (candidateScheme.ministry && existing.ministry && candidateScheme.ministry.toLowerCase() === existing.ministry.toLowerCase() && sim >= 0.5) {
            return { isDuplicate: true, matchedId: existing.id, matchType: 'MINISTRY_AND_NAME_SIMILARITY', similarity: sim };
        }
    }

    return { isDuplicate: false, matchedId: null, similarity: 0 };
}

/**
 * Fetch text content safely from an approved URL
 */
function fetchSourceContent(urlStr) {
    return new Promise((resolve, reject) => {
        try {
            const parsed = new URL(urlStr);
            const sources = db.getOfficialSources();
            const isApproved = sources.some(s => parsed.hostname.endsWith(s.domain));

            if (!isApproved) {
                return reject(new Error(`Domain ${parsed.hostname} is not in approved official source allowlist`));
            }

            const client = parsed.protocol === 'https:' ? https : http;

            const req = client.get(urlStr, {
                headers: {
                    'User-Agent': 'SarkariSimpler-Bot/1.0 (+http://localhost:8000/bot-info)'
                },
                timeout: 8000
            }, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 400) {
                    return reject(new Error(`Source returned HTTP ${res.statusCode}`));
                }

                let body = '';
                res.on('data', chunk => {
                    if (body.length < 500000) body += chunk.toString();
                });
                res.on('end', () => resolve(body));
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Fetch request timed out')); });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Ingest or Refresh a specific scheme source
 */
async function processSchemeUpdateCheck(schemeId) {
    const scheme = db.getSchemeById(schemeId);
    if (!scheme) return { success: false, reason: 'Scheme not found' };

    const targetUrl = scheme.official_url;
    if (!targetUrl) return { success: false, reason: 'No official URL defined' };

    try {
        // Step 1: Run Multi-Layer URL Verification
        const verification = await verifier.verifyUrl(scheme, targetUrl, scheme.source_url);

        // Update scheme verification status and score in DB
        db.updateScheme(scheme.id, {
            verification_status: verification.status,
            verification_score: verification.score,
            last_verified: new Date().toISOString()
        });

        // Step 2: Content Hash Update Detection
        const rawContent = await fetchSourceContent(targetUrl);
        const textOnly = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const contentHash = crypto.createHash('sha256').update(textOnly).digest('hex');

        if (scheme.content_hash && scheme.content_hash !== contentHash) {
            // Source content changed! Flag for admin review without overwriting critical facts.
            db.addSchemeUpdate({
                scheme_id: scheme.id,
                scheme_name: scheme.name,
                url: targetUrl,
                old_hash: scheme.content_hash,
                new_hash: contentHash,
                detected_field: 'official_source_content',
                message: 'Official portal content changed. Admin review recommended for eligibility/benefit updates.'
            });

            db.updateScheme(scheme.id, {
                content_hash: contentHash,
                verification_status: 'REQUIRES_REVIEW'
            });

            return { success: true, updated: true, message: 'Content change detected and flagged for review', verification };
        }

        // Save new content hash
        db.updateScheme(scheme.id, { content_hash: contentHash });

        return { success: true, updated: false, message: 'Source verified and content unchanged', verification };

    } catch (err) {
        db.updateScheme(scheme.id, {
            verification_status: 'REQUIRES_REVIEW',
            last_verified: new Date().toISOString()
        });

        return { success: false, error: err.message };
    }
}

module.exports = {
    normalizeString,
    calculateSimilarity,
    detectDuplicate,
    fetchSourceContent,
    processSchemeUpdateCheck
};
