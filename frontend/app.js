// ==========================================================================
// SARKARI SIMPLER - Main App Logic (v2.0 - Enterprise Upgrade)
// ==========================================================================

const WORKER_URL = 'http://localhost:8787';

// All 16 official Indian languages
const LANGUAGES = [
    { code: 'en',  label: 'English' },
    { code: 'hi',  label: 'हिंदी (Hindi)' },
    { code: 'bn',  label: 'বাংলা (Bengali)' },
    { code: 'ta',  label: 'தமிழ் (Tamil)' },
    { code: 'te',  label: 'తెలుగు (Telugu)' },
    { code: 'mr',  label: 'मराठी (Marathi)' },
    { code: 'gu',  label: 'ગુજરાતી (Gujarati)' },
    { code: 'kn',  label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml',  label: 'മലയാളം (Malayalam)' },
    { code: 'pa',  label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'or',  label: 'ଓଡ଼ିଆ (Odia)' },
    { code: 'as',  label: 'অসমীয়া (Assamese)' },
    { code: 'ur',  label: 'اردو (Urdu)' },
    { code: 'mai', label: 'मैथिली (Maithili)' },
    { code: 'sat', label: 'Santali' },
    { code: 'ks',  label: 'Kashmiri' },
];

// State
let currentLanguage = localStorage.getItem('ss_language') || 'en';
let savedSchemes    = JSON.parse(localStorage.getItem('ss_savedSchemes') || '[]');
let myQueries       = JSON.parse(localStorage.getItem('ss_myQueries') || '[]');
let chatHistory     = [];  // [{role, content}]
let userProfile     = JSON.parse(localStorage.getItem('ss_userProfile') || 'null');
let authToken       = localStorage.getItem('ss_token') || null;

// ==========================================================================
// DOM REFERENCES
// ==========================================================================
const $ = id => document.getElementById(id);

const topNav        = $('topNav');
const langDropdown  = $('langDropdown');
const authLoginBtn  = $('authLoginBtn');
const userProfileBtn = $('userProfileBtn');
const authModal     = $('authModal');
const closeAuthModal = $('closeAuthModal');
const authForm      = $('authForm');
const authNameField = $('authNameField');
const authName      = $('authName');
const authEmail     = $('authEmail');
const authPassword  = $('authPassword');
const authToggleBtn = $('authToggleBtn');
const authTitle     = $('authTitle');
const authSubmitBtn = $('authSubmitBtn');
const authToggleText = $('authToggleText');
const profileSection = $('profileSection');
const logoutBtn      = $('logoutBtn');
const savedSchemesContainer = $('savedSchemesContainer');

// Sections
const homeSection    = $('homeSection');
const aboutSection   = $('aboutSection');
const schemesSection = $('schemesSection');

// Nav items
const navHome    = $('navHome');
const navSchemes = $('navSchemes');
const navAbout   = $('navAbout');

// Home search & Stats
const homeQueryInput  = $('homeQueryInput');
const homeSubmitBtn   = $('homeSubmitBtn');
const homeMicBtn      = $('homeMicBtn');
const statTotalSchemes = $('statTotalSchemes');
const statTotalCategories = $('statTotalCategories');
const statVerifiedPercent = $('statVerifiedPercent');
const statStates      = $('statStates');

// Schemes / chat panel
const schemesQueryInput = $('schemesQueryInput');
const schemesSubmitBtn  = $('schemesSubmitBtn');
const charCounter       = $('charCounter');
const chatMessagesContainer = $('chatMessagesContainer');
const chatMessages      = $('chatMessages');
const popularQuestionsGrid  = $('popularQuestionsGrid');
const inputActionsRow   = $('inputActionsRow');
const schemesVoiceBtn   = $('schemesVoiceBtn');
const examplesToggleBtn = $('examplesToggleBtn');

// Sidebar left
const newChatBtn            = $('newChatBtn');
const exploreSchemesBtn     = $('exploreSchemesBtn');
const savedSchemesLink      = $('savedSchemesLink');
const myQueriesLink         = $('myQueriesLink');
const findSchemesWizardBtn  = $('findSchemesWizardBtn');
const documentsLink         = $('documentsLink');
const adminPortalLink       = $('adminPortalLink');

// Modals
const findSchemesModal      = $('findSchemesModal');
const closeFindSchemesModal = $('closeFindSchemesModal');
const wizSubmitBtn          = $('wizSubmitBtn');
const schemeDetailsModal    = $('schemeDetailsModal');
const closeSchemeDetailsModal = $('closeSchemeDetailsModal');
const schemeDetailsBody     = $('schemeDetailsBody');

// ==========================================================================
// INIT
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    buildLanguageDropdown();
    initNavScroll();
    initNavLinks();
    initHomeSearch();
    initChat();
    initSidebar();
    initPopularQuestions();
    initSpeechRecognition();
    initModals();
    initFontScaler();
    initVirtualKeyboard();
    initAuth();

    fetchDynamicStats();
    showWelcomeState();
    updateLanguageUI();
});

// ==========================================================================
// DYNAMIC STATISTICS
// ==========================================================================
async function fetchDynamicStats() {
    try {
        const res = await fetch(`${WORKER_URL}/api/stats`);
        if (!res.ok) return;
        const data = await res.json();

        if (statTotalSchemes) statTotalSchemes.textContent = `${data.totalSchemes || 66}+`;
        if (statTotalCategories) statTotalCategories.textContent = `${data.totalCategories || 15}+`;
        if (statVerifiedPercent) statVerifiedPercent.textContent = `${data.verifiedSchemes && data.totalSchemes ? Math.round((data.verifiedSchemes / data.totalSchemes) * 100) : 100}%`;
        if (statStates) statStates.textContent = data.totalStates && data.totalStates > 1 ? `${data.totalStates} States & UTs` : 'All States & UTs';
    } catch (e) {
        // Fallback gracefully to default stats UI
    }
}

// ==========================================================================
// LANGUAGE DROPDOWN
// ==========================================================================
function buildLanguageDropdown() {
    if (!langDropdown) return;
    langDropdown.innerHTML = LANGUAGES.map(l =>
        `<option value="${l.code}"${l.code === currentLanguage ? ' selected' : ''}>${l.label}</option>`
    ).join('');

    langDropdown.addEventListener('change', e => {
        const newLang = e.target.value;
        currentLanguage = newLang;
        localStorage.setItem('ss_language', currentLanguage);
        
        const translateCombo = document.querySelector('.goog-te-combo');
        if (translateCombo) {
            translateCombo.value = newLang === 'en' ? 'en' : newLang;
            translateCombo.dispatchEvent(new Event('change'));
        } else {
            document.cookie = `googtrans=/en/${newLang}; path=/`;
            document.cookie = `googtrans=/en/${newLang}; domain=${window.location.hostname}; path=/`;
            window.location.reload();
        }
    });
}

function updateLanguageUI() {
    setTimeout(() => {
        const translateCombo = document.querySelector('.goog-te-combo');
        if (translateCombo && currentLanguage !== 'en') {
            translateCombo.value = currentLanguage;
            translateCombo.dispatchEvent(new Event('change'));
        }
    }, 1000);
}

// ==========================================================================
// NAV SCROLL
// ==========================================================================
function initNavScroll() {
    if (!topNav) return;
    window.addEventListener('scroll', () => {
        topNav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
}

// ==========================================================================
// NAVIGATION
// ==========================================================================
function switchSection(id) {
    [homeSection, aboutSection, schemesSection].forEach(s => {
        if (!s) return;
        s.classList.remove('active');
        s.style.display = 'none';
    });
    [navHome, navSchemes, navAbout].forEach(n => n && n.classList.remove('active'));

    const sectionMap = { home: homeSection, about: aboutSection, schemes: schemesSection };
    const navMap     = { home: navHome, about: navAbout, schemes: navSchemes };

    const target = sectionMap[id];
    const navItem = navMap[id];
    if (target) {
        target.style.display = 'block';
        void target.offsetWidth;
        target.classList.add('active');
    }
    if (navItem) navItem.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNavLinks() {
    navHome?.addEventListener('click', e => { e.preventDefault(); switchSection('home'); });
    navSchemes?.addEventListener('click', e => { e.preventDefault(); switchSection('schemes'); });
    navAbout?.addEventListener('click', e => { e.preventDefault(); switchSection('about'); });

    const handleGetStarted = (e) => {
        if (e) e.preventDefault();
        if (homeSection && homeSection.classList.contains('active')) {
            if (homeQueryInput) {
                homeQueryInput.focus();
                homeQueryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            switchSection('home');
            setTimeout(() => {
                if (homeQueryInput) homeQueryInput.focus();
            }, 300);
        }
    };

    $('navGetStartedBtn')?.addEventListener('click', handleGetStarted);
    document.querySelector('.nav-controls .btn-primary')?.addEventListener('click', handleGetStarted);
    document.querySelector('#aboutSection .btn-primary')?.addEventListener('click', () => switchSection('schemes'));
    $('navBookmarkBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection('schemes');
        if (typeof showSavedSchemes === 'function') showSavedSchemes();
    });
}

// ==========================================================================
// HOME SEARCH
// ==========================================================================
function initHomeSearch() {
    homeSubmitBtn?.addEventListener('click', runHomeSearch);
    homeQueryInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); runHomeSearch(); }
    });
    $('homeFindSchemesBtn')?.addEventListener('click', () => {
        if (findSchemesModal) findSchemesModal.style.display = 'flex';
    });
}

function runHomeSearch() {
    const q = homeQueryInput?.value.trim();
    if (!q) return;
    homeQueryInput.value = '';
    switchSection('schemes');
    startSearch(q);
}

// ==========================================================================
// CHAT INIT
// ==========================================================================
function initChat() {
    schemesQueryInput?.addEventListener('input', () => {
        const len = schemesQueryInput.value.length;
        if (charCounter) charCounter.textContent = `${len}/500`;
        if (schemesSubmitBtn) schemesSubmitBtn.disabled = len === 0;
    });

    schemesQueryInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const q = schemesQueryInput.value.trim();
            if (q) startSearch(q);
        }
    });

    schemesSubmitBtn?.addEventListener('click', () => {
        const q = schemesQueryInput?.value.trim();
        if (q) startSearch(q);
    });

    examplesToggleBtn?.addEventListener('click', () => {
        if (popularQuestionsGrid) {
            const hidden = popularQuestionsGrid.style.display === 'none';
            popularQuestionsGrid.style.display = hidden ? 'block' : 'none';
        }
    });
}

function showWelcomeState() {
    if (chatMessagesContainer) chatMessagesContainer.style.display = 'none';
    if (popularQuestionsGrid) popularQuestionsGrid.style.display = 'block';
}

function initPopularQuestions() {
    document.querySelectorAll('.pq-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.dataset.query;
            if (query) {
                switchSection('schemes');
                startSearch(query);
            }
        });
    });
}

// ==========================================================================
// SEARCH / CHAT
// ==========================================================================
async function startSearch(queryText) {
    if (!queryText) return;

    if (schemesQueryInput) schemesQueryInput.value = '';
    if (charCounter) charCounter.textContent = '0/500';
    if (schemesSubmitBtn) schemesSubmitBtn.disabled = true;

    if (chatMessagesContainer) chatMessagesContainer.style.display = 'flex';
    if (popularQuestionsGrid)  popularQuestionsGrid.style.display  = 'none';

    addToMyQueries(queryText);
    appendMessage('user', queryText);
    const typingId = showTypingIndicator();

    try {
        const res = await fetch(`${WORKER_URL}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: queryText,
                language: currentLanguage,
                profile: userProfile,
                history: chatHistory.slice(-6)
            }),
            signal: AbortSignal.timeout(20000)
        });

        removeTypingIndicator(typingId);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const data = await res.json();
        chatHistory.push({ role: 'user', content: queryText });
        chatHistory.push({ role: 'assistant', content: data.answer });

        let formattedAiContent = formatMessageContent(data.answer);

        if (data.relevantSchemes?.length > 0) {
            const primary = data.relevantSchemes[0];
            const safeApplyUrl = `${WORKER_URL}/api/schemes/${primary.id || 'pm_kisan'}/apply`;
            const siteTitle = primary.name || 'Official Portal';

            formattedAiContent += `
                <div class="official-redirect-banner">
                    <div class="banner-info">
                        <span class="redirect-badge">OFFICIAL GOVERNMENT PORTAL</span>
                        <div class="banner-title">${escapeHtml(siteTitle)}</div>
                        <div class="banner-url">${escapeHtml(primary.official_url || '')}</div>
                    </div>
                    <a href="${safeApplyUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary redirect-action-btn">
                        <span>🌐 Safe Redirect to Official Portal</span> &rarr;
                    </a>
                </div>
            `;
        }

        appendMessage('ai', formattedAiContent);

        if (data.relevantSchemes?.length > 0) {
            appendSchemeCards(data.relevantSchemes);
        }

    } catch (err) {
        removeTypingIndicator(typingId);
        appendMessage('ai', `<strong>Error:</strong> ${err.message}`);
    } finally {
        if (schemesSubmitBtn) schemesSubmitBtn.disabled = false;
    }
}

// ==========================================================================
// MESSAGE RENDERING & FORMATTING
// ==========================================================================
function formatMessageContent(content) {
    if (typeof content !== 'string') return '';
    let html = content;

    html = html.replace(/^### (.*$)/gim, '<h4 style="color:var(--text-primary); margin-top:0.75rem; margin-bottom:0.25rem;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="color:var(--text-primary); margin-top:1rem; margin-bottom:0.5rem;">$1</h3>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-official-redirect-btn">🌐 $1 ↗</a>');
    html = html.replace(/^\s*[•\-*]\s+(.*$)/gim, '• $1');
    html = html.replace(/\n/g, '<br>');

    return html;
}

function appendMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    if (role === 'ai') div.innerHTML = content;
    else div.textContent = content;

    chatMessages?.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    if (chatMessagesContainer) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
}

let typingCounter = 0;
function showTypingIndicator() {
    const id = 'typing_' + (++typingCounter);
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = id;
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '0.75rem';
    div.innerHTML = `<div class="dot-typing"></div><span style="color: var(--text-muted); font-size:0.9rem;">Assistant is verifying database & rules...</span>`;
    chatMessages?.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    $(id)?.remove();
}

// ==========================================================================
// SCHEME CARDS WITH VERIFICATION BADGES
// ==========================================================================
function appendSchemeCards(schemes) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; flex-direction:column; gap:1rem; width:100%; margin-top:1rem;';

    schemes.forEach(s => {
        const id = s.id || 'pm_kisan';
        const title = s.name || s.title || 'Government Scheme';
        const description = s.description || '';
        const category = s.category || 'General';
        const matchPct = s.match_score || Math.round((s.score || 0.9) * 100);
        const isSaved = savedSchemes.some(sv => (sv.id === id || sv.name === title));
        const vStatus = s.verification_status || 'VERIFIED';
        const vScore = s.verification_score || 95;

        // Render Verification Badge
        let badgeHtml = '';
        if (vStatus === 'VERIFIED') {
            badgeHtml = `<span class="v-badge verified">✓ Official Source Verified (${vScore}%)</span>`;
        } else if (vStatus === 'REQUIRES_REVIEW') {
            badgeHtml = `<span class="v-badge requires-review">⚠ Review Recommended (${vScore}%)</span>`;
        } else {
            badgeHtml = `<span class="v-badge unverified">! Link Unverified</span>`;
        }

        // Criterion explanation tags if available
        let explanationsHtml = '';
        if (s.explanations && Array.isArray(s.explanations)) {
            explanationsHtml = `<div class="criteria-list">` +
                s.explanations.map(e => `<div class="criterion-item ${e.status.toLowerCase()}">${e.text}</div>`).join('') +
                `</div>`;
        }

        const safeApplyUrl = `${WORKER_URL}/api/schemes/${id}/apply`;

        const card = document.createElement('div');
        card.className = 'scheme-card';
        card.innerHTML = `
            <div class="scheme-header">
                <div>
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-bottom:0.35rem;">
                        <span class="match-badge">${escapeHtml(category)}</span>
                        ${badgeHtml}
                    </div>
                    <div class="scheme-name">${escapeHtml(title)}</div>
                </div>
                <div style="display:flex; gap:0.75rem; align-items:center;">
                    <span class="relevance-badge">${matchPct}% Match</span>
                    <button class="save-btn" aria-label="Save scheme" title="${isSaved ? 'Unsave' : 'Save'}" style="font-size:1.3rem; cursor:pointer; color:${isSaved ? '#f59e0b' : 'var(--text-muted)'}; transition:0.2s;">${isSaved ? '★' : '☆'}</button>
                </div>
            </div>

            ${description ? `<p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.5;">${escapeHtml(description)}</p>` : ''}
            ${explanationsHtml}

            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.5rem;">
                <button class="btn-secondary view-details-btn" data-id="${id}" style="padding:0.5rem 1rem; font-size:0.85rem;">View Full Details & Steps</button>
                <button class="btn-secondary compare-scheme-btn" data-id="${id}" style="padding:0.5rem 1rem; font-size:0.85rem;">⚖️ Compare</button>
                <a href="${safeApplyUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding:0.5rem 1rem; font-size:0.85rem; text-decoration:none;">🌐 Apply on Official Portal &rarr;</a>
            </div>
        `;

        card.querySelector('.save-btn')?.addEventListener('click', () => toggleSaveScheme(s, card.querySelector('.save-btn')));
        card.querySelector('.view-details-btn')?.addEventListener('click', () => showSchemeDetails(id));
        card.querySelector('.compare-scheme-btn')?.addEventListener('click', () => showCompareModal(id));

        wrapper.appendChild(card);
    });

    chatMessages?.appendChild(wrapper);
    scrollToBottom();
    updateLanguageUI();
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==========================================================================
// SCHEME DETAILS MODAL
// ==========================================================================
async function showSchemeDetails(schemeId) {
    if (!schemeDetailsModal || !schemeDetailsBody) return;

    schemeDetailsBody.innerHTML = `<div style="text-align:center; padding:3rem;"><div class="dot-typing"></div><p style="margin-top:1rem;">Loading official scheme records...</p></div>`;
    schemeDetailsModal.style.display = 'flex';

    try {
        const res = await fetch(`${WORKER_URL}/api/schemes/${schemeId}`);
        if (!res.ok) throw new Error('Scheme record not found');
        const scheme = await res.json();

        const docsList = (scheme.document_details || []).map(d =>
            `<li style="margin-bottom:0.5rem;"><strong>${escapeHtml(d.name)}:</strong> ${escapeHtml(d.why_required)} <em>(Issuing: ${escapeHtml(d.issuing_authority)})</em></li>`
        ).join('') || '<li>Standard Identity Proof & Bank Passbook</li>';

        const stepsList = (scheme.application_steps || []).map((step, idx) =>
            `<li style="margin-bottom:0.5rem;"><strong>Step ${idx + 1}:</strong> ${escapeHtml(step)}</li>`
        ).join('') || '<li>Visit official portal and complete e-KYC.</li>';

        const benefitsList = (scheme.benefits || []).map(b =>
            `<li style="margin-bottom:0.35rem;">✓ ${escapeHtml(b)}</li>`
        ).join('');

        const safeApplyUrl = `${WORKER_URL}/api/schemes/${scheme.id}/apply`;

        schemeDetailsBody.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border-glass); padding-bottom:1rem; margin-bottom:1.5rem;">
                <div>
                    <span class="v-badge verified">✓ ${scheme.verification_status} (${scheme.verification_score}%)</span>
                    <h2 style="font-size:1.6rem; margin-top:0.5rem; color:var(--text-primary);">${escapeHtml(scheme.name)}</h2>
                    <p style="color:var(--text-muted); font-size:0.9rem;">${escapeHtml(scheme.ministry)} | Level: ${escapeHtml(scheme.government_level)} | Region: ${escapeHtml(scheme.state)}</p>
                </div>
            </div>

            <div style="margin-bottom:1.5rem;">
                <h3 style="color:var(--text-primary); font-size:1.1rem; margin-bottom:0.5rem;">Description</h3>
                <p style="color:var(--text-secondary); line-height:1.6; font-size:0.95rem;">${escapeHtml(scheme.description)}</p>
            </div>

            <div style="margin-bottom:1.5rem; background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); padding:1rem; border-radius:var(--radius-md);">
                <h3 style="color:#10b981; font-size:1.05rem; margin-bottom:0.5rem;">Key Benefits</h3>
                <ul style="list-style:none; padding-left:0; color:var(--text-primary); font-size:0.92rem;">${benefitsList}</ul>
            </div>

            <div style="margin-bottom:1.5rem;">
                <h3 style="color:var(--text-primary); font-size:1.1rem; margin-bottom:0.5rem;">Eligibility Criteria Summary</h3>
                <p style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:0.75rem 1rem; border-radius:var(--radius-md); font-size:0.9rem;">
                    ${escapeHtml(scheme.eligibility?.criteria_summary || 'Open to eligible citizens meeting income and demographic criteria.')}
                </p>
            </div>

            <div style="margin-bottom:1.5rem;">
                <h3 style="color:var(--text-primary); font-size:1.1rem; margin-bottom:0.5rem;">Required Documents</h3>
                <ul style="padding-left:1.25rem; color:var(--text-secondary); font-size:0.9rem;">${docsList}</ul>
            </div>

            <div style="margin-bottom:2rem;">
                <h3 style="color:var(--text-primary); font-size:1.1rem; margin-bottom:0.5rem;">How to Apply (Step-by-Step)</h3>
                <ol style="padding-left:1.25rem; color:var(--text-secondary); font-size:0.9rem; line-height:1.6;">${stepsList}</ol>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-glass); padding-top:1.25rem; margin-top:1.5rem;">
                <span style="font-size:0.8rem; color:var(--text-muted);">Last Verified: ${new Date(scheme.last_verified).toLocaleDateString()}</span>
                <a href="${safeApplyUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding:0.75rem 1.5rem; text-decoration:none;">Apply on Official Portal &rarr;</a>
            </div>
        `;
    } catch (err) {
        schemeDetailsBody.innerHTML = `<div style="color:#f43f5e; padding:2rem; text-align:center;">Failed to load scheme details: ${err.message}</div>`;
    }
}

// ==========================================================================
// MODALS LOGIC
// ==========================================================================
function initModals() {
    closeFindSchemesModal?.addEventListener('click', () => { if (findSchemesModal) findSchemesModal.style.display = 'none'; });
    closeSchemeDetailsModal?.addEventListener('click', () => { if (schemeDetailsModal) schemeDetailsModal.style.display = 'none'; });
    $('closeCompareSchemesModal')?.addEventListener('click', () => { if ($('compareSchemesModal')) $('compareSchemesModal').style.display = 'none'; });

    window.addEventListener('click', e => {
        if (e.target === findSchemesModal) findSchemesModal.style.display = 'none';
        if (e.target === schemeDetailsModal) schemeDetailsModal.style.display = 'none';
        if (e.target === $('compareSchemesModal')) $('compareSchemesModal').style.display = 'none';
    });

    wizSubmitBtn?.addEventListener('click', runFindSchemesWizard);
}

// ==========================================================================
// "FIND SCHEMES FOR ME" WIZARD LOGIC
// ==========================================================================
async function runFindSchemesWizard() {
    const selectedCategory = document.querySelector('input[name="wiz_category"]:checked')?.value || 'Agriculture, Rural & Environment';
    const selectedOcc = document.querySelector('input[name="wiz_occupation"]:checked')?.value || 'Farmer';
    const state = $('wiz_state')?.value || 'All India';
    const age = parseInt($('wiz_age')?.value || '28', 10);
    const income = parseFloat($('wiz_income')?.value || '150000');
    const gender = $('wiz_gender')?.value || 'All';

    userProfile = {
        category: selectedCategory,
        support_category: selectedCategory,
        occupation: selectedOcc,
        state,
        age,
        annual_income: income,
        gender
    };

    localStorage.setItem('ss_userProfile', JSON.stringify(userProfile));
    if (findSchemesModal) findSchemesModal.style.display = 'none';

    switchSection('schemes');

    if (chatMessagesContainer) chatMessagesContainer.style.display = 'flex';
    if (popularQuestionsGrid) popularQuestionsGrid.style.display = 'none';

    openChatWithContent(`
        <div style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); padding:1.25rem; border-radius:var(--radius-lg); margin-bottom:1.5rem;">
            <h3 style="color:var(--text-primary); margin-bottom:0.5rem;">✨ Personalized Eligibility Assessment</h3>
            <p style="color:var(--text-secondary); font-size:0.9rem;">
                Category: <strong>${selectedCategory}</strong> | Role: <strong>${selectedOcc}</strong> | Location: <strong>${state}</strong> | Age: <strong>${age}</strong> | Income: <strong>₹${income.toLocaleString('en-IN')}</strong>
            </p>
        </div>
    `);

    const typingId = showTypingIndicator();

    try {
        const res = await fetch(`${WORKER_URL}/api/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: userProfile })
        });

        removeTypingIndicator(typingId);
        if (!res.ok) throw new Error('Failed to compute recommendations');

        const data = await res.json();
        if (data.recommendations?.length > 0) {
            appendSchemeCards(data.recommendations);
        } else {
            appendMessage('ai', 'No direct matches found. Try relaxing income or state criteria.');
        }

    } catch (err) {
        removeTypingIndicator(typingId);
        appendMessage('ai', `Error loading recommendations: ${err.message}`);
    }
}

// ==========================================================================
// DOCUMENTS HUB
// ==========================================================================
async function renderDocumentsHub() {
    openChatWithContent(`<div style="text-align:center; padding:2rem;"><div class="dot-typing"></div><p style="margin-top:1rem;">Loading official document directory...</p></div>`);

    try {
        const res = await fetch(`${WORKER_URL}/api/documents`);
        if (!res.ok) throw new Error('Failed to fetch documents');
        const data = await res.json();

        const docs = data.documents || [];
        const docsCards = docs.map(d => `
            <div style="background:var(--bg-card-transparent); border:1px solid var(--border-glass); border-radius:var(--radius-lg); padding:1.25rem; margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                    <h4 style="color:var(--text-primary); font-size:1.1rem;">📄 ${escapeHtml(d.name)}</h4>
                    <span style="font-size:0.75rem; background:rgba(99,102,241,0.2); color:#a5b4fc; padding:0.2rem 0.5rem; border-radius:var(--radius-sm);">${escapeHtml(d.issuing_authority)}</span>
                </div>
                <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:0.75rem;">${escapeHtml(d.description)}</p>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">
                    <strong>Why Required:</strong> ${escapeHtml(d.why_required)}
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted);">
                    <strong>How to Obtain:</strong> ${escapeHtml(d.how_to_obtain)}
                </div>
            </div>
        `).join('');

        openChatWithContent(`
            <h3 style="color:var(--text-primary); margin-bottom:1.5rem;">📄 Government Scheme Documents Directory (${docs.length})</h3>
            <div>${docsCards}</div>
        `);

    } catch (err) {
        openChatWithContent(`<div style="color:#f43f5e; padding:2rem;">Failed to load documents: ${err.message}</div>`);
    }
}

// ==========================================================================
// ADMIN PORTAL
// ==========================================================================
async function renderAdminPortal() {
    openChatWithContent(`
        <div style="background:var(--bg-card-transparent); border:1px solid var(--border-glass); border-radius:var(--radius-xl); padding:1.5rem; margin-bottom:1.5rem;">
            <h3 style="color:var(--text-primary); margin-bottom:0.5rem;">🛡️ Sarkari Simpler Admin Portal</h3>
            <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1.5rem;">Review URL verification logs, trigger automated source updates, and audit scheme integrity.</p>

            <div style="display:flex; gap:1rem; margin-bottom:1.5rem;">
                <button id="adminSweepBtn" class="btn-primary" style="padding:0.6rem 1.2rem; font-size:0.88rem;">🔄 Trigger Background Verification Sweep</button>
            </div>

            <div id="adminSweepResult" style="margin-bottom:1.5rem;"></div>

            <h4 style="color:var(--text-primary); margin-bottom:1rem;">Recent Verification Logs</h4>
            <div id="adminLogsContainer" style="font-size:0.85rem; color:var(--text-secondary);">Loading logs...</div>
        </div>
    `);

    $('adminSweepBtn')?.addEventListener('click', async () => {
        const resDiv = $('adminSweepResult');
        if (resDiv) resDiv.innerHTML = `<span style="color:#f59e0b;">Running verification sweep across active schemes...</span>`;

        try {
            const res = await fetch(`${WORKER_URL}/api/admin/trigger-verification`, { method: 'POST' });
            const data = await res.json();
            if (resDiv) {
                resDiv.innerHTML = `<span style="color:#10b981;">Sweep complete! Total: ${data.total} | Verified: ${data.verifiedCount} | Review: ${data.reviewCount}</span>`;
            }
            loadAdminLogs();
        } catch (e) {
            if (resDiv) resDiv.innerHTML = `<span style="color:#f43f5e;">Sweep error: ${e.message}</span>`;
        }
    });

    loadAdminLogs();
}

async function loadAdminLogs() {
    const container = $('adminLogsContainer');
    if (!container) return;

    try {
        const res = await fetch(`${WORKER_URL}/api/admin/verification-logs`);
        if (!res.ok) {
            container.innerHTML = `<p>Admin authorization required. Login as admin to view logs.</p>`;
            return;
        }
        const data = await res.json();
        const logs = data.logs || [];

        const tableRows = logs.slice(0, 15).map(l => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:0.5rem;">${new Date(l.checked_at).toLocaleTimeString()}</td>
                <td style="padding:0.5rem; word-break:break-all;">${escapeHtml(l.url)}</td>
                <td style="padding:0.5rem;"><span class="v-badge ${l.status.toLowerCase().replace('_', '-')}">${l.status}</span></td>
                <td style="padding:0.5rem;">${l.score}/100</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <table style="width:100%; text-align:left; border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:1px solid var(--border-glass); color:var(--text-primary);">
                        <th style="padding:0.5rem;">Time</th>
                        <th style="padding:0.5rem;">Target URL</th>
                        <th style="padding:0.5rem;">Status</th>
                        <th style="padding:0.5rem;">Score</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
    } catch (e) {
        container.innerHTML = `<p style="color:#f43f5e;">Error loading logs: ${e.message}</p>`;
    }
}

// ==========================================================================
// SAVED SCHEMES
// ==========================================================================
async function toggleSaveScheme(schemeObj, btn) {
    const id = schemeObj.id || schemeObj.name;
    const idx = savedSchemes.findIndex(s => (s.id === id || s.name === schemeObj.name));

    if (idx === -1) {
        savedSchemes.unshift(schemeObj);
        if (btn) { btn.textContent = '★'; btn.style.color = '#f59e0b'; btn.title = 'Unsave'; }
    } else {
        savedSchemes.splice(idx, 1);
        if (btn) { btn.textContent = '☆'; btn.style.color = 'var(--text-muted)'; btn.title = 'Save'; }
    }

    localStorage.setItem('ss_savedSchemes', JSON.stringify(savedSchemes));

    if (authToken) {
        try {
            await fetch(`${WORKER_URL}/api/schemes/${id}/save`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        } catch (e) {
            console.error('Failed to sync saved scheme with backend', e);
        }
    }
}

// ==========================================================================
// MY QUERIES
// ==========================================================================
function addToMyQueries(query) {
    myQueries = myQueries.filter(q => q.text !== query);
    myQueries.unshift({ text: query, date: new Date().toLocaleString() });
    if (myQueries.length > 100) myQueries.pop();
    localStorage.setItem('ss_myQueries', JSON.stringify(myQueries));
}

// ==========================================================================
// SIDEBAR LOGIC
// ==========================================================================
function setActiveSidebarItem(el) {
    [newChatBtn, exploreSchemesBtn, savedSchemesLink, myQueriesLink, findSchemesWizardBtn, documentsLink, adminPortalLink].forEach(li => li?.classList.remove('active'));
    el?.classList.add('active');
}

function initSidebar() {
    newChatBtn?.addEventListener('click', () => {
        setActiveSidebarItem(newChatBtn);
        chatHistory = [];
        if (chatMessages) chatMessages.innerHTML = '';
        showWelcomeState();
        const chatHeader = document.querySelector('#schemesSection .chat-header');
        if (chatHeader) chatHeader.style.display = 'block';
    });

    findSchemesWizardBtn?.addEventListener('click', () => {
        setActiveSidebarItem(findSchemesWizardBtn);
        if (findSchemesModal) findSchemesModal.style.display = 'flex';
    });

    documentsLink?.addEventListener('click', () => {
        setActiveSidebarItem(documentsLink);
        renderDocumentsHub();
    });

    adminPortalLink?.addEventListener('click', () => {
        setActiveSidebarItem(adminPortalLink);
        renderAdminPortal();
    });

    savedSchemesLink?.addEventListener('click', () => {
        setActiveSidebarItem(savedSchemesLink);
        if (authToken) {
            renderProfileSection();
        } else {
            renderSavedSchemes();
        }
    });

    myQueriesLink?.addEventListener('click', () => {
        setActiveSidebarItem(myQueriesLink);
        renderMyQueries();
    });

    exploreSchemesBtn?.addEventListener('click', () => {
        setActiveSidebarItem(exploreSchemesBtn);
        renderExploreSchemes('categories');
    });
}

function openChatWithContent(htmlContent) {
    if (chatMessagesContainer) chatMessagesContainer.style.display = 'flex';
    if (popularQuestionsGrid) popularQuestionsGrid.style.display = 'none';
    const chatHeader = document.querySelector('#schemesSection .chat-header');
    if (chatHeader) chatHeader.style.display = 'none';

    if (chatMessages) chatMessages.innerHTML = htmlContent;
    scrollToBottom();
}

function renderSavedSchemes() {
    if (savedSchemes.length === 0) {
        openChatWithContent(`
            <div style="text-align:center; padding:4rem 2rem; color:var(--text-muted);">
                <div style="font-size:3rem; margin-bottom:1rem;">☆</div>
                <h3 style="color:var(--text-primary); margin-bottom:0.5rem;">No Saved Schemes</h3>
                <p>Search for schemes and click the star to save them here.</p>
            </div>
        `);
        updateLanguageUI();
        return;
    }

    openChatWithContent(`<h3 style="color:var(--text-primary); margin-bottom:1rem;">Saved Schemes (${savedSchemes.length})</h3>`);
    appendSchemeCards(savedSchemes);
    updateLanguageUI();
}

function renderMyQueries() {
    if (myQueries.length === 0) {
        openChatWithContent(`
            <div style="text-align:center; padding:4rem 2rem; color:var(--text-muted);">
                <div style="font-size:3rem; margin-bottom:1rem;">🔍</div>
                <h3 style="color:var(--text-primary); margin-bottom:0.5rem;">No Query History</h3>
                <p>Your search queries will appear here.</p>
            </div>
        `);
        updateLanguageUI();
        return;
    }

    const listHTML = myQueries.map(q => `
        <div style="background:var(--bg-card-transparent); border:1px solid var(--border-glass); border-radius:var(--radius-md); padding:1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; cursor:pointer;" class="query-history-item" data-query="${escapeHtml(q.text)}">
            <div>
                <p style="font-weight:500; color:var(--text-primary); margin-bottom:0.25rem;">${escapeHtml(q.text)}</p>
                <p style="font-size:0.75rem; color:var(--text-muted);">${q.date}</p>
            </div>
            <span style="color:var(--accent-start); font-size:1.1rem;">→</span>
        </div>
    `).join('');

    openChatWithContent(`<h3 style="color:var(--text-primary); margin-bottom:1rem;">My Queries (${myQueries.length})</h3>${listHTML}`);
    updateLanguageUI();

    document.querySelectorAll('.query-history-item').forEach(item => {
        item.addEventListener('click', () => {
            setActiveSidebarItem(newChatBtn);
            if (chatMessages) chatMessages.innerHTML = '';
            const chatHeader = document.querySelector('#schemesSection .chat-header');
            if (chatHeader) chatHeader.style.display = 'block';
            startSearch(item.dataset.query);
        });
    });
}

// ==========================================================================
// EXPLORE SCHEMES DISCOVERY PORTAL (Categories | State/UTs | Central Ministries)
// ==========================================================================
let currentExploreTab = 'categories';

async function renderExploreSchemes(activeSubTab = 'categories', filterCategory = '', filterState = '', filterMinistry = '') {
    currentExploreTab = activeSubTab;

    if (filterCategory || filterState || filterMinistry) {
        let fetchUrl = `${WORKER_URL}/api/schemes?`;
        if (filterCategory) fetchUrl += `category=${encodeURIComponent(filterCategory)}&`;
        if (filterState) fetchUrl += `state=${encodeURIComponent(filterState)}&`;
        if (filterMinistry) fetchUrl += `ministry=${encodeURIComponent(filterMinistry)}&`;

        try {
            const res = await fetch(fetchUrl);
            const data = await res.json();
            const schemes = data.schemes || [];

            const breadcrumbLabel = filterCategory ? `Category: ${filterCategory}` : (filterState ? `State/UT: ${filterState}` : `Ministry: ${filterMinistry}`);

            openChatWithContent(`
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                    <div>
                        <button id="backToExploreBtn" class="btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.85rem; margin-bottom:0.5rem;">← Back to Explore Overview</button>
                        <h3 style="color:var(--text-primary);">${escapeHtml(breadcrumbLabel)} (${schemes.length} Schemes)</h3>
                    </div>
                </div>
            `);

            appendSchemeCards(schemes);
            updateLanguageUI();

            $('backToExploreBtn')?.addEventListener('click', () => renderExploreSchemes(activeSubTab));
            return;
        } catch (e) {
            openChatWithContent(`<div style="color:#f43f5e; padding:2rem;">Error loading filtered schemes: ${e.message}</div>`);
            return;
        }
    }

    openChatWithContent(`<div style="text-align:center; padding:3rem;"><div class="dot-typing"></div><p style="margin-top:1rem;">Loading Explore Schemes discovery portal...</p></div>`);

    try {
        const res = await fetch(`${WORKER_URL}/api/explore/metadata`);
        if (!res.ok) throw new Error('Failed to fetch explore metadata');
        const meta = await res.json();

        const subTabsHtml = `
            <div style="margin-bottom:1.5rem;">
                <h2 style="font-size:1.5rem; color:var(--text-primary); margin-bottom:0.25rem;">🔍 Explore Schemes Discovery Area</h2>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Browse government schemes by purpose, location, or responsible ministry.</p>

                <div class="explore-subtabs">
                    <button class="explore-tab-btn ${activeSubTab === 'categories' ? 'active' : ''}" id="exploreTabCategories">
                        📂 Categories (${meta.categories?.length || 15})
                    </button>
                    <button class="explore-tab-btn ${activeSubTab === 'states' ? 'active' : ''}" id="exploreTabStates">
                        🗺️ State / UTs (${meta.states?.length || 0})
                    </button>
                    <button class="explore-tab-btn ${activeSubTab === 'ministries' ? 'active' : ''}" id="exploreTabMinistries">
                        🏛️ Central Ministries (${meta.ministries?.length || 0})
                    </button>
                </div>
            </div>
            <div id="exploreSubTabContent"></div>
        `;

        openChatWithContent(subTabsHtml);

        const contentContainer = $('exploreSubTabContent');
        if (!contentContainer) return;

        if (activeSubTab === 'categories') {
            const cards = (meta.categories || []).map(cat => `
                <div class="explore-card" data-category="${escapeHtml(cat.name)}">
                    <div class="explore-card-header">
                        <span class="explore-card-icon">${cat.icon}</span>
                        <span class="explore-card-title">${escapeHtml(cat.name)}</span>
                    </div>
                    <span class="explore-card-count">${cat.count} Schemes &rarr;</span>
                </div>
            `).join('');

            contentContainer.innerHTML = `<div class="explore-grid">${cards}</div>`;

            contentContainer.querySelectorAll('.explore-card').forEach(card => {
                card.addEventListener('click', () => {
                    renderExploreSchemes('categories', card.dataset.category);
                });
            });

        } else if (activeSubTab === 'states') {
            const cards = (meta.states || []).map(st => `
                <div class="explore-card" data-state="${escapeHtml(st.name)}">
                    <div class="explore-card-header">
                        <span class="explore-card-icon">📍</span>
                        <span class="explore-card-title">${escapeHtml(st.name)}</span>
                    </div>
                    <span class="explore-card-count">${st.count} Schemes &rarr;</span>
                </div>
            `).join('');

            contentContainer.innerHTML = `<div class="explore-grid">${cards}</div>`;

            contentContainer.querySelectorAll('.explore-card').forEach(card => {
                card.addEventListener('click', () => {
                    renderExploreSchemes('states', '', card.dataset.state);
                });
            });

        } else if (activeSubTab === 'ministries') {
            const cards = (meta.ministries || []).map(min => `
                <div class="explore-card" data-ministry="${escapeHtml(min.name)}">
                    <div class="explore-card-header">
                        <span class="explore-card-icon">🏛️</span>
                        <span class="explore-card-title">${escapeHtml(min.name)}</span>
                    </div>
                    <span class="explore-card-count">${min.count} Schemes &rarr;</span>
                </div>
            `).join('');

            contentContainer.innerHTML = `<div class="explore-grid">${cards}</div>`;

            contentContainer.querySelectorAll('.explore-card').forEach(card => {
                card.addEventListener('click', () => {
                    renderExploreSchemes('ministries', '', '', card.dataset.ministry);
                });
            });
        }

        $('exploreTabCategories')?.addEventListener('click', () => renderExploreSchemes('categories'));
        $('exploreTabStates')?.addEventListener('click', () => renderExploreSchemes('states'));
        $('exploreTabMinistries')?.addEventListener('click', () => renderExploreSchemes('ministries'));

    } catch (e) {
        openChatWithContent(`<div style="color:#f43f5e; padding:2rem;">Failed to load explore portal: ${e.message}</div>`);
    }
}

// ==========================================================================
// COMPARE SCHEMES SIDE-BY-SIDE MODAL
// ==========================================================================
let comparedSchemeIds = [];

async function showCompareModal(schemeIdToCompare) {
    const compareModal = $('compareSchemesModal');
    const compareBody = $('compareSchemesBody');

    if (!compareModal || !compareBody) return;

    if (schemeIdToCompare && !comparedSchemeIds.includes(schemeIdToCompare)) {
        comparedSchemeIds.push(schemeIdToCompare);
    }
    if (comparedSchemeIds.length === 0) {
        comparedSchemeIds = ['pm_kisan', 'pm_my_dhan'];
    }

    compareBody.innerHTML = `<div style="text-align:center; padding:3rem;"><div class="dot-typing"></div><p style="margin-top:1rem;">Comparing scheme metrics side-by-side...</p></div>`;
    compareModal.style.display = 'flex';

    try {
        const res = await fetch(`${WORKER_URL}/api/schemes/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheme_ids: comparedSchemeIds })
        });
        if (!res.ok) throw new Error('Failed to fetch scheme comparison data');
        const data = await res.json();
        const schemes = data.schemes || [];

        if (schemes.length === 0) {
            compareBody.innerHTML = `<p style="padding:2rem; text-align:center;">No valid schemes selected for comparison.</p>`;
            return;
        }

        const tableHeaders = schemes.map(s => `
            <th>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-weight:700; font-size:1.1rem; color:var(--text-primary); margin-bottom:0.25rem;">${escapeHtml(s.name)}</div>
                        <span class="match-badge">${escapeHtml(s.category)}</span>
                    </div>
                    <button class="remove-compare-btn" data-id="${s.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.2rem;" title="Remove from compare">&times;</button>
                </div>
            </th>
        `).join('');

        const rowMinistry = schemes.map(s => `<td><strong>${escapeHtml(s.ministry)}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(s.government_level)} Level (${escapeHtml(s.state)})</span></td>`).join('');
        const rowBenefits = schemes.map(s => `<td><ul style="padding-left:1.1rem; margin:0;">${(s.benefits||[]).map(b => `<li style="margin-bottom:0.25rem;">${escapeHtml(b)}</li>`).join('')}</ul></td>`).join('');
        const rowEligibility = schemes.map(s => `<td>${escapeHtml(s.eligibility?.criteria_summary || 'Standard eligibility')}</td>`).join('');
        const rowAgeIncome = schemes.map(s => `<td><strong>Age:</strong> ${s.eligibility?.age_min||0} - ${s.eligibility?.age_max||100} years<br><strong>Income Limit:</strong> ₹${(s.eligibility?.income_max||1000000).toLocaleString('en-IN')}/yr</td>`).join('');
        const rowDocs = schemes.map(s => `<td><ul style="padding-left:1.1rem; margin:0;">${(s.document_details||[]).map(d => `<li>${escapeHtml(d.name)}</li>`).join('') || '<li>ID Proof</li>'}</ul></td>`).join('');
        const rowPortal = schemes.map(s => `<td><a href="${WORKER_URL}/api/schemes/${s.id}/apply" target="_blank" class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.82rem; text-decoration:none; display:inline-block;">🌐 Official Portal &rarr;</a></td>`).join('');

        compareBody.innerHTML = `
            <div class="compare-table-wrapper">
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th class="compare-field-label">Scheme Attribute</th>
                            ${tableHeaders}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="compare-field-label">Ministry & Level</td>
                            ${rowMinistry}
                        </tr>
                        <tr>
                            <td class="compare-field-label">Primary Benefits</td>
                            ${rowBenefits}
                        </tr>
                        <tr>
                            <td class="compare-field-label">Eligibility Summary</td>
                            ${rowEligibility}
                        </tr>
                        <tr>
                            <td class="compare-field-label">Age & Income Criteria</td>
                            ${rowAgeIncome}
                        </tr>
                        <tr>
                            <td class="compare-field-label">Required Documents</td>
                            ${rowDocs}
                        </tr>
                        <tr>
                            <td class="compare-field-label">Official Application</td>
                            ${rowPortal}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        compareBody.querySelectorAll('.remove-compare-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                comparedSchemeIds = comparedSchemeIds.filter(id => id !== btn.dataset.id);
                showCompareModal();
            });
        });

    } catch (e) {
        compareBody.innerHTML = `<div style="color:#f43f5e; padding:2rem;">Comparison error: ${e.message}</div>`;
    }
}

// ==========================================================================
// SPEECH RECOGNITION
// ==========================================================================
function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        if (homeMicBtn) homeMicBtn.style.display = 'none';
        if (schemesVoiceBtn) schemesVoiceBtn.style.display = 'none';
        return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    let recording = false;

    function startRecognition(targetInput) {
        if (recording) { recognition.stop(); return; }
        recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

        recognition.start();
        recognition.onstart = () => { recording = true; };
        recognition.onresult = (e) => {
            const t = e.results[0][0].transcript;
            if (targetInput) {
                targetInput.value = t;
                targetInput.dispatchEvent(new Event('input'));
            }
        };
        recognition.onerror = () => { recording = false; };
        recognition.onend = () => { recording = false; };
    }

    homeMicBtn?.addEventListener('click', () => startRecognition(homeQueryInput));
    schemesVoiceBtn?.addEventListener('click', () => startRecognition(schemesQueryInput));
}

// ==========================================================================
// FONT RESIZER (Accessibility Scaling)
// ==========================================================================
function initFontScaler() {
    const scaleDownBtn = $('fontScaleDownBtn');
    const scaleUpBtn   = $('fontScaleUpBtn');

    let currentScale = localStorage.getItem('ss_fontScale') || 'normal';
    applyFontScale(currentScale);

    scaleUpBtn?.addEventListener('click', () => {
        if (currentScale === 'normal') currentScale = 'lg';
        else if (currentScale === 'lg') currentScale = 'xl';
        applyFontScale(currentScale);
    });

    scaleDownBtn?.addEventListener('click', () => {
        if (currentScale === 'xl') currentScale = 'lg';
        else if (currentScale === 'lg') currentScale = 'normal';
        applyFontScale(currentScale);
    });
}

function applyFontScale(scale) {
    document.body.classList.remove('font-scale-lg', 'font-scale-xl');
    if (scale === 'lg') document.body.classList.add('font-scale-lg');
    if (scale === 'xl') document.body.classList.add('font-scale-xl');
    localStorage.setItem('ss_fontScale', scale);
}

// ==========================================================================
// MULTI-LANGUAGE ON-SCREEN VIRTUAL KEYBOARD
// ==========================================================================
const KBD_LAYOUTS = {
    hi: ['अ','आ','इ','ई','उ','ऊ','ए','ऐ','ओ','औ','अं','अः','क','ख','ग','घ','ङ','च','छ','ज','झ','ञ','ट','ठ','ड','ढ','ण','त','थ','द','ध','न','प','फ','ब','भ','म','य','र','ल','व','श','ष','स','ह','क्ष','त्र','ज्ञ','़','ऽ','ा','ि','ी','ु','ू','ृ','े','ै','ो','ौ','्'],
    en: ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9','?','!','.','@'],
    bn: ['অ','আ','ই','ঈ','উ','ঊ','ঋ','এ','ঐ','ও','ঔ','ক','খ','গ','ঘ','ঙ','চ','ছ','জ','ঝ','ঞ','ট','ঠ','ড','ঢ','ণ','ত','থ','দ','ধ','ন','প','ফ','ব','ভ','ম','য','র','ল','শ','ষ','স','হ','়','া','ি','ী','ু','ূ','ৃ','ে','ৈ','ো','ৌ','্'],
    ta: ['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ','க','ங','ச','ஞ','ட','ண','த','ந','ப','ம','ய','ர','ல','வ','ழ','ள','ற','ன','ா','ி','ீ','ு','ூ','ெ','ே','ை','ொ','ோ','ௌ','்'],
    te: ['అ','ఆ','ఇ','ఈ','ఉ','ఊ','ఋ','ఎ','ఏ','ఐ','ఒ','ఓ','ఔ','క','ఖ','గ','ఘ','ఙ','చ','ఛ','జ','ఝ','ఞ','ట','ఠ','డ','ఢ','ణ','త','థ','ద','ధ','న','ప','ఫ','బ','భ','మ','య','ర','ల','వ','శ','ష','స','హ','ా','ి','ీ','ు','ూ','ృ','ె','ే','ై','ొ','ో','ౌ','్'],
    gu: ['અ','આ','ઇ','ઈ','ઉ','ઊ','ઋ','એ','ઐ','ઓ','ઔ','ક','ખ','ગ','ઘ','ઙ','ચ','છ','જ','ઝ','ઞ','ટ','ઠ','ડ','ઢ','ણ','ત','થ','દ','ધ','ન','પ','ફ','બ','ભ','મ','ય','ર','લ','વ','શ','ષ','સ','હ','ા','િ','ી','ુ','ૂ','ૃ','ે','ૈ','ો','ૌ','્'],
    kn: ['ಅ','ಆ','ಇ','ಈ','ಉ','ಊ','ಋ','ಎ','ಏ','ಐ','ಒ','ಓ','ಔ','ಕ','ಖ','ಗ','ಘ','ಙ','ಚ','ಛ','ಜ','ಝ','ಞ','ಟ','ಠ','ಡ','ಢ','ಣ','ತ','ಥ','ದ','ಧ','ನ','ಪ','ಫ','ಬ','ಭ','ಮ','ಯ','ರ','ಲ','ವ','ಶ','ಷ','ಸ','ಹ','ಾ','ಿ','ീ','ു','ൂ','ೃ','ೆ','ೇ','ೈ','ೊ','ೋ','ೌ','್'],
    ml: ['അ','ആ','ഇ','ഈ','ഉ','ഊ','ഋ','എ','ഏ','ഐ','ഒ','ഓ','ഔ','ക','ഖ','ഗ','ഘ','ങ','ച','ഛ','ജ','ഝ','ഞ','ട','ഠ','ഡ','ഢ','ണ','ത','ഥ','ദ','ധ','ന','പ','ഫ','ബ','ഭ','മ','യ','ര','ല','വ','ശ','ഷ','സ','ഹ','ാ','ി','ീ','ു','ൂ','ൃ','െ','േ','ൈ','ൊ','ോ','ൌ','്'],
    pa: ['ਅ','ਆ','ਇ','ਈ','ਉ','ਊ','ਏ','ਐ','ਓ','ਔ','ਕ','ਖ','ਗ','ਘ','ਙ','ਚ','ਛ','ਜ','ਝ','ਞ','ਟ','ਠ','ਡ','ਢ','ਣ','ਤ','ਥ','ਦ','ਧ','ਨ','ਪ','ਫ','ਬ','ਭ','ਮ','ਯ','ਰ','ਲ','ਵ','ਸ਼','ਸ','ਹ','਼','ਾ','ਿ','ੀ','ੁ','ੂ','ੇ','ੈ','ੋ','ੌ','੍'],
    or: ['ଅ','ଆ','ଇ','ଈ','ଉ','ଊ','ଋ','ଏ','ଐ','ଓ','ଔ','କ','ଖ','ଗ','ଘ','ଙ','ଚ','ଛ','ଜ','ଝ','ଞ','ଟ','ଠ','ଡ','ଢ','ଣ','ତ','ଥ','ଦ','ଧ','ନ','ପ','ଫ','ବ','ଭ','ମ','ଯ','ର','ଲ','ଵ','ଶ','ଷ','ସ','ହ','଼','ା','ି','ୀ','ୁ','ୂ','ୃ','େ','ୈ','ୋ','ୌ','୍'],
    ur: ['ا','ب','پ','ت','ٹ','ث','ج','چ','ح','خ','د','ڈ','ذ','ر','ڑ','ز','ژ','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ک','گ','ل','م','ن','ں','و','ہ','ھ','ء','ی','ے']
};

let activeKbdInput = null;
let currentKbdLang  = 'hi';

function initVirtualKeyboard() {
    const kbdModal = $('virtualKeyboardModal');
    const closeBtn = $('closeVirtualKeyboardModal');
    const homeKbd  = $('homeKbdBtn');
    const schemesKbd = $('schemesKbdBtn');

    function openKbd(targetInput) {
        activeKbdInput = targetInput;
        currentKbdLang = currentLanguage === 'en' ? 'en' : (KBD_LAYOUTS[currentLanguage] ? currentLanguage : 'hi');
        renderVirtualKeyboardKeys();
        if (kbdModal) kbdModal.style.display = 'flex';
    }

    homeKbd?.addEventListener('click', (e) => {
        e.preventDefault();
        openKbd(homeQueryInput);
    });

    schemesKbd?.addEventListener('click', (e) => {
        e.preventDefault();
        openKbd(schemesQueryInput);
    });

    closeBtn?.addEventListener('click', () => {
        if (kbdModal) kbdModal.style.display = 'none';
    });

    document.querySelectorAll('.kbd-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.kbd-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentKbdLang = tab.dataset.kbdlang || 'hi';
            renderVirtualKeyboardKeys();
        });
    });
}

function renderVirtualKeyboardKeys() {
    const container = $('virtualKeyboardKeysContainer');
    if (!container) return;

    const keys = KBD_LAYOUTS[currentKbdLang] || KBD_LAYOUTS.hi;
    let html = keys.map(k => `<button class="kbd-key" data-key="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join('');

    // Action keys
    html += `
        <button class="kbd-key wide" data-action="backspace">⌫ Delete</button>
        <button class="kbd-key wide" data-action="space">Space</button>
        <button class="kbd-key wide" data-action="clear">Clear</button>
        <button class="kbd-key wide" data-action="enter" style="background:var(--accent-start); color:#fff;">Enter ↵</button>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.kbd-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!activeKbdInput) activeKbdInput = schemesQueryInput;

            const char = btn.dataset.key;
            const action = btn.dataset.action;

            if (char) {
                activeKbdInput.value += char;
            } else if (action === 'backspace') {
                activeKbdInput.value = activeKbdInput.value.slice(0, -1);
            } else if (action === 'space') {
                activeKbdInput.value += ' ';
            } else if (action === 'clear') {
                activeKbdInput.value = '';
            } else if (action === 'enter') {
                $('virtualKeyboardModal').style.display = 'none';
                if (activeKbdInput === homeQueryInput) runHomeSearch();
                else {
                    const q = schemesQueryInput.value.trim();
                    if (q) startSearch(q);
                }
            }

            activeKbdInput.dispatchEvent(new Event('input'));
            activeKbdInput.focus();
        });
    });
}

// ==========================================================================
// AUTHENTICATION LOGIC
// ==========================================================================
let isRegistering = false;

function initAuth() {
    updateAuthUI();

    authLoginBtn?.addEventListener('click', () => {
        if (authModal) authModal.style.display = 'flex';
    });

    closeAuthModal?.addEventListener('click', () => {
        if (authModal) authModal.style.display = 'none';
    });

    userProfileBtn?.addEventListener('click', () => {
        renderProfileSection();
    });

    logoutBtn?.addEventListener('click', () => {
        authToken = null;
        userProfile = null;
        localStorage.removeItem('ss_token');
        localStorage.removeItem('ss_userProfile');
        savedSchemes = [];
        localStorage.setItem('ss_savedSchemes', JSON.stringify(savedSchemes));
        updateAuthUI();
        if (profileSection?.classList.contains('active')) {
            navHome?.click();
        }
    });

    authToggleBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        if (isRegistering) {
            authTitle.textContent = "Register for Sarkari Simpler";
            authToggleText.textContent = "Already have an account? ";
            authToggleBtn.textContent = "Login here";
            authSubmitBtn.textContent = "Register";
            authNameField.style.display = 'block';
            authName.required = true;
        } else {
            authTitle.textContent = "Login to Sarkari Simpler";
            authToggleText.textContent = "Don't have an account? ";
            authToggleBtn.textContent = "Register here";
            authSubmitBtn.textContent = "Login";
            authNameField.style.display = 'none';
            authName.required = false;
        }
    });

    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmail.value;
        const password = authPassword.value;
        const name = authName.value;

        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
        const body = isRegistering ? { email, password, name } : { email, password };

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Please wait...';

        try {
            const res = await fetch(`${WORKER_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            
            if (res.ok) {
                authToken = data.token;
                userProfile = data.user;
                localStorage.setItem('ss_token', authToken);
                localStorage.setItem('ss_userProfile', JSON.stringify(userProfile));
                if (authModal) authModal.style.display = 'none';
                updateAuthUI();
                await fetchSavedSchemes();
            } else {
                showError(data.error || 'Authentication failed');
            }
        } catch (err) {
            showError('Network error. Please try again.');
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isRegistering ? 'Register' : 'Login';
        }
    });
}

function updateAuthUI() {
    if (authToken && userProfile) {
        if (authLoginBtn) authLoginBtn.style.display = 'none';
        if (userProfileBtn) userProfileBtn.style.display = 'flex';
    } else {
        if (authLoginBtn) authLoginBtn.style.display = 'flex';
        if (userProfileBtn) userProfileBtn.style.display = 'none';
    }
}

async function fetchSavedSchemes() {
    if (!authToken) return;
    try {
        const res = await fetch(`${WORKER_URL}/api/user/saved-schemes`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            savedSchemes = data.savedSchemes || [];
            localStorage.setItem('ss_savedSchemes', JSON.stringify(savedSchemes));
        }
    } catch (e) {
        console.error('Failed to fetch saved schemes', e);
    }
}

async function renderProfileSection() {
    [homeSection, aboutSection, schemesSection, profileSection].forEach(s => {
        if(s) s.style.display = 'none';
        s?.classList.remove('active');
    });
    if (profileSection) {
        profileSection.style.display = 'block';
        profileSection.classList.add('active');
    }
    
    // Deactivate top nav links
    [navHome, navSchemes, navAbout].forEach(li => li?.classList.remove('active'));

    await fetchSavedSchemes();
    
    if (savedSchemesContainer) {
        savedSchemesContainer.innerHTML = '';
        if (savedSchemes.length === 0) {
            savedSchemesContainer.innerHTML = '<p style="color:var(--text-muted);">You have no saved schemes.</p>';
        } else {
            savedSchemes.forEach(s => {
                const id = s.id || s.name;
                const title = s.name || s.title || id;
                const category = s.category || 'General';
                
                const card = document.createElement('div');
                card.className = 'scheme-card';
                card.innerHTML = `
                    <div class="scheme-header">
                        <div>
                            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-bottom:0.35rem;">
                                <span class="match-badge">${escapeHtml(category)}</span>
                            </div>
                            <div class="scheme-name">${escapeHtml(title)}</div>
                        </div>
                        <div style="display:flex; gap:0.75rem; align-items:center;">
                            <button class="save-btn" aria-label="Unsave scheme" title="Unsave" style="font-size:1.3rem; cursor:pointer; color:#f59e0b; transition:0.2s;">★</button>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.5rem;">
                        <button class="btn-secondary view-details-btn" data-id="${id}" style="padding:0.5rem 1rem; font-size:0.85rem;">View Full Details & Steps</button>
                    </div>
                `;
                
                card.querySelector('.save-btn')?.addEventListener('click', async () => {
                    await toggleSaveScheme(s, card.querySelector('.save-btn'));
                    renderProfileSection(); // re-render
                });
                card.querySelector('.view-details-btn')?.addEventListener('click', () => {
                    navSchemes.click();
                    showSchemeDetails(id);
                });
                
                savedSchemesContainer.appendChild(card);
            });
        }
    }
}
