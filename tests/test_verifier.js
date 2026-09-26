/**
 * Unit Tests for Official URL Verification Engine (verifier.js)
 * Tests malicious targets, SSRF protection, domain allowlists, and redirect safety.
 */

const verifier = require('../verifier');

async function runVerifierTests() {
    console.log('==================================================');
    console.log(' RUNNING VERIFICATION ENGINE TESTS');
    console.log('==================================================\n');

    let passed = 0;
    let total = 0;

    async function testCase(name, scheme, url, expectedStatus) {
        total++;
        process.stdout.write(`[Test ${total}] ${name}... `);
        try {
            const res = await verifier.verifyUrl(scheme, url);
            if (res.status === expectedStatus) {
                console.log(`✅ PASSED (Status: ${res.status}, Score: ${res.score})`);
                passed++;
            } else {
                console.log(`❌ FAILED (Expected: ${expectedStatus}, Got: ${res.status}, Score: ${res.score}, Reason: ${res.error_message})`);
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    const testScheme = { id: 'test_1', name: 'PM-Kisan', official_url: 'https://pmkisan.gov.in/' };

    // 1. Valid .gov.in domain
    await testCase('Valid Official .gov.in URL', testScheme, 'https://pmkisan.gov.in/', 'VERIFIED');

    // 2. Malicious javascript: URL
    await testCase('Reject javascript: XSS target', testScheme, 'javascript:alert(1)', 'BLOCKED');

    // 3. Localhost SSRF attempt
    await testCase('Reject Localhost SSRF target', testScheme, 'http://localhost:8787/admin', 'BLOCKED');

    // 4. Private IP Range 127.0.0.1
    await testCase('Reject Loopback IP 127.0.0.1', testScheme, 'http://127.0.0.1/secret', 'BLOCKED');

    // 5. Private IP Range 192.168.1.1
    await testCase('Reject Private Subnet 192.168.1.1', testScheme, 'http://192.168.1.1/router', 'BLOCKED');

    // 6. Typo-Squatting / Phishing Domain
    await testCase('Reject Phishing Domain pattern (gov-india-login.com)', testScheme, 'https://gov-india-login.com/kisan', 'BLOCKED');

    // 7. Credential Masking URL
    await testCase('Reject Credential Masking (@ symbol)', testScheme, 'https://trusted.gov.in@evil.com/phish', 'BLOCKED');

    // 8. Arbitrary external non-gov website
    await testCase('Flag Arbitrary External Site', testScheme, 'https://example.com/scheme', 'UNVERIFIED');

    console.log(`\n--------------------------------------------------`);
    console.log(`VERIFICATION TESTS SUMMARY: ${passed}/${total} PASSED.`);
    console.log(`--------------------------------------------------\n`);

    if (passed !== total) {
        process.exit(1);
    }
}

runVerifierTests();
