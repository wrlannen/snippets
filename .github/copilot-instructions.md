# GitHub Copilot Instructions

## Project Overview
This is a minimal, keyboard-focused snippet management app with a dark UI inspired by Sublime Text. It stores text snippets in browser IndexedDB with no backend database. Features include automatic language detection, syntax highlighting, PWA capabilities for offline use, command palette, and export/import functionality.

## Key Architectural Decisions
- **Client-side only**: All data stored in IndexedDB, no server-side storage
- **Node.js + Express**: Serves static files only (could be replaced with nginx or Caddy)
- **Tailwind CSS**: Built and minified via CLI, no runtime build step
- **esbuild**: Bundles and minifies JavaScript for production
- **Modular JavaScript**: Client-side code split into multiple ES6 modules
- **Comment-based titles**: The first line uses comment syntax (//, #, --, /* */, <!-- -->) for titles in the sidebar
- **PWA**: Installable, works offline with service worker and manifest

## Code Style & Patterns
- Use modern JavaScript (ES6+) with `const`/`let`
- Prefer functional patterns where appropriate
- Use `??` for null coalescing, `?.` for optional chaining
- Escape all user content with `escapeHtml()` to prevent XSS
- Use `crypto.randomUUID()` for secure ID generation
- Add error handling for IndexedDB operations
- Modular code: Split functionality into separate JS files in `public/js/`

## Security Requirements
- **Always escape HTML**: Use `escapeHtml()` for any user content in innerHTML
- **Secure IDs**: Use `crypto.randomUUID()` for ID generation, not `Math.random()`
- **Input validation**: Validate all user inputs before storage
- **CSP headers**: Maintain Content-Security-Policy in server.js
- **No inline scripts**: Keep all JavaScript in external files

## Testing Requirements

**CRITICAL**: Always run Playwright tests after making changes:
```bash
npm test
```

For interactive debugging:
```bash
npm run test:ui
```

All PRs/commits must pass all tests:
- **E2E Tests**: Comprehensive Playwright tests covering UI interactions, keyboard shortcuts, persistence, etc.
- **Language Detection Tests**: Pattern-based detection tested against 200+ real-world fixtures
- **Test Files**: `tests/*.spec.js` for UI tests, `tests/run-detection-tests.mjs` for language detection

Test coverage includes:
- Snippet creation, editing, deletion (CMD+., CMD+F, Escape)
- Command palette (CMD+K)
- Import/Export functionality
- PWA installation
- Language detection and syntax highlighting
- Mobile overlay and responsive behavior
- Sidebar resize, toggle, and state persistence
- IndexedDB persistence and reload
- Edge cases and error handling

## UI/UX Guidelines
- **Minimal & Keyboard-first**: CMD+K (command palette), CMD+. (new), CMD+F (search), Escape (dismiss)
- **Sublime-like**: Dark theme with subtle hover states
- **Comment-based titles**: Use comment syntax (// Title, # Title, -- Title, /* Title */, <!-- Title -->) for snippet titles
- **Autosave**: Debounced autosave after 800ms of inactivity
- **Subtle delete**: Hover to reveal ×, click once for confirmation, click again to delete
- **PWA**: Installable, works offline, fast loading

## Build Process
- **CSS**: `npm run build:css` - Tailwind CLI generates `public/tailwind.output.css`
- **Vendor JS**: `npm run build:vendor` - Concatenates CodeMirror and addons to `public/dist/vendor.js`
- **App JS**: `npm run build:js` - esbuild bundles `public/js/*.js` to `public/dist/app.js`
- **Full Build**: `npm run build` - Runs all build steps
- **Dev**: `npm run dev` - Watches server.js, `npm run dev:css` for CSS watching

## Common Pitfalls
- **Don't add global event listeners in loops**: Clean up old listeners or use delegation
- **Don't block the UI**: Use debouncing for expensive operations like renderList()
- **Don't trust IndexedDB**: Always wrap in try/catch for errors
- **Test on every change**: Run `npm test` and `npm run test:lang-fixtures` before committing
- **Language detection**: Ensure new snippets are covered by fixtures in `tests/fixtures/language-detection/`

## File Structure
- `server.js` - Express server with security headers and CSP
- `Dockerfile` - Docker containerization
- `tailwind.config.cjs` - Tailwind CSS configuration
- `playwright.config.js` - Playwright test configuration
- `scripts/` - Build scripts (build-js.mjs, build-vendor.mjs)
- `public/index.html` - Main HTML structure
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker for offline functionality
- `public/app.css` - Additional custom styles
- `public/tailwind.css` - Tailwind input CSS
- `public/tailwind.output.css` - Built Tailwind CSS
- `public/dist/` - Built JavaScript bundles (app.js, vendor.js)
- `public/js/` - Client-side JavaScript modules:
  - `app.js` - Main application logic
  - `command-palette.js` - Command palette functionality
  - `detect-language.js` - Language detection engine
  - `editor.js` - CodeMirror editor setup
  - `import-export.js` - Import/Export features
  - `list.js` - Snippet list rendering
  - `pwa-install.js` - PWA installation prompts
  - `seed-snippets.js` - Initial snippet seeding
  - `sidebar-resize.js` - Sidebar resizing
  - `sidebar-state.js` - Sidebar state management
  - `storage-idb.js` - IndexedDB operations
  - `storage-sync.js` - Storage synchronization
  - `storage.js` - Storage abstraction
  - `ui.js` - UI utilities
  - `utils.js` - General utilities
- `public/vendor/` - CodeMirror and addon files (minified)
- `tests/` - Test files and fixtures:
  - `*.spec.js` - Playwright E2E tests
  - `run-detection-tests.mjs` - Language detection test runner
  - `fixtures/language-detection/` - Test fixtures for language detection (200+ files)
- `offline-docs/` - Documentation for offline features and migration
- `assets/` - Screenshots and static assets

## When Adding Features
1. Write tests first (TDD preferred) - add Playwright tests and/or language detection fixtures
2. Implement the feature in appropriate JS modules
3. Run `npm run build` to ensure builds work
4. Run `npm test` and `npm run test:lang-fixtures` to verify
5. Check for XSS vulnerabilities and security issues
6. Update README.md if user-facing
7. Update this instructions file if architectural changes

## Performance Considerations
- Debounce renderList() during typing (150ms)
- Debounce autosave (800ms)
- Use event delegation for dynamic sidebar items
- IndexedDB writes use fire-and-forget pattern with in-memory cache
- Bundle and minify JS/CSS for production
- Lazy-load non-critical features
