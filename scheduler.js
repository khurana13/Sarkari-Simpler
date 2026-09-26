/**
 * SARKARI SIMPLER - Background Scheduled Verification Service (scheduler.js)
 * Service abstraction for automated background link & content verification.
 */

const db = require('./db');
const ingestor = require('./ingestor');

let timerHandle = null;

/**
 * Run full verification sweep across all active schemes in DB.
 */
async function runVerificationSweep() {
    console.log(`\n[SCHEDULER] 🔄 Starting scheduled verification sweep at ${new Date().toISOString()}...`);
    const activeSchemes = db.getAllSchemes({ status: 'ACTIVE' });

    let verifiedCount = 0;
    let reviewCount = 0;
    let failedCount = 0;

    for (const scheme of activeSchemes) {
        try {
            const res = await ingestor.processSchemeUpdateCheck(scheme.id);
            if (res.verification) {
                if (res.verification.status === 'VERIFIED') verifiedCount++;
                else if (res.verification.status === 'REQUIRES_REVIEW') reviewCount++;
                else failedCount++;
            }
        } catch (e) {
            console.error(`[SCHEDULER] Error verifying scheme ${scheme.id}:`, e.message);
            failedCount++;
        }
    }

    console.log(`[SCHEDULER] ✅ Sweep completed! Verified: ${verifiedCount} | Review: ${reviewCount} | Failed/Blocked: ${failedCount}\n`);
    return {
        timestamp: new Date().toISOString(),
        total: activeSchemes.length,
        verifiedCount,
        reviewCount,
        failedCount
    };
}

/**
 * Start the background scheduler timer (e.g. every 12 hours)
 */
function startScheduler(intervalMs = 12 * 60 * 60 * 1000) {
    if (timerHandle) clearInterval(timerHandle);

    console.log(`[SCHEDULER] Background scheduler service started (interval: ${intervalMs / 1000}s).`);

    // Run initial sweep 10 seconds after server launch
    setTimeout(() => {
        runVerificationSweep().catch(e => console.error('[SCHEDULER] Initial sweep error:', e.message));
    }, 10000);

    timerHandle = setInterval(() => {
        runVerificationSweep().catch(e => console.error('[SCHEDULER] Periodic sweep error:', e.message));
    }, intervalMs);
}

function stopScheduler() {
    if (timerHandle) {
        clearInterval(timerHandle);
        timerHandle = null;
        console.log('[SCHEDULER] Scheduler service stopped.');
    }
}

module.exports = {
    startScheduler,
    stopScheduler,
    runVerificationSweep
};
