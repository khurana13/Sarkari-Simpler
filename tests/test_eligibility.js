/**
 * Unit Tests for Deterministic Eligibility & Recommendation Engine (eligibility.js)
 */

const db = require('../db');
const eligibility = require('../eligibility');

function runEligibilityTests() {
    console.log('==================================================');
    console.log(' RUNNING ELIGIBILITY ENGINE TESTS');
    console.log('==================================================\n');

    let passed = 0;
    let total = 0;

    function assert(condition, message) {
        total++;
        if (condition) {
            console.log(`[Test ${total}] ✅ PASS: ${message}`);
            passed++;
        } else {
            console.log(`[Test ${total}] ❌ FAIL: ${message}`);
        }
    }

    const pmKisan = db.getSchemeById('pm_kisan');
    const ayushman = db.getSchemeById('ayushman_bharat');
    const sukanya = db.getSchemeById('sukanya_samriddhi');

    // 1. PM-Kisan evaluation for landholding farmer
    const farmerProfile = { age: 35, state: 'Haryana', occupation: 'Farmer', annual_income: 120000, gender: 'Male' };
    const res1 = eligibility.evaluateSchemeEligibility(pmKisan, farmerProfile);
    assert(res1.status === 'ELIGIBLE' || res1.status === 'POTENTIALLY_ELIGIBLE', 'Farmer matches PM-Kisan criteria');

    // 2. Sukanya Samriddhi gender fail test for male child
    const maleChildProfile = { age: 5, state: 'Delhi', occupation: 'Student', annual_income: 100000, gender: 'Male' };
    const res2 = eligibility.evaluateSchemeEligibility(sukanya, maleChildProfile);
    assert(res2.status === 'NOT_ELIGIBLE', 'Male child fails Sukanya Samriddhi gender criteria');

    // 3. Find Schemes for Me test
    const recs = eligibility.findSchemesForMe({
        state: 'Haryana',
        age: 24,
        occupation: 'Student',
        annual_income: 80000,
        support_category: 'Education'
    });
    assert(recs.recommendations.length > 0, 'Find Schemes for Me returns ranked list');
    assert(recs.recommendations[0].match_score >= 50, 'Top recommended scheme has high score');

    console.log(`\n--------------------------------------------------`);
    console.log(`ELIGIBILITY TESTS SUMMARY: ${passed}/${total} PASSED.`);
    console.log(`--------------------------------------------------\n`);

    if (passed !== total) process.exit(1);
}

runEligibilityTests();
