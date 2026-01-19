# CLAUDE.md

This file provides context for AI assistants working on this project.

## Project Overview

Multi-team treasure hunt game generator. Creates static HTML pages with obfuscated URLs that players navigate by entering codes found at physical locations.

## Architecture

```
tasks/*.md    ──┐
                ├──► generate.js ──► dist/ (static HTML)
teams/*.md    ──┘
```

**Source files (edit these):**
- `tasks/*.md` - Task definitions with codes and descriptions
- `teams/*.md` - Team configs with name, start code, and task sequence

**Generated output (don't edit):**
- `dist/` - Static HTML files with hashed filenames

**Optional server:**
- `server/` - Express server for GPS tracking and admin dashboard

## Key Concepts

### Game Flow
- Teams get a unique start URL
- Enter code → redirects to next task page (hashed filename)
- Guest teams collect letters, main team collects letters from guests
- All letters combine to unlock grand finale

### Security Model
- SHA-256 hash stored in page to verify codes (secure)
- MD5 hash used for filename obscurity (not security-critical)
- URLs are unguessable without knowing the code

## Common Tasks

### Add a new task
1. Create `tasks/newtask.md` with frontmatter `code: MYCODE`
2. Add task to team sequence in `teams/*.md`
3. Run `node generator/generate.js`

### Add a new team
1. Create `teams/team6.md` with name, start_code, and sequence
2. Run `node generator/generate.js`

### Change styling
Edit `GAME_CSS` constant in `generator/generate.js`, then regenerate.

### Test the game
```bash
cd dist && python3 -m http.server 8080
# Open http://localhost:8080
```

## File Formats

### Task (tasks/*.md)
```markdown
---
code: MYCODE123
timeout_minutes: 10
---

# Task Title

Description shown to players (Markdown supported).
```

- `code`: The answer code players must enter (required, except for final pages)
- `timeout_minutes`: Optional per-task time limit (overrides global default)

### Team (teams/*.md)
```markdown
---
name: Team Name
start_code: SECRET_START_CODE
sequence:
  - task1
  - task3
  - finale_team2
---

# Welcome message

Body shown on start page.
```

## Build Commands

```bash
# Generate static site
node generator/generate.js

# Run simple server
cd dist && python3 -m http.server 8080

# Run with tracking
cd server && npm install && npm start
```

### Config (CONFIG.md)
```markdown
---
admin_password: treasure2024
default_timeout_minutes: 15
hint_penalty_minutes: 5
organizers:
  - name: Alex
    phone: +1234567890
    telegram: alex_org
    whatsapp: +1234567890
---
```

- `admin_password`: Password for admin.html and testing.html pages
- `default_timeout_minutes`: Global time limit per task (can be overridden per task)
- `hint_penalty_minutes`: Time penalty added when teams request organizer help
- `organizers`: List of organizer contacts shown when timer expires

## Timer and Penalty System

Each task has a countdown timer. When time expires:
1. Organizer contacts appear with Call/WhatsApp/Telegram buttons
2. Teams can click "Get Answer" which adds a time penalty
3. Total penalty is tracked across all tasks in the session
4. Penalty is included in tracking events sent to server

## Important Notes

- Codes are case-insensitive (normalized to uppercase)
- TESTING.md is auto-generated with all codes and URLs (gitignored)
- dist/index.html is an admin page listing all team start URLs
- Timer starts when page loads and persists if page is refreshed
- Penalties are stored in sessionStorage (cleared when browser closes)
