# Treasure Hunt Game Generator

A serverless treasure hunt game engine for parties, team building, or family events. Multiple teams navigate through tasks by entering codes found at physical locations. No backend required - just static HTML files.

## Features

- **Multi-team support** - Each team may get their own unique path through tasks
- **Collaborative finale** - Guest teams collect letters that the main team combines to unlock the grand finale
- **Secure by design** - Hashed URLs prevent cheating by viewing page source
- **GPS tracking** (optional) - Monitor team locations in real-time
- **Zero dependencies** - Generated game is pure HTML/CSS/JS
- **Mobile-friendly** - Works on any device with a browser

## Quick Start

### 1. Create your private repository

Forks are public, so create a private copy to keep your codes secret:

```bash
# Create a new private repo on GitHub first, then:
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Add this repo as upstream to receive updates
git remote add upstream git@github.com:DmitriGoloubentsev/TreasureHunt.git
git fetch upstream
git merge upstream/main

git push -u origin main
```

**To pull future updates:**
```bash
git fetch upstream
git rebase upstream/main
git push
```

### 2. Customize your game

Edit the task and team files:

**Tasks** (`tasks/*.md`):
```markdown
---
code: MYCODE123
---

# The Secret Garden

Go to the backyard and find the big oak tree.
Look inside the birdhouse for your next code!

**Hint:** It's the blue birdhouse.
```

**Teams** (`teams/team1.md`):
```markdown
---
name: Red Dragons
start_code: START_RED_2024
sequence:
  - task1
  - task3
  - task5
  - grand_finale
---

# Welcome, Red Dragons!

Your adventure begins now. Good luck!
```

### 3. Generate the game

```bash
node generator/generate.js
```

### 4. Host it anywhere

Upload the `dist/` folder to any static host:
- GitHub Pages
- Netlify
- Vercel
- Any web server

Or run locally:
```bash
cd dist && python3 -m http.server 8080
```

## Game Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         GUEST TEAMS                             │
│  Team 2 ──► tasks ──► Finale: Letter "C" ──┐                   │
│  Team 3 ──► tasks ──► Finale: Letter "A" ──┼──► Give to Team 1 │
│  Team 4 ──► tasks ──► Finale: Letter "K" ──┤                   │
│  Team 5 ──► tasks ──► Finale: Letter "E" ──┘                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN TEAM (Team 1)                         │
│  tasks ──► Collect Letters ──► Enter "CAKE" ──► GRAND FINALE   │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
├── tasks/                    # Task definitions (edit these)
│   ├── task1.md ... task8.md   # Location-based tasks with codes
│   ├── finale_team2.md ...     # Guest team finales (reveal letters)
│   ├── collect.md              # Main team letter collection
│   └── grand_finale.md         # Victory page
├── teams/                    # Team configurations (edit these)
│   ├── team1.md                # Main team
│   └── team2.md ... team5.md   # Guest teams
├── generator/
│   └── generate.js           # Build script
├── server/                   # Optional monitoring server
│   ├── server.js
│   └── admin.html
├── dist/                     # Generated output (don't edit)
└── TESTING.md                # Generated - all codes for testing
```

## Customization Guide

### Creating Your Own Hunt

1. **Plan your locations** - Where will you hide codes? (garden, bookshelf, under pillow, etc.)

2. **Create tasks** - One `.md` file per location in `tasks/`:
   ```markdown
   ---
   code: COOKIE77
   ---

   # The Cookie Jar

   Head to the kitchen and find the cookie jar.
   Your code is hidden inside!
   ```

3. **Design team paths** - Each team can visit different locations in different orders:
   ```yaml
   sequence:
     - task2      # Bookshelf
     - task5      # Garage
     - task1      # Garden
     - finale_team3
   ```

4. **Choose your secret word** - Guest teams each get one letter. Update `finale_team*.md` files.

5. **Generate and test** - Run `node generator/generate.js`, then test each team's path.

### Changing the Theme

Edit `GAME_CSS` in `generator/generate.js`:

```javascript
const GAME_CSS = `
body {
    background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
    /* Your custom styles */
}
`;
```

### Single-Team Mode

For simpler games without letter collection:
1. Use only `team1.md`
2. Set sequence to end with `grand_finale` directly
3. Remove letter collection tasks

## Running with GPS Tracking

For real-time team monitoring:

```bash
cd server
npm install
npm start
```

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Game |
| http://localhost:3000/admin | Live dashboard |
| http://localhost:3000/admin/map | GPS map |

**Note:** GPS requires HTTPS on mobile devices. For production, use a reverse proxy with SSL.

## Security

### How It Works

1. Player enters code (e.g., `GNOME42`)
2. Browser computes SHA-256 hash
3. Compares to expected hash stored in page
4. On match, redirects to next page (MD5-hashed filename)

### What's Protected

- Codes can't be read from page source (only hash visible)
- Next URLs are unguessable (16-char hex)
- No server-side secrets needed

### What's Not Protected

- Browser history (use incognito mode)
- Players sharing URLs directly (trust your players!)

## Deployment

### GitHub Pages

1. Push your repo to GitHub
2. Go to Settings > Pages
3. Set source to `dist/` folder or `gh-pages` branch
4. Run `node generator/generate.js` to create `TESTING.md` with team URLs

### Netlify / Vercel

1. Connect your repo
2. Set publish directory to `dist`
3. Deploy

## Example Game

This repo includes a sample 5-team birthday party game:

- **Team 1 (Red Dragons)** - Main team, collects letters
- **Teams 2-5** - Complete tasks, receive letters C-A-K-E
- **Secret word** - CAKE (for a birthday cake reveal!)

Customize the tasks and theme for your event.

## Tips for a Great Hunt

1. **Print codes clearly** - Use large, readable fonts
2. **Waterproof outdoor codes** - Laminate or use plastic sleeves
3. **Test every path** - Walk through each team's sequence
4. **Have backup codes** - In case one gets lost
5. **Brief team captains** - Explain how to enter codes
6. **Charge devices** - Ensure everyone has battery

## Contributing

Pull requests welcome! Ideas for improvements:

- [ ] QR code support
- [ ] Timer/leaderboard
- [ ] Puzzle/riddle task types
- [ ] Multi-language support
- [ ] PWA offline support

## License

MIT - Use freely for your treasure hunts!

---

Made with fun for parties everywhere.
