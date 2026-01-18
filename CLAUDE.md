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
---

# Task Title

Description shown to players (Markdown supported).
```

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

## Important Notes

- Codes are case-insensitive (normalized to uppercase)
- TESTING.md is auto-generated with all codes and URLs (gitignored)
- dist/index.html is an admin page listing all team start URLs
