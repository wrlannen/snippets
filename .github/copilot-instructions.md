# GitHub Copilot Instructions

## Project Overview
This is a minimal, modern snippet management app with a dark UI inspired by Sublime Text. It stores text snippets in browser localStorage with no backend database.

## Key Architectural Decisions
- **Client-side only**: All data stored in localStorage, no server-side storage
- **Node.js + Express**: Serves static files only (could be replaced with nginx)
- **Tailwind CSS**: All styling via CDN, no build step
- **First line as title**: The first line of each snippet is displayed bold in the editor and used as the title in the sidebar

## Code Style & Patterns
- Use modern JavaScript (ES6+) with `const`/`let`
- Prefer functional patterns where appropriate
- Use `??` for null coalescing, `?.` for optional chaining
- Escape all user content with `escapeHtml()` to prevent XSS
- Use `crypto.randomUUID()` for secure ID generation
- Add error handling for localStorage operations (quota exceeded)

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

All PRs/commits must pass Playwright tests covering:
- Snippet creation (CMD+.)
- Editing and autosave
- Deletion with confirmation/cancel
- Search (CMD+F) and filter
- Keyboard shortcuts (CMD+., CMD+F, Escape)
- Sidebar updates and first-line title
- localStorage persistence and reload
- Edge cases (delete all, create new, etc.)

**Note:** For pure static hosting, consider using nginx or Caddy for even lower resource usage than Node.js.

## UI/UX Guidelines
- **Minimal**: No unnecessary buttons or controls
- **Keyboard-first**: CMD+. (new), CMD+F (search), Escape (dismiss)
- **Sublime-like**: Dark theme with subtle hover states
- **First line bold**: The first line is always bold in the editor but remains fully editable
- **Autosave**: Debounced autosave after 800ms of inactivity
- **Subtle delete**: Hover to reveal ×, click once for confirmation, click again to delete

## Common Pitfalls
- **Don't add global event listeners in loops**: Clean up old listeners or use delegation
- **Don't block the UI**: Use debouncing for expensive operations like renderList()
- **Don't trust localStorage**: Always wrap in try/catch for quota errors
- **Test on every change**: Run `npm test` before committing

## File Structure
- `server.js` - Express server with security headers
- `public/index.html` - Main HTML structure
- `public/app.js` - All client-side logic
- `tests/snippets.spec.js` - Playwright E2E tests
- `playwright.config.js` - Test configuration

## When Adding Features
1. Write tests first (TDD preferred)
2. Implement the feature
3. Run `npm test` to verify
4. Check for XSS vulnerabilities
5. Update README if user-facing

## Performance Considerations
- Debounce renderList() during typing (150ms)
- Debounce autosave (800ms)
- Use event delegation for dynamic sidebar items
- Keep localStorage writes to minimum
