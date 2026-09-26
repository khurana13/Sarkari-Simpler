/**
 * Integration Test Suite for Sarkari Simpler REST API Endpoints
 */

const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : '';
        const req = http.request({
            hostname: 'localhost',
            port: 8787,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            timeout: 5000
        }, (res) => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(resData) });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: resData });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        if (postData) req.write(postData);
        req.end();
    });
}

async function runApiTests() {
    console.log('==================================================');
    console.log(' RUNNING API INTEGRATION TEST SUITE');
    console.log('==================================================\n');

    let passed = 0;
    let total = 0;

    async function test(name, fn) {
        total++;
        process.stdout.write(`[Test ${total}] ${name}... `);
        try {
            await fn();
            console.log('✅ PASSED');
            passed++;
        } catch (e) {
            console.log(`❌ FAILED: ${e.message}`);
        }
    }

    // 1. Health check
    await test('GET /health', async () => {
        const res = await makeRequest('/health');
        if (res.status !== 200 || res.data.status !== 'healthy') throw new Error(`Unexpected response: ${res.status}`);
    });

    // 2. Stats
    await test('GET /api/stats', async () => {
        const res = await makeRequest('/api/stats');
        if (res.status !== 200 || res.data.totalSchemes === undefined) throw new Error('Failed to fetch stats');
    });

    // 3. List Schemes
    await test('GET /api/schemes', async () => {
        const res = await makeRequest('/api/schemes');
        if (res.status !== 200 || !Array.isArray(res.data.schemes)) throw new Error('Failed to list schemes');
    });

    // 4. Scheme details
    await test('GET /api/schemes/pm_kisan', async () => {
        const res = await makeRequest('/api/schemes/pm_kisan');
        if (res.status !== 200 || res.data.id !== 'pm_kisan') throw new Error('Failed to get PM-Kisan scheme details');
    });

    // 5. Eligibility Check
    await test('POST /api/eligibility/check', async () => {
        const res = await makeRequest('/api/eligibility/check', 'POST', {
            scheme_id: 'pm_kisan',
            profile: { age: 30, state: 'Haryana', occupation: 'Farmer', annual_income: 100000 }
        });
        if (res.status !== 200 || !res.data.status) throw new Error('Eligibility check failed');
    });

    // 6. Find Schemes for Me
    await test('POST /api/recommendations', async () => {
        const res = await makeRequest('/api/recommendations', 'POST', {
            profile: { age: 25, state: 'Haryana', occupation: 'Student', annual_income: 50000, support_category: 'Education' }
        });
        if (res.status !== 200 || !Array.isArray(res.data.recommendations)) throw new Error('Recommendations failed');
    });

    // 7. Verify URL endpoint
    await test('GET /api/schemes/pm_kisan/verify-url', async () => {
        const res = await makeRequest('/api/schemes/pm_kisan/verify-url');
        if (res.status !== 200 || !res.data.status) throw new Error('Verify URL failed');
    });

    // 8. Apply Redirection JSON status
    await test('GET /api/schemes/pm_kisan/apply?format=json', async () => {
        const res = await makeRequest('/api/schemes/pm_kisan/apply?format=json');
        if (res.status !== 200 || !res.data.official_url) throw new Error('Apply endpoint failed');
    });

    // 9. Documents list
    await test('GET /api/documents', async () => {
        const res = await makeRequest('/api/documents');
        if (res.status !== 200 || !Array.isArray(res.data.documents)) throw new Error('Documents endpoint failed');
    });

    console.log(`\n--------------------------------------------------`);
    console.log(`API TESTS SUMMARY: ${passed}/${total} PASSED.`);
    console.log(`--------------------------------------------------\n`);

    if (passed !== total) process.exit(1);
}

runApiTests();
