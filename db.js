/**
 * SARKARI SIMPLER - Structured Database Engine (db.js)
 * Relational file-backed JSON database serving as single source of truth.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_SCHEMES_FILE = path.join(DATA_DIR, 'seed-schemes.json');
const SEED_DOCUMENTS_FILE = path.join(DATA_DIR, 'seed-documents.json');

const INITIAL_ALLOWLIST = [
    { domain: 'gov.in', description: 'Official Government of India portal domain', category: 'Government' },
    { domain: 'nic.in', description: 'National Informatics Centre domain', category: 'Government' },
    { domain: 'ac.in', description: 'Indian Academic Institutions domain', category: 'Education' },
    { domain: 'org.in', description: 'Indian Non-Profit/Organization domain (Selected)', category: 'Organization' },
    { domain: 'scholarships.gov.in', description: 'National Scholarship Portal', category: 'Education' },
    { domain: 'mudra.org.in', description: 'Mudra Loan Official Portal', category: 'Financial' },
    { domain: 'standupmitra.in', description: 'StandUp Mitra Portal', category: 'Financial' },
    { domain: 'maandhan.in', description: 'PM Maandhan Pension Portal', category: 'Social Security' }
];

let dbMemory = {
    schemes: [],
    documents: [],
    official_sources: INITIAL_ALLOWLIST,
    verification_logs: [],
    scheme_updates: [],
    users: [],
    saved_schemes: {} // userId -> array of schemeIds
};

const OFFICIAL_CATEGORIES = [
    "Agriculture, Rural & Environment",
    "Banking, Financial Services and Insurance",
    "Business & Entrepreneurship",
    "Education & Learning",
    "Health & Wellness",
    "Housing & Shelter",
    "Public Safety, Law & Justice",
    "Science, IT & Communications",
    "Skills & Employment",
    "Social Welfare & Empowerment",
    "Sports & Culture",
    "Transport & Infrastructure",
    "Travel & Tourism",
    "Utility & Sanitation",
    "Women and Child"
];

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadDB() {
    ensureDataDir();
    
    // Always load fresh seeds
    let seedSchemes = [];
    let seedDocs = [];
    try {
        if (fs.existsSync(SEED_SCHEMES_FILE)) {
            seedSchemes = JSON.parse(fs.readFileSync(SEED_SCHEMES_FILE, 'utf8'));
        }
        if (fs.existsSync(SEED_DOCUMENTS_FILE)) {
            seedDocs = JSON.parse(fs.readFileSync(SEED_DOCUMENTS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[DB] Failed to load seed files:', e.message);
    }

    dbMemory = {
        schemes: seedSchemes,
        documents: seedDocs,
        official_sources: INITIAL_ALLOWLIST,
        verification_logs: [],
        scheme_updates: [],
        users: [
            {
                id: 'admin_1',
                email: 'admin@sarkarisimpler.gov.in',
                name: 'System Admin',
                passwordHash: '$2b$10$e8Q.S9JvJ0yV3uLzO9pQxe.r6v8u1S7Z3w0q0q0q0q0q0q0q0q0q0', // admin123
                role: 'admin',
                created_at: new Date().toISOString()
            }
        ],
        saved_schemes: {}
    };

    saveDB();
    console.log(`[DB] Initialized database with ${dbMemory.schemes.length} schemes and ${dbMemory.documents.length} documents.`);
}

function saveDB() {
    ensureDataDir();
    try {
        const tempFile = DB_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(dbMemory, null, 2), 'utf8');
        fs.renameSync(tempFile, DB_FILE);
        return true;
    } catch (e) {
        console.error('[DB] Save error:', e.message);
        return false;
    }
}

// Initialize on module load
loadDB();

module.exports = {
    // ─── Scheme CRUD ────────────────────────────────────────────────────────
    getAllSchemes: (filters = {}) => {
        let list = [...dbMemory.schemes];
        if (filters.category) {
            list = list.filter(s => s.category.toLowerCase() === filters.category.toLowerCase());
        }
        if (filters.state) {
            list = list.filter(s => s.state.toLowerCase() === 'all india' || s.state.toLowerCase() === filters.state.toLowerCase());
        }
        if (filters.ministry) {
            list = list.filter(s => s.ministry.toLowerCase().includes(filters.ministry.toLowerCase()));
        }
        if (filters.status) {
            list = list.filter(s => s.scheme_status === filters.status);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                s.ministry.toLowerCase().includes(q)
            );
        }
        return list;
    },

    getSchemeById: (id) => {
        return dbMemory.schemes.find(s => s.id === id);
    },

    addScheme: (schemeData) => {
        const id = schemeData.id || 'scheme_' + Date.now();
        const newScheme = {
            id,
            name: schemeData.name || 'Unnamed Scheme',
            description: schemeData.description || '',
            category: schemeData.category || 'General',
            state: schemeData.state || 'All India',
            government_level: schemeData.government_level || 'Central',
            ministry: schemeData.ministry || 'Government of India',
            benefits: Array.isArray(schemeData.benefits) ? schemeData.benefits : [],
            eligibility: schemeData.eligibility || { age_min: 0, age_max: 100, income_max: 10000000 },
            documents: Array.isArray(schemeData.documents) ? schemeData.documents : [],
            application_steps: Array.isArray(schemeData.application_steps) ? schemeData.application_steps : [],
            official_url: schemeData.official_url || '',
            source_url: schemeData.source_url || schemeData.official_url || '',
            last_verified: new Date().toISOString(),
            verification_status: schemeData.verification_status || 'REQUIRES_REVIEW',
            verification_score: schemeData.verification_score || 50,
            verification_method: schemeData.verification_method || 'Manual Add',
            scheme_status: schemeData.scheme_status || 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        dbMemory.schemes.unshift(newScheme);
        saveDB();
        return newScheme;
    },

    updateScheme: (id, updateData) => {
        const idx = dbMemory.schemes.findIndex(s => s.id === id);
        if (idx === -1) return null;

        dbMemory.schemes[idx] = {
            ...dbMemory.schemes[idx],
            ...updateData,
            updated_at: new Date().toISOString()
        };
        saveDB();
        return dbMemory.schemes[idx];
    },

    deleteScheme: (id) => {
        const idx = dbMemory.schemes.findIndex(s => s.id === id);
        if (idx === -1) return false;
        dbMemory.schemes.splice(idx, 1);
        saveDB();
        return true;
    },

    // ─── Documents CRUD ──────────────────────────────────────────────────────
    getAllDocuments: () => [...dbMemory.documents],

    getDocumentById: (id) => dbMemory.documents.find(d => d.id === id),

    // ─── Allowlist / Official Sources ─────────────────────────────────────────
    getOfficialSources: () => [...dbMemory.official_sources],

    addOfficialSource: (source) => {
        if (!dbMemory.official_sources.some(s => s.domain === source.domain)) {
            dbMemory.official_sources.push(source);
            saveDB();
        }
        return dbMemory.official_sources;
    },

    // ─── Verification Logs ────────────────────────────────────────────────────
    addVerificationLog: (logEntry) => {
        const log = {
            id: 'vlog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            checked_at: new Date().toISOString(),
            ...logEntry
        };
        dbMemory.verification_logs.unshift(log);
        if (dbMemory.verification_logs.length > 500) dbMemory.verification_logs.pop();
        saveDB();
        return log;
    },

    getVerificationLogs: (limit = 50) => {
        return dbMemory.verification_logs.slice(0, limit);
    },

    // ─── Scheme Updates ───────────────────────────────────────────────────────
    addSchemeUpdate: (update) => {
        const record = {
            id: 'upd_' + Date.now(),
            detected_at: new Date().toISOString(),
            status: 'PENDING_REVIEW',
            ...update
        };
        dbMemory.scheme_updates.unshift(record);
        saveDB();
        return record;
    },

    getSchemeUpdates: (status) => {
        if (!status) return [...dbMemory.scheme_updates];
        return dbMemory.scheme_updates.filter(u => u.status === status);
    },

    updateSchemeUpdateStatus: (id, newStatus) => {
        const item = dbMemory.scheme_updates.find(u => u.id === id);
        if (item) {
            item.status = newStatus;
            item.reviewed_at = new Date().toISOString();
            saveDB();
        }
        return item;
    },

    // ─── Stats ────────────────────────────────────────────────────────────────
    getStats: () => {
        const schemes = dbMemory.schemes;
        const categories = [...new Set(schemes.map(s => s.category))];
        const states = [...new Set(schemes.map(s => s.state))];
        const verifiedCount = schemes.filter(s => s.verification_status === 'VERIFIED').length;
        const totalLogs = dbMemory.verification_logs.length;

        return {
            totalSchemes: schemes.length,
            verifiedSchemes: verifiedCount,
            totalCategories: categories.length,
            categories,
            totalStates: states.length,
            totalDocuments: dbMemory.documents.length,
            totalLogs,
            lastUpdated: new Date().toISOString()
        };
    },

    getExploreMetadata: () => {
        const schemes = dbMemory.schemes;
        const categoryCounts = {};
        OFFICIAL_CATEGORIES.forEach(cat => { categoryCounts[cat] = 0; });
        schemes.forEach(s => {
            if (categoryCounts[s.category] !== undefined) categoryCounts[s.category]++;
            else categoryCounts[s.category] = 1;
        });

        const stateCounts = {};
        const ALL_STATES = ["All India", "Haryana", "Uttar Pradesh", "Maharashtra", "Tamil Nadu", "West Bengal", "Bihar", "Punjab", "Gujarat", "Rajasthan", "Karnataka", "Kerala", "Odisha", "Madhya Pradesh", "Assam", "Telangana"];
        ALL_STATES.forEach(st => { stateCounts[st] = 0; });
        schemes.forEach(s => {
            const st = s.state || 'All India';
            if (stateCounts[st] !== undefined) stateCounts[st]++;
            else stateCounts[st] = 1;
        });

        const ministryCounts = {};
        schemes.forEach(s => {
            const min = s.ministry || 'Central Ministry';
            ministryCounts[min] = (ministryCounts[min] || 0) + 1;
        });

        const categoryIcons = {
            "Agriculture, Rural & Environment": "🌾",
            "Banking, Financial Services and Insurance": "🏦",
            "Business & Entrepreneurship": "💼",
            "Education & Learning": "🎓",
            "Health & Wellness": "🏥",
            "Housing & Shelter": "🏠",
            "Public Safety, Law & Justice": "⚖️",
            "Science, IT & Communications": "💻",
            "Skills & Employment": "🛠️",
            "Social Welfare & Empowerment": "🤝",
            "Sports & Culture": "🏆",
            "Transport & Infrastructure": "🛣️",
            "Travel & Tourism": "✈️",
            "Utility & Sanitation": "🚿",
            "Women and Child": "👩‍👧"
        };

        const categoriesList = OFFICIAL_CATEGORIES.map(cat => ({
            name: cat,
            count: categoryCounts[cat] || 0,
            icon: categoryIcons[cat] || "📜"
        }));

        const statesList = Object.keys(stateCounts).map(st => ({
            name: st,
            count: stateCounts[st]
        }));

        const ministriesList = Object.keys(ministryCounts).map(min => ({
            name: min,
            count: ministryCounts[min]
        }));

        return {
            categories: categoriesList,
            states: statesList,
            ministries: ministriesList
        };
    },

    // ─── Users & Auth ─────────────────────────────────────────────────────────
    getUserByEmail: (email) => {
        return dbMemory.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    },

    getUserById: (id) => {
        return dbMemory.users.find(u => u.id === id);
    },

    createUser: (userData) => {
        const newUser = {
            id: 'user_' + Date.now(),
            email: userData.email,
            name: userData.name || userData.email.split('@')[0],
            passwordHash: userData.passwordHash,
            role: userData.role || 'citizen',
            created_at: new Date().toISOString()
        };
        dbMemory.users.push(newUser);
        saveDB();
        return newUser;
    },

    // ─── Saved Schemes ────────────────────────────────────────────────────────
    getSavedSchemes: (userId) => {
        const schemeIds = dbMemory.saved_schemes[userId] || [];
        return dbMemory.schemes.filter(s => schemeIds.includes(s.id));
    },

    toggleSavedScheme: (userId, schemeId) => {
        if (!dbMemory.saved_schemes[userId]) dbMemory.saved_schemes[userId] = [];
        const arr = dbMemory.saved_schemes[userId];
        const idx = arr.indexOf(schemeId);
        let saved = false;
        if (idx === -1) {
            arr.push(schemeId);
            saved = true;
        } else {
            arr.splice(idx, 1);
            saved = false;
        }
        saveDB();
        return { saved, count: arr.length };
    },
    
    OFFICIAL_CATEGORIES
};
