
# Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

Test results and HTML reports are available in the `playwright-report/` directory after running tests.

## Test Coverage

The Playwright test suite covers:
- Creating snippets (new snippet button, CMD+K/Ctrl+K on Mac/Windows)
- Editing and autosave (debounced)
- Deleting snippets (confirmation, cancel flow, delete all)
- Search and filter (CMD+F/Ctrl+F, sidebar filter)
- Keyboard shortcuts:
	- New snippet: CMD+K (Mac), Ctrl+K (Windows)
	- Search: CMD+F (Mac), Ctrl+F (Windows)
	- Toggle sidebar: CMD+B (Mac), Ctrl+B (Windows)
	- Copy to clipboard: CMD+Shift+C (Mac), Ctrl+Shift+C (Windows)
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

## CI/CD

Tests are configured to run in CI environments with automatic retries and headless mode. All PRs and commits must pass the full test suite.
