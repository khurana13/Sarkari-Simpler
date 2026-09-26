/**
 * SARKARI SIMPLER - Deterministic Eligibility & Recommendation Engine (eligibility.js)
 * Evaluates citizen profile against scheme criteria criterion-by-criterion.
 */

const db = require('./db');

/**
 * Evaluate a single scheme against a citizen profile.
 * @param {Object} scheme - Structured scheme object from DB
 * @param {Object} profile - Citizen profile { age, state, occupation, annual_income, gender, beneficiary_type, support_category }
 */
function evaluateSchemeEligibility(scheme, profile) {
    const rules = scheme.eligibility || {};
    const explanations = [];
    let passedCount = 0;
    let totalCriteria = 0;
    let failedCritical = false;

    const userAge = parseInt(profile.age || 25, 10);
    const userIncome = parseFloat(profile.annual_income || profile.income || 150000);
    const userState = (profile.state || 'All India').trim();
    const userOccupation = (profile.occupation || 'Other').trim();
    const userGender = (profile.gender || 'All').trim();

    // 1. State Check
    totalCriteria++;
    const schemeState = scheme.state || 'All India';
    if (schemeState === 'All India' || userState === 'All India' || schemeState.toLowerCase() === userState.toLowerCase()) {
        passedCount++;
        explanations.push({ criterion: 'State', status: 'PASS', text: `✓ Eligible for your region (${userState})` });
    } else {
        failedCritical = true;
        explanations.push({ criterion: 'State', status: 'FAIL', text: `✗ Available in ${schemeState}, but your profile state is ${userState}` });
    }

    // 2. Age Check
    if (rules.age_min !== undefined || rules.age_max !== undefined) {
        totalCriteria++;
        const minAge = rules.age_min ?? 0;
        const maxAge = rules.age_max ?? 100;
        if (userAge >= minAge && userAge <= maxAge) {
            passedCount++;
            explanations.push({ criterion: 'Age', status: 'PASS', text: `✓ Age ${userAge} falls within required bracket (${minAge}–${maxAge} years)` });
        } else {
            failedCritical = true;
            explanations.push({ criterion: 'Age', status: 'FAIL', text: `✗ Age ${userAge} is outside required bracket (${minAge}–${maxAge} years)` });
        }
    }

    // 3. Income Check
    if (rules.income_max !== undefined && rules.income_max < 10000000) {
        totalCriteria++;
        if (userIncome <= rules.income_max) {
            passedCount++;
            explanations.push({ criterion: 'Income', status: 'PASS', text: `✓ Annual income ₹${userIncome.toLocaleString('en-IN')} is within maximum limit of ₹${rules.income_max.toLocaleString('en-IN')}` });
        } else {
            failedCritical = true;
            explanations.push({ criterion: 'Income', status: 'FAIL', text: `✗ Annual income ₹${userIncome.toLocaleString('en-IN')} exceeds eligibility cap of ₹${rules.income_max.toLocaleString('en-IN')}` });
        }
    }

    // 4. Occupation Check
    if (rules.occupations && Array.isArray(rules.occupations) && rules.occupations.length > 0) {
        totalCriteria++;
        const isAllOcc = rules.occupations.map(o => o.toLowerCase()).includes('all');
        const isOccMatch = isAllOcc || rules.occupations.some(o => o.toLowerCase() === userOccupation.toLowerCase() || userOccupation.toLowerCase().includes(o.toLowerCase()));

        if (isOccMatch) {
            passedCount++;
            explanations.push({ criterion: 'Occupation', status: 'PASS', text: `✓ Occupation (${userOccupation}) matches target beneficiary group` });
        } else {
            explanations.push({ criterion: 'Occupation', status: 'FAIL', text: `✗ Target group is ${rules.occupations.join(', ')}, but your occupation is ${userOccupation}` });
        }
    }

    // 5. Gender Check
    if (rules.genders && Array.isArray(rules.genders) && rules.genders.length > 0) {
        const isAllGender = rules.genders.map(g => g.toLowerCase()).includes('all');
        const isGenderMatch = isAllGender || rules.genders.some(g => g.toLowerCase() === userGender.toLowerCase());

        if (!isAllGender) {
            totalCriteria++;
            if (isGenderMatch) {
                passedCount++;
                explanations.push({ criterion: 'Gender', status: 'PASS', text: `✓ Gender criteria satisfied (${userGender})` });
            } else {
                failedCritical = true;
                explanations.push({ criterion: 'Gender', status: 'FAIL', text: `✗ Scheme is specifically tailored for ${rules.genders.join(', ')}` });
            }
        }
    }

    // Determine overall result
    let status = 'POTENTIALLY_ELIGIBLE';
    const matchRatio = totalCriteria > 0 ? passedCount / totalCriteria : 1.0;

    if (failedCritical) {
        status = 'NOT_ELIGIBLE';
    } else if (matchRatio >= 0.8) {
        status = 'ELIGIBLE';
    } else {
        status = 'POTENTIALLY_ELIGIBLE';
    }

    // Calculate score (0-100)
    let score = Math.round(matchRatio * 70);

    // Boost score for specific support category match
    if (profile.support_category && scheme.category.toLowerCase() === profile.support_category.toLowerCase()) {
        score += 30;
    } else {
        score += 15;
    }

    return {
        scheme_id: scheme.id,
        scheme_name: scheme.name,
        category: scheme.category,
        official_url: scheme.official_url,
        verification_status: scheme.verification_status,
        status,
        score: Math.min(100, score),
        passedCriteria: passedCount,
        totalCriteria,
        explanations
    };
}

/**
 * "Find Schemes for Me" Recommendation Engine
 * Evaluates all schemes in DB and returns ranked candidate recommendations with explainability.
 * @param {Object} profile - User profile object
 */
function findSchemesForMe(profile) {
    const allSchemes = db.getAllSchemes({ status: 'ACTIVE' });

    const results = allSchemes.map(scheme => {
        const evalResult = evaluateSchemeEligibility(scheme, profile);
        return {
            scheme,
            evaluation: evalResult
        };
    });

    // Exclude strictly NOT_ELIGIBLE schemes or sort them to the bottom
    results.sort((a, b) => b.evaluation.score - a.evaluation.score);

    const eligibleList = results.filter(r => r.evaluation.status !== 'NOT_ELIGIBLE');
    const displayList = eligibleList.length > 0 ? eligibleList : results;

    return {
        profile,
        total_found: displayList.length,
        recommendations: displayList.map(item => ({
            ...item.scheme,
            match_score: item.evaluation.score,
            eligibility_status: item.evaluation.status,
            explanations: item.evaluation.explanations
        }))
    };
}

module.exports = {
    evaluateSchemeEligibility,
    findSchemesForMe
};
