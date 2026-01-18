const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));

// In-memory storage for events
const events = [];
const teamStatus = {};

// SSE clients for real-time updates
const sseClients = [];

// Broadcast to all SSE clients
function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => client.write(message));
}

// POST /api/event - Receive events from game
app.post('/api/event', (req, res) => {
    const event = {
        id: events.length + 1,
        timestamp: new Date().toISOString(),
        ...req.body
    };

    events.push(event);

    // Update team status
    const { teamId, teamName, type, step, taskId, success, location } = event;

    if (teamId) {
        if (!teamStatus[teamId]) {
            teamStatus[teamId] = {
                teamId,
                teamName: teamName || teamId,
                currentStep: 0,
                lastSeen: null,
                location: null,
                attempts: [],
                completed: false
            };
        }

        const team = teamStatus[teamId];
        team.lastSeen = event.timestamp;

        if (location) {
            team.location = location;
        }

        if (type === 'page_view') {
            // Only update step if it's higher (don't regress on old page loads)
            if ((step || 0) >= (team.currentStep || 0)) {
                team.currentStep = step || team.currentStep;
                team.currentTask = taskId;
            }
        }

        if (type === 'code_attempt') {
            team.attempts.push({
                timestamp: event.timestamp,
                code: event.code,
                success: event.success,
                step: event.step
            });

            if (success) {
                // Only advance step if it's actually progress
                const newStep = (step || 0) + 1;
                if (newStep > (team.currentStep || 0)) {
                    team.currentStep = newStep;
                }
            }
        }

        if (type === 'game_complete') {
            team.completed = true;
            team.completedAt = event.timestamp;
        }
    }

    // Broadcast to admin dashboard
    broadcast({ type: 'new_event', event, teamStatus });

    console.log(`[${event.timestamp}] ${teamName || teamId}: ${type}${event.code ? ` (${event.code})` : ''}${success !== undefined ? ` - ${success ? 'SUCCESS' : 'FAIL'}` : ''}`);

    res.json({ ok: true });
});

// GET /api/events - Get all events
app.get('/api/events', (req, res) => {
    res.json({ events, teamStatus });
});

// GET /api/events/stream - SSE for real-time updates
app.get('/api/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send current state
    res.write(`data: ${JSON.stringify({ type: 'init', events, teamStatus })}\n\n`);

    // Add to clients list
    sseClients.push(res);

    // Remove on disconnect
    req.on('close', () => {
        const index = sseClients.indexOf(res);
        if (index !== -1) sseClients.splice(index, 1);
    });
});

// GET /api/reset - Clear all data
app.get('/api/reset', (req, res) => {
    events.length = 0;
    Object.keys(teamStatus).forEach(key => delete teamStatus[key]);
    broadcast({ type: 'reset' });
    console.log('--- Data reset ---');
    res.json({ ok: true });
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve admin map
app.get('/admin/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-map.html'));
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           TREASURE HUNT MONITOR SERVER                     ║
╠════════════════════════════════════════════════════════════╣
║  Game URL:    http://localhost:${PORT}/                       ║
║  Admin:       http://localhost:${PORT}/admin                  ║
║  Live Map:    http://localhost:${PORT}/admin/map              ║
║  API Events:  http://localhost:${PORT}/api/events             ║
║  Reset:       http://localhost:${PORT}/api/reset              ║
╚════════════════════════════════════════════════════════════╝
`);
});
