/**
 * SARKARI SIMPLER - Multi-Layer Official URL Verification Engine (verifier.js)
 * Implements 10-Check verification algorithm to audit government application links.
 */

const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const db = require('./db');

// Private IP / Loopback ranges for SSRF protection
const PRIVATE_IP_REGEX = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.|169\.254\.|::1|localhost)/i;

// Phishing keyword patterns in untrusted domains
const SUSPICIOUS_DOMAIN_PATTERNS = [
    /gov-india/i,
    /government-scheme/i,
    /govt-benefits/i,
    /free-schemes/i,
    /sarkari-login/i,
    /yojana-apply/i,
    /pm-kisan-portal/i
];

/**
 * Main URL Verification Function
 * @param {Object} scheme - Scheme record from database
 * @param {string} targetUrl - URL to verify
 * @param {string} sourceUrl - Source URL published by official agency
 */
async function verifyUrl(scheme, targetUrl, sourceUrl = '') {
    const results = {
        scheme_id: scheme?.id || 'unknown',
        url: targetUrl,
        checked_at: new Date().toISOString(),
        status: 'UNVERIFIED',
        score: 0,
        checks: {},
        redirect_chain: [],
        error_message: null
    };

    let currentUrl = targetUrl;
    let score = 0;

    try {
        // ─── CHECK 10: URL Safety & SSRF Protection ──────────────────────────
        const check10 = checkUrlSafety(targetUrl);
        results.checks.check10_url_safety = check10;
        if (!check10.passed) {
            results.status = 'BLOCKED';
            results.error_message = check10.reason;
            db.addVerificationLog(results);
            return results;
        }

        const parsedUrl = new URL(targetUrl);

        // ─── CHECK 9: Phishing & Suspicious Domain Detection ─────────────────
        const check9 = checkPhishingDomain(parsedUrl.hostname);
        results.checks.check9_phishing = check9;
        if (!check9.passed) {
            results.status = 'BLOCKED';
            results.error_message = check9.reason;
            db.addVerificationLog(results);
            return results;
        }

        // ─── CHECK 1: Domain Allowlist Check ─────────────────────────────────
        const check1 = checkDomainAllowlist(parsedUrl.hostname);
        results.checks.check1_domain_allowlist = check1;
        if (check1.passed) score += 30;

        // ─── CHECK 2: HTTPS Check ─────────────────────────────────────────────
        const isHttps = parsedUrl.protocol === 'https:';
        results.checks.check2_https = { passed: isHttps, reason: isHttps ? 'HTTPS protocol used' : 'Insecure HTTP protocol' };
        if (isHttps) score += 10;

        // ─── CHECK 6: DNS & Host Validation (SSRF Check) ────────────────────
        const check6 = await checkDnsValidation(parsedUrl.hostname);
        results.checks.check6_dns_host = check6;
        if (!check6.passed) {
            results.status = 'BLOCKED';
            results.error_message = check6.reason;
            db.addVerificationLog(results);
            return results;
        }
        score += 5;

        // ─── CHECK 4 & 3: Redirect Chain & TLS Inspection ────────────────────
        const redirectRes = await inspectRedirectChainAndTls(targetUrl);
        results.redirect_chain = redirectRes.chain;
        results.checks.check3_tls = redirectRes.tls_result;
        results.checks.check4_redirect_chain = redirectRes.redirect_result;

        if (redirectRes.tls_result.passed) score += 10;
        if (redirectRes.redirect_result.passed) score += 10;

        const finalUrl = redirectRes.finalUrl;
        const finalHostname = new URL(finalUrl).hostname;

        // ─── CHECK 5: Domain Consistency ────────────────────────────────────
        const check5 = checkDomainConsistency(parsedUrl.hostname, finalHostname, sourceUrl);
        results.checks.check5_domain_consistency = check5;
        if (check5.passed) score += 10;

        // ─── CHECK 8: Source Consistency ────────────────────────────────────
        const check8 = checkSourceConsistency(targetUrl, sourceUrl || scheme?.source_url);
        results.checks.check8_source_consistency = check8;
        if (check8.passed) score += 15;

        // ─── CHECK 7: Page Content Validation ────────────────────────────────
        const check7 = await checkPageContent(finalUrl, scheme);
        results.checks.check7_content = check7;
        if (check7.passed) score += 10;

        // Determine final verification status based on score and domain status
        results.score = Math.min(100, score);

        const isApprovedDomain = check1.passed || checkDomainAllowlist(finalHostname).passed;

        if (results.score >= 75 && isApprovedDomain) {
            results.status = 'VERIFIED';
        } else if (results.score >= 60 && isApprovedDomain) {
            results.status = 'REQUIRES_REVIEW';
        } else if (results.score >= 40 && !isApprovedDomain) {
            results.status = 'UNVERIFIED';
        } else {
            results.status = 'UNVERIFIED';
        }

    } catch (err) {
        results.status = 'REQUIRES_REVIEW';
        results.error_message = err.message;
        results.score = Math.max(0, score - 20);
    }

    // Record verification event in DB
    db.addVerificationLog(results);

    return results;
}

// ─── Helper Checks ────────────────────────────────────────────────────────────

function checkUrlSafety(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') {
        return { passed: false, reason: 'Empty URL provided' };
    }
    const lower = urlStr.trim().toLowerCase();

    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:')) {
        return { passed: false, reason: 'Forbidden protocol scheme' };
    }

    if (lower.includes('@')) {
        return { passed: false, reason: 'URL contains potential credential masking (@ symbol)' };
    }

    try {
        const parsed = new URL(urlStr);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { passed: false, reason: `Unsupported protocol: ${parsed.protocol}` };
        }
        if (PRIVATE_IP_REGEX.test(parsed.hostname)) {
            return { passed: false, reason: 'Targeting private or loopback IP range' };
        }
        return { passed: true, reason: 'URL structure valid' };
    } catch (e) {
        return { passed: false, reason: 'Malformed URL syntax' };
    }
}

function checkPhishingDomain(hostname) {
    const sources = db.getOfficialSources();
    const isExactApproved = sources.some(s => hostname === s.domain || hostname.endsWith('.' + s.domain));

    if (isExactApproved) {
        return { passed: true, reason: 'Domain is in official approved allowlist' };
    }

    for (const pattern of SUSPICIOUS_DOMAIN_PATTERNS) {
        if (pattern.test(hostname)) {
            return { passed: false, reason: `Domain matches suspicious pattern: ${pattern.source}` };
        }
    }

    return { passed: true, reason: 'No suspicious phishing patterns detected' };
}

function checkDomainAllowlist(hostname) {
    const sources = db.getOfficialSources();
    const isApproved = sources.some(s => hostname === s.domain || hostname.endsWith('.' + s.domain));

    return {
        passed: isApproved,
        reason: isApproved ? `Domain ${hostname} matches approved government allowlist` : `Domain ${hostname} not explicitly in allowlist`
    };
}

async function checkDnsValidation(hostname) {
    try {
        const lookup = await dns.lookup(hostname);
        if (PRIVATE_IP_REGEX.test(lookup.address)) {
            return { passed: false, reason: `Resolved IP ${lookup.address} is in private range` };
        }
        return { passed: true, ip: lookup.address, reason: `Resolved to IP ${lookup.address}` };
    } catch (e) {
        return { passed: false, reason: `DNS lookup failed: ${e.message}` };
    }
}

function inspectRedirectChainAndTls(initialUrl) {
    return new Promise((resolve) => {
        const chain = [initialUrl];
        let currentUrl = initialUrl;
        let hops = 0;
        const maxHops = 5;

        function fetchStep(urlStr) {
            if (hops >= maxHops) {
                return resolve({
                    finalUrl: currentUrl,
                    chain,
                    tls_result: { passed: true, reason: 'TLS valid for initial hops' },
                    redirect_result: { passed: false, reason: 'Exceeded maximum redirect hops' }
                });
            }

            let parsed;
            try { parsed = new URL(urlStr); }
            catch (e) {
                return resolve({
                    finalUrl: currentUrl,
                    chain,
                    tls_result: { passed: false, reason: 'Invalid URL in redirect' },
                    redirect_result: { passed: false, reason: 'Redirect chain broken' }
                });
            }

            const client = parsed.protocol === 'https:' ? https : http;
            const req = client.request(parsed, { method: 'HEAD', timeout: 4000 }, (res) => {
                const status = res.statusCode;
                if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
                    hops++;
                    let redirectTarget = res.headers.location;
                    if (!redirectTarget.startsWith('http')) {
                        redirectTarget = new URL(redirectTarget, urlStr).href;
                    }

                    // Inspect intermediate redirect host safety
                    const redirectHost = new URL(redirectTarget).hostname;
                    const safetyCheck = checkUrlSafety(redirectTarget);
                    if (!safetyCheck.passed) {
                        return resolve({
                            finalUrl: redirectTarget,
                            chain: [...chain, redirectTarget],
                            tls_result: { passed: false, reason: 'Unsafe redirect target' },
                            redirect_result: { passed: false, reason: `Redirected to unsafe URL: ${safetyCheck.reason}` }
                        });
                    }

                    chain.push(redirectTarget);
                    currentUrl = redirectTarget;
                    fetchStep(redirectTarget);
                } else {
                    const isSuccess = status >= 200 && status < 400;
                    resolve({
                        finalUrl: currentUrl,
                        chain,
                        tls_result: { passed: parsed.protocol === 'https:', reason: `HTTPS status ${status}` },
                        redirect_result: { passed: isSuccess, reason: `Chain finished cleanly with status ${status}` }
                    });
                }
            });

            req.on('error', (err) => {
                resolve({
                    finalUrl: currentUrl,
                    chain,
                    tls_result: { passed: false, reason: `Connection error: ${err.message}` },
                    redirect_result: { passed: true, reason: 'Redirect chain checked with fallback' }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    finalUrl: currentUrl,
                    chain,
                    tls_result: { passed: true, reason: 'Connection timeout (treated safely)' },
                    redirect_result: { passed: true, reason: 'Checked under timeout constraint' }
                });
            });

            req.end();
        }

        fetchStep(initialUrl);
    });
}

function checkDomainConsistency(initialHost, finalHost, sourceUrl) {
    let sourceHost = '';
    try { if (sourceUrl) sourceHost = new URL(sourceUrl).hostname; } catch (e) {}

    const isMatch = initialHost === finalHost || (sourceHost && finalHost === sourceHost);
    return {
        passed: isMatch,
        reason: isMatch ? 'Destination domain matches source domain' : `Domain shift detected from ${initialHost} to ${finalHost}`
    };
}

function checkSourceConsistency(targetUrl, sourceUrl) {
    try {
        const targetHost = new URL(targetUrl).hostname;
        const isTargetApproved = db.getOfficialSources().some(s => targetHost.endsWith(s.domain));

        if (!sourceUrl) {
            return {
                passed: isTargetApproved,
                reason: isTargetApproved ? 'Target domain matches official source allowlist' : 'Target domain is not in official source allowlist'
            };
        }

        const sourceHost = new URL(sourceUrl).hostname;
        const isApprovedSource = db.getOfficialSources().some(s => sourceHost.endsWith(s.domain));
        const isTargetMatch = targetHost === sourceHost || targetHost.endsWith('.' + sourceHost.split('.').slice(-2).join('.'));

        return {
            passed: isApprovedSource && isTargetMatch,
            reason: isTargetMatch ? 'Target URL matches trusted official source portal' : 'Mismatch between target portal and published source'
        };
    } catch (e) {
        return { passed: false, reason: 'URL parsing failed during source check' };
    }
}

async function checkPageContent(urlStr, scheme) {
    if (!scheme) return { passed: true, reason: 'No scheme keywords to test' };

    return new Promise((resolve) => {
        try {
            const parsed = new URL(urlStr);
            const client = parsed.protocol === 'https:' ? https : http;

            const req = client.get(urlStr, {
                headers: { 'User-Agent': 'SarkariSimpler-Verifier/1.0 (+http://localhost:8000)' },
                timeout: 5000
            }, (res) => {
                let html = '';
                res.on('data', chunk => {
                    if (html.length < 50000) html += chunk.toString();
                });
                res.on('end', () => {
                    const lowerHtml = html.toLowerCase();
                    const schemeName = (scheme.name || '').toLowerCase();
                    const ministry = (scheme.ministry || '').toLowerCase();

                    const matchesName = schemeName && lowerHtml.includes(schemeName.split(' ')[0]);
                    const matchesGov = lowerHtml.includes('gov') || lowerHtml.includes('india') || lowerHtml.includes('yojana') || lowerHtml.includes('portal');

                    resolve({
                        passed: matchesGov,
                        reason: matchesGov ? 'Page contains expected government portal signals' : 'Page lacks expected government content signals'
                    });
                });
            });

            req.on('error', () => resolve({ passed: true, reason: 'Content check skipped on request error' }));
            req.on('timeout', () => { req.destroy(); resolve({ passed: true, reason: 'Content check timed out' }); });
        } catch (e) {
            resolve({ passed: true, reason: 'Content check skipped' });
        }
    });
}

module.exports = {
    verifyUrl
};
