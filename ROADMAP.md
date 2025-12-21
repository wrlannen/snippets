# Snippets — Product Roadmap

This file describes a prioritized plan to evolve **Snippets** from a lightweight localStorage scratchpad into a more capable, reliable, and still-minimal “developer clipboard + notes” tool.

## Guiding Principles

- **Local-first, zero-account by default**: Everything works offline and without sign-in.
- **Keyboard-first**: Primary actions should be fast via shortcuts.
- **Minimal UI**: Add power via workflows, not chrome.
- **Safe by default**: Prevent XSS, keep CSP tight, don’t trust localStorage.
- **No-backend baseline**: Features should degrade gracefully without any server.

## Current Snapshot (What We Have Today)

- Client-only data persisted in `localStorage`.
- Minimal sidebar list with first-line-as-title.
- Debounced autosave.
- Keyboard shortcuts (new snippet, search, escape, etc.).
- Delete from list via a small icon.
- Static server with security headers.
- Playwright E2E coverage for core flows.

## Product Goals (What “More Useful” Means)

1. **Never lose snippets** (backup, export/import, recovery).
2. **Find anything instantly** (search quality, filters, metadata).
3. **Organize lightly** (tags/pins, small structure, no heavy taxonomy).
4. **Move snippets between devices** (optional, privacy-respecting sync).
5. **Scale to lots of snippets** (performance, UI responsiveness).

## Non-Goals (At Least Initially)

- Building a full notes app with rich formatting.
- A heavy backend database as the default.
- Collaboration/multi-user editing.
- “Beautiful marketing site” work.

---

## Roadmap (Prioritized)

### P0 — Hygiene + Foundation (1–2 sessions)

**Why**: Reduce future friction and keep the project coherent as features grow.

1. **Bring documentation in sync with reality**
   - Update `README.md` feature list to match the actual UI/shortcuts.
   - Ensure `tests/README.md` matches the current delete behavior.
   - Acceptance: docs reflect current behavior; no confusing stale instructions.

2. **Stabilize delete UX contract**
   - Decide and document: *immediate delete* vs *confirm delete*.
   - Ensure tests match the chosen behavior.
   - Acceptance: delete behavior is consistent across UI + tests.

3. **Remove weak ID fallback**
   - Today, the `uid()` fallback uses `Math.random()` when `crypto.randomUUID` is missing.
   - Replace with a safer fallback strategy:
     - Prefer `crypto.getRandomValues` when `randomUUID` is unavailable.
     - If neither is available, show a clear “unsupported browser” status and avoid creating new snippets.
   - Acceptance: IDs are cryptographically strong whenever creation is allowed.

4. **Add simple versioning/migrations**
   - Add a tiny migration layer for `localStorage` payloads.
   - Acceptance: future schema changes don’t break existing users.

**Testing**
- Playwright: ensure existing suite passes; add/adjust tests for the final delete contract.

---

### P1 — “Never Lose Data” (High Value) (1–3 days)

**Why**: Local-only apps are great until a browser profile resets.

1. **Export / Import**
   - Export snippets to a single JSON file.
   - Import JSON with merge behavior:
     - Merge by ID when possible.
     - Optionally dedupe by content hash.
   - Acceptance:
     - Export produces valid JSON.
     - Import works on a fresh profile.
     - Import handles conflicts deterministically.

2. **Automatic backups**
   - Maintain a rolling set of backups in `localStorage` (or IndexedDB if needed).
   - Example: keep the last 10 snapshot versions.
   - Acceptance: user can restore last-known-good state.

3. **Safety rails for quota**
   - Better “storage nearly full” warning.
   - Optional auto-backoff: slow autosave frequency when near quota.
   - Acceptance: users get actionable warnings before writes start failing.

**Testing**
- Playwright:
  - Export creates a downloadable file.
  - Import restores snippets.
- Unit tests (optional): migration + import merge logic (if you want a light test harness).

---

### P1 — “Find Anything” Search & Navigation (High Value) (1–3 days)

**Why**: Search is the main tool once you have many snippets.

1. **Search quality improvements**
   - Tokenized search (multiple terms).
   - Match title-first (first line weighted higher than body).
   - Highlight matching terms in results (minimal, subtle).
   - Acceptance: searching for two words narrows results correctly.

2. **Recents + pinned**
   - Add “Pinned” toggle per snippet.
   - Keep a default sort: pinned first, then updatedAt.
   - Acceptance: pin state persists; ordering consistent after reload.

3. **Quick switcher**
   - A command-palette-like overlay (minimal) for “jump to snippet”.
   - Shortcut suggestion: `Cmd+P` (like editors) or keep `Cmd+F` and add `Cmd+K`.
   - Acceptance: opens, filters, selects with arrow keys + Enter.

**Testing**
- Playwright:
  - Pin persists and affects ordering.
  - Search filters with multiple terms.
  - Quick switcher navigation.

---

### P2 — Light Organization (Medium Value) (2–5 days)

**Why**: Tags/folders help once you have hundreds of entries.

1. **Tags**
   - Minimal tag model: array of strings.
   - Fast UI: inline tag entry + autocomplete from existing tags.
   - Filter by tag (keyboard-first).
   - Acceptance: tags persist; filtering works quickly.

2. **Collections (optional)**
   - Instead of “folders”, consider “collections” (a single label) to stay minimal.
   - Acceptance: collection is optional metadata and doesn’t complicate the editor.

3. **Bulk operations**
   - Select multiple snippets (keyboard range selection) and delete/export.
   - Acceptance: fast and doesn’t add clutter.

---

### P2 — Performance & Scale (Medium Value) (as needed)

**Why**: LocalStorage + DOM rendering will struggle at thousands of snippets.

1. **IndexedDB for storage (optional but likely)**
   - Move from `localStorage` to IndexedDB for large datasets.
   - Keep `localStorage` only for small settings and a migration marker.
   - Acceptance: thousands of snippets remain responsive.

2. **List virtualization**
   - Render only visible items.
   - Acceptance: scrolling remains smooth.

3. **Background indexing**
   - Precompute a search index (simple inverted index) and update incrementally.
   - Acceptance: search results appear instantly even with large datasets.

---

### P3 — Optional Sync (High Impact, Highest Complexity) (1–2 weeks)

**Why**: The biggest “usefulness leap” is cross-device continuity.

**Design options (choose one)**

1. **User-managed sync (no server)**
   - Sync via a file (export/import) + optional “watch file” is not feasible in browser, so stick to explicit import.
   - Pros: simplest, privacy-friendly.
   - Cons: manual.

2. **End-to-end encrypted cloud sync (small backend)**
   - Store encrypted blobs; server never sees plaintext.
   - Minimal auth: magic link or passkey.
   - Use per-device keys + recovery key.
   - Pros: real sync.
   - Cons: complexity, key management.

3. **Bring-your-own-storage**
   - WebDAV / S3-compatible bucket as a target.
   - Pros: no vendor lock-in.
   - Cons: setup friction.

**Acceptance**
- Two devices converge to same set after sync.
- Clear conflict strategy (LWW, merge, or per-snippet history).

**Testing**
- Add deterministic integration tests for sync merge logic.

---

## Suggested Milestones (One-Line)

- **M0**: Docs + ID safety + migrations.
- **M1**: Export/import + backups.
- **M2**: Better search + pinning + quick switcher.
- **M3**: Tags + bulk ops.
- **M4**: IndexedDB + virtualization.
- **M5**: Optional encrypted sync.

## Rollout / Risk Notes

- **Schema migrations**: do them early (P0) to avoid data loss later.
- **Storage limits**: IndexedDB is the main escape hatch.
- **Security**: keep strict CSP; escape all user content inserted into the DOM.
- **.dev domain**: HTTPS/HSTS is mandatory in production; ensure deployment supports TLS.

## How to Keep This Roadmap Honest

- Every milestone should ship with:
  - Updated docs
  - Updated/added Playwright tests
  - A quick manual smoke test checklist
- If a feature adds UI complexity, require a keyboard-first path.
