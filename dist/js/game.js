
// ============================================================
// Tracking (optional - works without server)
// ============================================================

const TRACKING_ENABLED = true;
const API_BASE = window.location.origin;

let currentLocation = null;

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

    const event = {
        type,
        teamId: TEAM_CONFIG.teamId,
        teamName: TEAM_CONFIG.teamName,
        step: TEAM_CONFIG.step,
        taskId: TEAM_CONFIG.taskId,
        location: currentLocation,
        ...data
    };

    fetch(API_BASE + '/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
    }).catch(() => {}); // Silently fail if server unavailable
}

// Track page view on load
document.addEventListener('DOMContentLoaded', () => {
    initGPS();
    setTimeout(() => trackEvent('page_view'), 1000); // Wait for GPS
});

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
    errorEl.classList.remove('hidden');

    const input = document.getElementById('code-input');
    input.value = '';
    input.focus();

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

    // Track attempt
    trackEvent('code_attempt', { code: code.toUpperCase().trim(), success });

    if (success) {
        // Check if this is the final page (grand finale)
        if (TASK_CONFIG.nextTaskFile.includes('grand_finale') ||
            TASK_CONFIG.nextTaskFile.includes('finale')) {
            trackEvent('game_complete');
        }
        window.location.href = TASK_CONFIG.nextTaskFile;
    } else {
        showError();
    }
}

const form = document.getElementById('code-form');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('code-input').value;
        verifyAndRedirect(code);
    });
}
