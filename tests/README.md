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

## Test Coverage

The test suite covers:
- Creating snippets with CMD+. shortcut
- Editing and autosaving snippets
- Deleting snippets with confirmation
- Search functionality (CMD+F)
- Keyboard shortcuts (Escape, CMD+., CMD+F)
- Sidebar rendering and updates
- First line as snippet title
- Character count display
- LocalStorage persistence

## CI/CD

Tests are configured to run in CI environments with automatic retries and headless mode.
