# Slipstream

Checklists that forgive you. A tiny offline-first PWA for:

- **Trip countdowns** — tasks keyed to "X days before departure," with a big
  honest countdown.
- **Projects** — woodworking, organizing, anything with phases. Sections,
  progress bar, and an always-visible "next up."
- **Recurring chores** — the ADHD-friendly kind: tasks reschedule from the day
  you *actually* did them. Skip vacuuming for a month and you have **one** task
  ready, not three overdue. Snoozing is penalty-free. Nothing in the app says
  "overdue."

No accounts, no server, no build step. Plain HTML/CSS/JS.

## How it works

- The app shell (this repo) is **public** and hosted free on GitHub Pages.
  It contains no personal data.
- Your checklists live in a separate **private** repo (`slipstream-data`),
  one JSON file per list under `data/`. The app reads and writes them through
  the GitHub API using a fine-grained personal access token you paste into
  Settings (stored only in that device's localStorage).
- Sync is offline-first: everything works without a connection and pushes when
  you're back online. Conflicts merge item-by-item, newest edit wins.
- Claude (via Claude Code / Cowork) edits the data repo directly — "add a
  packing list for the lake trip" is just a JSON file commit. See the data
  repo's `CLAUDE.md` for the schema.

## Setup

See [SETUP.md](SETUP.md) for the one-time GitHub + phone walkthrough.

## Local development

Serve the folder with any static server, e.g.:

```powershell
powershell -File serve.ps1   # http://localhost:8642
```

Without sync configured the app runs on built-in demo data (marked "local" in
the top bar). The service worker only registers on https, so local dev always
loads fresh files.

## Design notes

- One JSON file per list keeps GitHub API writes small and merge conflicts rare.
- `updatedAt` on every list and item drives the conflict merge — bump it on any
  edit, including hand edits.
- Deleting items/lists on one device while another holds offline edits can
  resurrect them via merge; archiving (`"archived": true`) avoids that.
