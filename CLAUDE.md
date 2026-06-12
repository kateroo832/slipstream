# Slipstream app — notes for Claude

Plain HTML/CSS/JS PWA, no build step, no dependencies. Hosted on GitHub Pages
from `main`. Test locally with `powershell -File serve.ps1` (port 8642).

- `app.js` — state, due-date logic, rendering (template strings + event
  delegation on `data-action` attributes), dialogs, boot.
- `moves.js` — exercise-snack database for the Move tab (energy 2/5/10 min →
  one random exercise, chainable). The user has fibromyalgia (flare-day toggle
  filters to spice 0) and hypermobility (`hm` cues; control work, never
  passive end-range stretching). Picks are weighted toward legs/core/power —
  her goal is running up stairs. Per-exercise ban list lives in app state.
- `sync.js` — GitHub Contents API sync. One JSON file per list at
  `data/<id>.json` in the user's private `slipstream-data` repo. Pull diffs by
  blob sha; item-level merge where newest `updatedAt` wins; push with sha,
  re-pull + retry once on 409/422.
- `sw.js` — network-first shell cache. **Bump the `CACHE` version string when
  changing any shell file list.**
- User data/schema documentation lives in `slipstream-data/CLAUDE.md`.

Design constraints (intentional, don't "fix"):

- Recurring tasks schedule from last completion, never the calendar — missed
  instances must never stack. No "overdue" language anywhere; use
  "ready since …".
- Snoozing is penalty-free. Archive instead of delete.
- The user has ADHD: keep interactions one-tap, keep copy warm and short,
  keep the check-off moment satisfying (confetti + vibration).
- Dark theme only for now. CSS variables in `:root` define the palette.
