# Plan: Self-contained DSA Tracker Chrome Extension

## Goal
Download the extension, paste a GitHub token once, and every accepted solution on
LeetCode / GFG / CodeChef / Codeforces is auto-committed to a GitHub repo. Commits
drive the GitHub contribution streak; an in-extension dashboard shows stats.

## Architecture decisions (confirmed)
- **Push target:** directly to GitHub API from the extension. No Python backend.
- **Auth:** GitHub fine-grained Personal Access Token, pasted once, stored in chrome.storage.
- **Repo:** auto-create `username/<repo>` (default `dsa-solutions`) with a README if missing.

## What stays as-is
- `platforms/base.js` + `leetcode.js` / `gfg.js` / `codechef.js` / `codeforces.js`
  scrapers. They already extract {title,url,difficulty,tags,language,code,platform,slug}
  and call SUBMIT_PROBLEM. No change needed to the scraping logic.
- `manifest.json` host_permissions already include api.github.com and the platforms.

## Changes

### 1. New `github.js` (service worker module) — client-side GitHub layer
Port the logic from Backend/github_service.py + file_manager.py into JS:
- `getUser(token)` -> validate token, get login
- `ensureRepo(token, owner, repo)` -> GET repo; if 404, create it with a starter README
- `getFileSha(token, repo, path)` / `upsertFile(...)` -> Contents API (base64), include sha on update
- `buildFiles(problem)` -> path `DSA/<Category>/<Difficulty>/<Slug>/` with
  solution.<ext>, problem.md, README.md  (mirror file_manager.py layout + ext map)
- `updateRootReadme(...)` -> append the problem to the repo's top-level index table
- category/difficulty classifier ported from platform_classifier.py (tag+title keywords)

### 2. Rewrite `background.js`
- Replace backend fetch with: classify -> buildFiles -> ensureRepo -> upsert each file
  in one commit message `Added <title> - <category> - <difficulty>`.
- Keep dedupe via lastSentProblemKey + a `solved` list in chrome.storage.
- On success: record entry {title, platform, difficulty, category, language, url,
  status:"pushed", solved_date} into chrome.storage `stats.solved`, update streak,
  fire a chrome.notifications success toast ("Pushed! 🔥 N-day streak").
- Messages: GET_SETTINGS, SAVE_SETTINGS, SUBMIT_PROBLEM, GET_STATS, TEST_CONNECTION.

### 3. Rewrite `popup.html` + `popup.js` — "Connect with GitHub" UX
- Fields: GitHub token (password), repo name (default dsa-solutions), branch (default main),
  update-existing toggle.
- "Connect & Verify" button -> TEST_CONNECTION validates token, ensures repo, shows
  "Connected as <login> -> <repo>" with a green status.
- Live mini-stats (pushed, current streak) + "Open Dashboard" button.
- Drop the backendUrl / local-repo-path fields (no longer relevant).

### 4. New in-extension `dashboard.html` / `dashboard.css` / `dashboard.js`
- Reuse the visual language of the standalone dashboard/ I built (aurora bg, KPI cards,
  heatmap, Chart.js doughnut/bar, recent feed), but read from chrome.storage via
  GET_STATS instead of a backend. Bundle chart.umd.min.js locally (CSP blocks CDN in MV3).
- Registered under web_accessible_resources; opened from the popup.

### 5. `manifest.json` tweaks
- Add `dashboard.html`, `dashboard.css`, `dashboard.js`, `vendor/chart.umd.min.js`,
  `github.js` to web_accessible_resources / background as needed.
- host_permissions already cover api.github.com. Keep notifications/storage/alarms.

### 6. Streak alarm (optional polish)
- Daily `alarms` check: if no solve today and a streak is active, fire a reminder toast.

## Verification
- Lint-load the extension mentally: check MV3 service-worker constraints (no top-level
  await issues, importScripts for github.js + classifier).
- Test token flow with a throwaway repo before finalizing (user-driven; I can't use a
  real token). Provide a manual test checklist.
- Confirm base64 encoding handles UTF-8 code (emoji/comments) correctly.

## Security notes
- Token stored in chrome.storage.local (not synced). Never logged. Documented that a
  fine-grained token scoped to a single repo (Contents: read/write) is safest.

## Out of scope (flag for later)
- The existing Python Backend/ stays in the repo but is no longer required by the
  extension. Standalone dashboard/ still works against it if run.
