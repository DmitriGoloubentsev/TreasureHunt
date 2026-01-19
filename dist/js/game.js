
// ============================================================
// Tracking (optional - works without server)
// ============================================================

const TRACKING_ENABLED = true;
const API_BASE = window.location.origin;
const GAME_VERSION = window.GAME_VERSION || '1';
const PENALTY_STORAGE_KEY = 'treasureHuntPenalty_' + GAME_VERSION;
const TIMER_STORAGE_PREFIX = 'treasureHuntTimer_' + GAME_VERSION + '_';

let currentLocation = null;
let timerInterval = null;
let timeRemaining = 0;
let timedOut = false;

// Get GPS location
function initGPS() {
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => {
                currentLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
            },
            (err) => console.log('GPS unavailable:', err.message),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
}

// Send tracking event (fire and forget)
function trackEvent(type, data = {}) {
    if (!TRACKING_ENABLED) return;
    if (!window.TEAM_CONFIG) return;

    const totalPenalty = getPenalty();
    const event = {
        type,
        teamId: TEAM_CONFIG.teamId,
        teamName: TEAM_CONFIG.teamName,
        step: TEAM_CONFIG.step,
        taskId: TEAM_CONFIG.taskId,
        location: currentLocation,
        penaltyMinutes: totalPenalty,
        ...data
    };

    fetch(API_BASE + '/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
    }).catch(() => {}); // Silently fail if server unavailable
}

// ============================================================
// Penalty Management
// ============================================================

function getPenalty() {
    const stored = sessionStorage.getItem(PENALTY_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
}

function addPenalty(minutes) {
    const current = getPenalty();
    const newPenalty = current + minutes;
    sessionStorage.setItem(PENALTY_STORAGE_KEY, newPenalty.toString());
    updatePenaltyDisplay();
    return newPenalty;
}

function updatePenaltyDisplay() {
    const penaltyEl = document.getElementById('penalty-display');
    const penaltyTimeEl = document.getElementById('penalty-time');
    const penalty = getPenalty();

    if (penaltyEl && penaltyTimeEl) {
        if (penalty > 0) {
            penaltyTimeEl.textContent = penalty;
            penaltyEl.classList.remove('hidden');
        } else {
            penaltyEl.classList.add('hidden');
        }
    }
}

// ============================================================
// Timer Management
// ============================================================

function getTimerKey() {
    if (!window.TEAM_CONFIG) return null;
    return TIMER_STORAGE_PREFIX + TEAM_CONFIG.teamId + '_' + TEAM_CONFIG.step;
}

function getStartTime() {
    const key = getTimerKey();
    if (!key) return null;
    const stored = sessionStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
}

function setStartTime() {
    const key = getTimerKey();
    if (!key) return;
    if (!getStartTime()) {
        sessionStorage.setItem(key, Date.now().toString());
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;

    if (timeRemaining <= 0) {
        timerEl.textContent = '00:00';
        timerEl.classList.add('timer-expired');
        return;
    }

    timerEl.textContent = formatTime(timeRemaining);

    // Warning state when under 2 minutes
    if (timeRemaining <= 120) {
        timerEl.classList.add('timer-warning');
    }
}

function startTimer() {
    if (!window.TASK_CONFIG || !TASK_CONFIG.timeoutMinutes || TASK_CONFIG.timeoutMinutes <= 0) return;

    setStartTime();
    const startTime = getStartTime();
    const timeoutMs = TASK_CONFIG.timeoutMinutes * 60 * 1000;
    const elapsed = Date.now() - startTime;
    timeRemaining = Math.max(0, Math.floor((timeoutMs - elapsed) / 1000));

    updateTimerDisplay();

    if (timeRemaining <= 0) {
        handleTimeout();
        return;
    }

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function handleTimeout() {
    if (timedOut) return;
    timedOut = true;

    const timeoutHelp = document.getElementById('timeout-help');
    if (timeoutHelp) {
        timeoutHelp.classList.remove('hidden');
    }

    trackEvent('timeout', { taskId: TEAM_CONFIG.taskId });
}

function setupHintButton() {
    const hintBtn = document.getElementById('get-hint-btn');
    if (!hintBtn) return;

    hintBtn.addEventListener('click', () => {
        const penalty = TASK_CONFIG.hintPenaltyMinutes || 5;
        addPenalty(penalty);
        trackEvent('hint_requested', {
            taskId: TEAM_CONFIG.taskId,
            penaltyAdded: penalty
        });

        // Show confirmation
        hintBtn.textContent = 'Penalty added! Contact organizer for answer';
        hintBtn.disabled = true;
        hintBtn.classList.add('hint-used');
    });
}

// ============================================================
// Game Logic
// ============================================================

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message.toUpperCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showError() {
    const errorEl = document.getElementById('error-message');
    if (!errorEl) return;

    errorEl.classList.remove('hidden');

    const input = document.getElementById('code-input');
    if (input) {
        input.value = '';
        input.focus();
    }

    setTimeout(() => {
        errorEl.classList.add('hidden');
    }, 2000);
}

async function verifyAndRedirect(code) {
    if (!code.trim()) {
        showError();
        return;
    }

    const hash = await sha256(code);
    const success = hash === TASK_CONFIG.correctHashSHA256;

    // Track attempt with penalty info
    trackEvent('code_attempt', {
        code: code.toUpperCase().trim(),
        success,
        penaltyMinutes: getPenalty()
    });

    if (success) {
        if (timerInterval) clearInterval(timerInterval);

        // Check if this is the final page (grand finale)
        if (TASK_CONFIG.nextTaskFile.includes('grand_finale') ||
            TASK_CONFIG.nextTaskFile.includes('finale')) {
            trackEvent('game_complete', { totalPenaltyMinutes: getPenalty() });
        }
        window.location.href = TASK_CONFIG.nextTaskFile;
    } else {
        showError();
    }
}

// ============================================================
// Initialization
// ============================================================

function init() {
    initGPS();
    updatePenaltyDisplay();

    // Start timer if configured
    if (window.TASK_CONFIG && TASK_CONFIG.timeoutMinutes > 0) {
        startTimer();
        setupHintButton();
    }

    // Setup form handler
    const form = document.getElementById('code-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('code-input').value;
            verifyAndRedirect(code);
        });
    }

    setTimeout(() => trackEvent('page_view'), 1000); // Wait for GPS
}

// Run init when DOM is ready (handle case where DOMContentLoaded already fired)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
