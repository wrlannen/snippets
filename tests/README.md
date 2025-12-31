

# Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end UI/integration testing, and a fast Node.js script for language detection logic tests.


## Running Tests

```bash
# Run all Playwright UI/integration tests
npm test

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Run language detection fixture tests (Node.js, fast)
npm run test:lang-fixtures
```

Test results and HTML reports for Playwright are available in the `playwright-report/` directory after running tests.
The language detection fixture test output is printed to the terminal.


## Test Coverage

### Playwright UI/Integration Tests

The following test files cover end-to-end scenarios:

- **snippets.spec.js**: Core snippet CRUD (create, edit, delete), autosave, empty state, first-run seeding, sidebar updates, character count, IndexedDB persistence.
- **keyboard-shortcuts.spec.js**: Platform-specific shortcuts (⌘+K / Ctrl+K for palette, CMD+F/Ctrl+F for search, CMD+B/Ctrl+B for sidebar toggle, copy shortcuts).
- **sidebar-toggle.spec.js**: Sidebar show/hide functionality and persistence.
- **sidebar-resize.spec.js**: Draggable sidebar resizing and state persistence.
- **search.spec.js**: Search and filter functionality in sidebar.
- **export-import.spec.js**: JSON export/import of snippets and settings.
- **copy-clipboard.spec.js**: Copy snippet to clipboard shortcuts and functionality.
- **settings.spec.js**: Font size controls, settings persistence.
- **pwa-install.spec.js**: PWA install prompts for Chrome/Edge and Safari.
- **mobile-overlay.spec.js**: Desktop-only overlay on mobile devices.
- **language-detection.spec.js**: Manual language mode switching and persistence.

Scenarios include:
- Creating snippets (new snippet button, ⌘+K / Ctrl+K on Mac/Windows)
- Editing and autosave (debounced)
- Deleting snippets (confirmation, cancel flow, delete all)
- Search and filter (CMD+F/Ctrl+F, sidebar filter)
- Keyboard shortcuts (as above)
- Platform-specific shortcut behavior (Mac/Windows)
- Sidebar rendering, updates, first-line comment titles
- Sidebar resize (drag to resize) and toggle (show/hide)
- Character count display
- LocalStorage persistence and reload
- Import/export of snippets (JSON)
- Settings panel (font size, theme, persistence)
- PWA install prompt and Safari/Chrome install flows
- Mobile overlay and touch interactions (desktop-only overlay)
- UI/UX edge cases (empty state, create new, etc.)

### Language Detection Fixture Tests

- Located in `tests/run-detection-tests.mjs` and `tests/fixtures/language-detection/`
- Each language has a folder with 10+ real-world snippet files
- The test runner imports the real detection logic from `public/js/detect-language.js` (no code duplication)
- Tests verify that each snippet is detected as the correct language mode (CodeMirror mode string or `null` for plain text)
- Run with `npm run test:lang-fixtures`
- Output: summary of passed/failed cases in the terminal


## CI/CD

Tests are configured to run in CI environments with automatic retries and headless mode. All PRs and commits must pass the full Playwright and language detection test suites.
