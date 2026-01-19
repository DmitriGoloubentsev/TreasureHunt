#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================
// Configuration
// ============================================================

const TASKS_DIR = path.join(__dirname, '..', 'tasks');
const TEAMS_DIR = path.join(__dirname, '..', 'teams');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const CONFIG_FILE = path.join(__dirname, '..', 'CONFIG.md');

// ============================================================
// Utility Functions
// ============================================================

function md5(str) {
    return crypto.createHash('md5').update(str.toUpperCase().trim()).digest('hex').substring(0, 16);
}

function sha256(str) {
    return crypto.createHash('sha256').update(str.toUpperCase().trim()).digest('hex');
}

function parseMarkdownWithFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
        return { frontmatter: {}, body: content };
    }

    const frontmatterStr = match[1];
    const body = match[2].trim();

    // Simple YAML parser for our use case
    const frontmatter = {};
    const lines = frontmatterStr.split('\n');
    let currentKey = null;
    let currentArray = null;

    for (const line of lines) {
        const keyMatch = line.match(/^(\w+):\s*(.*)$/);
        if (keyMatch) {
            const [, key, value] = keyMatch;
            if (value === '') {
                // Start of array or object
                currentKey = key;
                currentArray = [];
                frontmatter[key] = currentArray;
            } else {
                frontmatter[key] = value;
                currentKey = null;
                currentArray = null;
            }
        } else if (currentArray !== null && line.match(/^\s+-\s+(.*)$/)) {
            const itemMatch = line.match(/^\s+-\s+(.*)$/);
            currentArray.push(itemMatch[1]);
        }
    }

    return { frontmatter, body };
}

function markdownToHtml(markdown) {
    // Simple markdown to HTML conversion
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Paragraphs
        .split(/\n\n+/)
        .map(p => {
            if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        })
        .join('\n');

    return html;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// ============================================================
// Load Data
// ============================================================

function loadTasks() {
    const tasks = {};
    const files = fs.readdirSync(TASKS_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
        const taskId = path.basename(file, '.md');
        const content = fs.readFileSync(path.join(TASKS_DIR, file), 'utf-8');
        const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

        tasks[taskId] = {
            id: taskId,
            code: frontmatter.code || null,
            content: body,
            html: markdownToHtml(body)
        };
    }

    return tasks;
}

function loadTeams() {
    const teams = {};
    const files = fs.readdirSync(TEAMS_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
        const teamId = path.basename(file, '.md');
        const content = fs.readFileSync(path.join(TEAMS_DIR, file), 'utf-8');
        const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

        teams[teamId] = {
            id: teamId,
            name: frontmatter.name || teamId,
            startCode: frontmatter.start_code,
            sequence: frontmatter.sequence || [],
            welcomeContent: body,
            welcomeHtml: markdownToHtml(body)
        };
    }

    return teams;
}

function loadConfig() {
    const defaults = {
        admin_password: 'treasure2024'
    };

    if (!fs.existsSync(CONFIG_FILE)) {
        return defaults;
    }

    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const { frontmatter } = parseMarkdownWithFrontmatter(content);

    return {
        admin_password: frontmatter.admin_password || defaults.admin_password
    };
}

// ============================================================
// HTML Generation
// ============================================================

function generateTaskPageHtml(options) {
    const { teamId, teamName, stepNumber, totalSteps, taskId, taskHtml, correctHashSHA256, nextTaskFile, isFinalPage } = options;

    const formHtml = isFinalPage ? '' : `
        <form id="code-form" class="code-form">
            <input
                type="text"
                id="code-input"
                class="code-input"
                placeholder="Enter code"
                autocomplete="off"
                autofocus
            >
            <button type="submit" class="submit-btn">Submit</button>
        </form>
        <p id="error-message" class="error-message hidden">Incorrect code, try again!</p>
    `;

    const trackingScript = `
    <script>
        window.TEAM_CONFIG = {
            teamId: "${teamId}",
            teamName: "${teamName}",
            step: ${stepNumber},
            taskId: "${taskId}"
        };
    </script>`;

    const scriptHtml = isFinalPage ? trackingScript + `
    <script src="../js/game.js"></script>
    ` : trackingScript + `
    <script>
        const TASK_CONFIG = {
            correctHashSHA256: "${correctHashSHA256}",
            nextTaskFile: "${nextTaskFile}"
        };
    </script>
    <script src="../js/game.js"></script>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="referrer" content="no-referrer">
    <title>${teamName} - Step ${stepNumber}/${totalSteps}</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <span class="team-name">${teamName}</span>
            <span class="progress">Step ${stepNumber}/${totalSteps}</span>
        </header>

        <main class="task-content">
            ${taskHtml}
        </main>

        ${formHtml}
    </div>
    ${scriptHtml}
</body>
</html>`;
}

function generateStartPageHtml(options) {
    const { teamId, teamName, welcomeHtml, nextTaskFile } = options;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="referrer" content="no-referrer">
    <title>${teamName} - Treasure Hunt</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <span class="team-name">${teamName}</span>
            <span class="progress">Start</span>
        </header>

        <main class="task-content welcome">
            ${welcomeHtml}
        </main>

        <a href="${nextTaskFile}" class="start-btn" onclick="trackStart()">Start Game</a>
    </div>

    <script>
        window.TEAM_CONFIG = {
            teamId: "${teamId}",
            teamName: "${teamName}",
            step: 0,
            taskId: "start"
        };
    </script>
    <script src="../js/game.js"></script>
    <script>
        function trackStart() {
            trackEvent('game_start');
        }
    </script>
</body>
</html>`;
}

function generateIndexHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Treasure Hunt</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <span class="team-name">Treasure Hunt</span>
        </header>

        <main class="task-content welcome">
            <h1>Welcome!</h1>
            <p>Ask your game organizer for your team's start link.</p>
            <p>Good luck and have fun!</p>
        </main>
    </div>
</body>
</html>`;
}

function generateAdminHtml(teamStartUrls, adminPassword) {
    const passwordHash = sha256(adminPassword);

    const teamLinksHtml = teamStartUrls.map(t =>
        `<tr><td>${t.name}</td><td><code>${t.id}</code></td><td><a href="${t.url}" target="_blank">${t.url}</a></td></tr>`
    ).join('\n                    ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Treasure Hunt</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container admin">
        <header class="header">
            <span class="team-name">Organizer Panel</span>
        </header>

        <div id="login-section">
            <main class="task-content">
                <h1>Organizer Access</h1>
                <p>Enter the admin password to view team start links.</p>
            </main>
            <form id="password-form" class="code-form">
                <input type="password" id="password-input" class="code-input" placeholder="Password" autocomplete="off" autofocus>
                <button type="submit" class="submit-btn">Enter</button>
            </form>
            <p id="error-message" class="error-message hidden">Incorrect password</p>
        </div>

        <div id="admin-content" class="hidden">
            <main class="task-content">
                <h1>Team Start Links</h1>
                <p class="warning">Share each link only with the corresponding team!</p>
                <table class="admin-table">
                    <thead>
                        <tr><th>Team</th><th>ID</th><th>Start URL</th></tr>
                    </thead>
                    <tbody>
                    ${teamLinksHtml}
                    </tbody>
                </table>
            </main>
        </div>
    </div>

    <script>
        const ADMIN_HASH = "${passwordHash}";

        async function sha256(message) {
            const msgBuffer = new TextEncoder().encode(message.toUpperCase().trim());
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        document.getElementById('password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password-input').value;
            const hash = await sha256(password);

            if (hash === ADMIN_HASH) {
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('admin-content').classList.remove('hidden');
            } else {
                document.getElementById('error-message').classList.remove('hidden');
                document.getElementById('password-input').value = '';
                setTimeout(() => {
                    document.getElementById('error-message').classList.add('hidden');
                }, 2000);
            }
        });
    </script>
</body>
</html>`;
}

function generateTestingHtml(teams, tasks, teamStartUrls, teamTaskUrls, adminPassword) {
    const passwordHash = sha256(adminPassword);

    const taskRows = Object.entries(tasks)
        .filter(([_, task]) => task.code && task.code !== 'null')
        .map(([taskId, task]) => `<tr><td><code>${taskId}</code></td><td><code>${task.code}</code></td></tr>`)
        .join('\n                        ');

    const teamSections = Object.entries(teams).map(([teamId, team]) => {
        const startUrl = teamStartUrls.find(t => t.id === teamId);
        const taskUrls = teamTaskUrls[teamId] || [];
        const flowSteps = [`<tr><td>Start</td><td>(click button)</td><td>${team.sequence[0]}</td><td><a href="${startUrl?.url}" target="_blank">${startUrl?.url}</a></td></tr>`];

        for (let i = 0; i < team.sequence.length; i++) {
            const taskId = team.sequence[i];
            const task = tasks[taskId];
            const nextTask = i < team.sequence.length - 1 ? team.sequence[i + 1] : '(end)';
            const taskUrl = taskUrls[i];
            const code = task?.code || '-';
            flowSteps.push(`<tr><td>${i + 1}</td><td><code>${code}</code></td><td>${nextTask}</td><td><a href="${taskUrl}" target="_blank">${taskUrl}</a></td></tr>`);
        }

        return `
                <div class="team-section">
                    <h3>${team.name} <small>(${teamId})</small></h3>
                    <p><strong>Sequence:</strong> ${team.sequence.join(' → ')}</p>
                    <table class="admin-table">
                        <thead><tr><th>Step</th><th>Code</th><th>Next Task</th><th>URL</th></tr></thead>
                        <tbody>${flowSteps.join('\n                            ')}</tbody>
                    </table>
                </div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Testing - Treasure Hunt</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        .testing { max-width: 1100px; }
        .team-section { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 10px; }
        .team-section h3 { margin-bottom: 10px; color: #667eea; }
        .team-section small { color: #888; font-weight: normal; }
        .team-section p { margin: 5px 0; }
        section { margin: 30px 0; }
        .admin-table a { word-break: break-all; }
    </style>
</head>
<body>
    <div class="container testing">
        <header class="header">
            <span class="team-name">Testing Dashboard</span>
        </header>

        <div id="login-section">
            <main class="task-content">
                <h1>Testing Access</h1>
                <p>Enter the admin password to view all codes and URLs.</p>
            </main>
            <form id="password-form" class="code-form">
                <input type="password" id="password-input" class="code-input" placeholder="Password" autocomplete="off" autofocus>
                <button type="submit" class="submit-btn">Enter</button>
            </form>
            <p id="error-message" class="error-message hidden">Incorrect password</p>
        </div>

        <div id="testing-content" class="hidden">
            <main class="task-content">
                <h1>Game Testing Reference</h1>
                <p class="warning">This page contains all codes and URLs. Do not share with players!</p>

                <section>
                    <h2>All Task Codes</h2>
                    <table class="admin-table">
                        <thead><tr><th>Task ID</th><th>Code</th></tr></thead>
                        <tbody>
                        ${taskRows}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Team Walkthroughs</h2>
                    ${teamSections}
                </section>
            </main>
        </div>
    </div>

    <script>
        const ADMIN_HASH = "${passwordHash}";

        async function sha256(message) {
            const msgBuffer = new TextEncoder().encode(message.toUpperCase().trim());
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        document.getElementById('password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password-input').value;
            const hash = await sha256(password);

            if (hash === ADMIN_HASH) {
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('testing-content').classList.remove('hidden');
            } else {
                document.getElementById('error-message').classList.remove('hidden');
                document.getElementById('password-input').value = '';
                setTimeout(() => {
                    document.getElementById('error-message').classList.add('hidden');
                }, 2000);
            }
        });
    </script>
</body>
</html>`;
}

// ============================================================
// CSS and JS Assets
// ============================================================

const GAME_CSS = `
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.container {
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    max-width: 500px;
    width: 100%;
    padding: 30px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid #eee;
}

.team-name {
    font-weight: bold;
    font-size: 1.1rem;
    color: #667eea;
}

.progress {
    background: #667eea;
    color: white;
    padding: 5px 12px;
    border-radius: 15px;
    font-size: 0.85rem;
}

.task-content {
    margin-bottom: 25px;
}

.task-content h1 {
    color: #333;
    margin-bottom: 15px;
    font-size: 1.5rem;
}

.task-content h2 {
    color: #444;
    margin-bottom: 12px;
    font-size: 1.3rem;
}

.task-content p {
    color: #555;
    line-height: 1.6;
    margin-bottom: 12px;
}

.task-content strong {
    color: #667eea;
}

.welcome h1 {
    text-align: center;
    font-size: 1.8rem;
}

.code-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

@media (min-width: 480px) {
    .code-form {
        flex-direction: row;
    }
}

.code-input {
    flex: 1;
    padding: 15px;
    font-size: 1.1rem;
    border: 2px solid #ddd;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    width: 100%;
    box-sizing: border-box;
}

.code-input:focus {
    outline: none;
    border-color: #667eea;
}

.submit-btn {
    padding: 15px 25px;
    font-size: 1rem;
    font-weight: bold;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.3s;
    width: 100%;
}

@media (min-width: 480px) {
    .submit-btn {
        width: auto;
    }
}

.submit-btn:hover {
    background: #5a6fd6;
}

.error-message {
    color: #e74c3c;
    text-align: center;
    margin-top: 15px;
    font-weight: bold;
}

.hidden {
    display: none;
}

/* Admin page styles */
.admin {
    max-width: 800px;
}

.admin h1 {
    color: #333;
    margin-bottom: 10px;
}

.admin h2 {
    color: #444;
    margin-top: 30px;
    margin-bottom: 15px;
}

.admin .warning {
    background: #fee;
    color: #c00;
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 25px;
    font-weight: bold;
}

.admin-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.admin-table th,
.admin-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.admin-table th {
    background: #f5f5f5;
    font-weight: bold;
}

.admin-table code {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
}

.admin ul {
    list-style: none;
}

.admin li {
    margin-bottom: 8px;
}

.admin a {
    color: #667eea;
}

.start-btn {
    display: block;
    width: 100%;
    padding: 18px;
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
    text-decoration: none;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.3s;
}

.start-btn:hover {
    background: #5a6fd6;
}
`;

const GAME_JS = `
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
`;

// ============================================================
// TESTING.md Generator
// ============================================================

function generateTestingDoc(teams, tasks, teamStartUrls) {
    const lines = [];
    lines.push('# Testing Instructions');
    lines.push('');
    lines.push('## Quick Start');
    lines.push('');
    lines.push('```bash');
    lines.push('cd dist && python3 -m http.server 8080');
    lines.push('```');
    lines.push('');
    lines.push('## Team Start URLs');
    lines.push('');
    lines.push('| Team | Name | Start URL |');
    lines.push('|------|------|-----------|');
    for (const t of teamStartUrls) {
        lines.push(`| ${t.id} | ${t.name} | http://localhost:8080/${t.url} |`);
    }
    lines.push('');

    // Task codes (only tasks with actual codes)
    lines.push('## Task Codes');
    lines.push('');
    lines.push('| Task | Code |');
    lines.push('|------|------|');
    for (const [taskId, task] of Object.entries(tasks)) {
        if (task.code && task.code !== 'null') {
            lines.push(`| ${taskId} | \`${task.code}\` |`);
        }
    }
    lines.push('');

    // Team walkthroughs
    lines.push('## Team Walkthroughs');
    lines.push('');

    for (const [teamId, team] of Object.entries(teams)) {
        lines.push(`### ${team.name} (${teamId})`);
        lines.push('');
        lines.push(`Sequence: ${team.sequence.join(' → ')}`);
        lines.push('');
        lines.push('| Step | Enter Code | Next Task |');
        lines.push('|------|------------|-----------|');
        lines.push('| Start | (click button) | ' + team.sequence[0] + ' |');

        for (let i = 0; i < team.sequence.length - 1; i++) {
            const taskId = team.sequence[i];
            const task = tasks[taskId];
            const nextTask = team.sequence[i + 1];
            if (task && task.code) {
                lines.push(`| ${i + 1} | \`${task.code}\` | ${nextTask} |`);
            }
        }
        lines.push('');
    }

    const testingPath = path.join(__dirname, '..', 'TESTING.md');
    fs.writeFileSync(testingPath, lines.join('\n'));
    console.log('Generated TESTING.md');
}

// ============================================================
// Main Generator
// ============================================================

function generate() {
    console.log('Loading config...');
    const config = loadConfig();

    console.log('Loading tasks...');
    const tasks = loadTasks();
    console.log(`  Found ${Object.keys(tasks).length} tasks`);

    console.log('Loading teams...');
    const teams = loadTeams();
    console.log(`  Found ${Object.keys(teams).length} teams`);

    // Clean and create dist directory
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true });
    }
    ensureDir(DIST_DIR);
    ensureDir(path.join(DIST_DIR, 'css'));
    ensureDir(path.join(DIST_DIR, 'js'));

    // Write CSS and JS
    fs.writeFileSync(path.join(DIST_DIR, 'css', 'style.css'), GAME_CSS);
    fs.writeFileSync(path.join(DIST_DIR, 'js', 'game.js'), GAME_JS);
    console.log('Generated CSS and JS assets');

    const teamStartUrls = [];
    const teamTaskUrls = {};  // { teamId: [url1, url2, ...] }

    // Generate pages for each team
    for (const [teamId, team] of Object.entries(teams)) {
        teamTaskUrls[teamId] = [];
        console.log(`\nGenerating pages for ${team.name}...`);

        const teamDir = path.join(DIST_DIR, teamId);
        ensureDir(teamDir);

        const sequence = team.sequence;
        const totalSteps = sequence.length;

        // Build the chain of files
        // start.html -> step2.html -> step3.html -> ... -> finale.html

        const files = [];

        // Generate filename for start page
        const startHash = md5(team.startCode);
        const startFilename = `start_${startHash}.html`;

        // For each step, we need:
        // - The task content to display
        // - The code to enter (from the CURRENT task) to go to next
        // - The filename of the next page

        for (let i = 0; i < sequence.length; i++) {
            const taskId = sequence[i];
            const task = tasks[taskId];

            if (!task) {
                console.error(`  ERROR: Task "${taskId}" not found!`);
                continue;
            }

            // The code for THIS task (what's written on the paper at this location)
            const thisCode = task.code;

            // Filename for this step's page
            let filename;
            if (i === 0) {
                // First task page - accessed after entering first task's code on start page
                filename = `s1_${md5(tasks[sequence[0]].code)}.html`;
            } else {
                // Subsequent pages - accessed after entering previous task's code
                const prevTaskCode = tasks[sequence[i-1]].code;
                filename = `s${i+1}_${md5(prevTaskCode)}.html`;
            }

            files.push({
                index: i,
                taskId,
                task,
                filename,
                thisCode
            });
        }

        // Now generate HTML files

        // 1. Start page
        const firstTaskFilename = files[0].filename;

        const startHtml = generateStartPageHtml({
            teamId,
            teamName: team.name,
            welcomeHtml: team.welcomeHtml,
            nextTaskFile: firstTaskFilename
        });

        fs.writeFileSync(path.join(teamDir, startFilename), startHtml);
        console.log(`  Created ${startFilename} (start page)`);

        teamStartUrls.push({
            id: teamId,
            name: team.name,
            url: `${teamId}/${startFilename}`
        });

        // 2. Task pages
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isLastTask = i === files.length - 1;

            let nextTaskFile = '';
            let correctHashSHA256 = '';

            if (!isLastTask) {
                // Code to enter is from THIS task, unlocks NEXT task
                correctHashSHA256 = sha256(file.thisCode);
                nextTaskFile = files[i + 1].filename;
            }

            const taskHtml = generateTaskPageHtml({
                teamId,
                teamName: team.name,
                stepNumber: i + 1,
                totalSteps,
                taskId: file.taskId,
                taskHtml: file.task.html,
                correctHashSHA256,
                nextTaskFile,
                isFinalPage: isLastTask
            });

            fs.writeFileSync(path.join(teamDir, file.filename), taskHtml);
            teamTaskUrls[teamId].push(`${teamId}/${file.filename}`);
            console.log(`  Created ${file.filename} (${file.taskId}${isLastTask ? ' - FINAL' : ''})`);
        }
    }

    // Generate public index page
    const indexHtml = generateIndexHtml();
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
    console.log('\nGenerated index.html');

    // Generate password-protected admin page
    const adminHtml = generateAdminHtml(teamStartUrls, config.admin_password);
    fs.writeFileSync(path.join(DIST_DIR, 'admin.html'), adminHtml);
    console.log('Generated admin.html (password-protected)');

    // Generate testing.html with all codes and flows (password-protected)
    const testingHtml = generateTestingHtml(teams, tasks, teamStartUrls, teamTaskUrls, config.admin_password);
    fs.writeFileSync(path.join(DIST_DIR, 'testing.html'), testingHtml);
    console.log('Generated testing.html (password-protected)');

    // Generate TESTING.md
    generateTestingDoc(teams, tasks, teamStartUrls);

    console.log('\n✓ Generation complete!');
    console.log(`  Output directory: ${DIST_DIR}`);
    console.log(`  Admin page: admin.html (password configured in CONFIG.md)`);
    console.log(`  Testing page: testing.html`);
    console.log(`  Team start URLs:`);
    for (const t of teamStartUrls) {
        console.log(`    ${t.name}: ${t.url}`);
    }
}

// Run
generate();
