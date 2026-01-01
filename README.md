# Snippets
A minimal, keyboard-focused scratchpad for code snippets and notes. Everything is stored locally in the browser - no accounts, no servers. It's fast, dark-themed, installable as a PWA and works offline.

Try it now at [https://snippets.dev](https://snippets.dev)

![Main editor interface](assets/screenshot_1_3012.png)

## Table of Contents

- [Features](#features)
- [Usage](#usage)
- [Tech Stack](#tech-stack)
- [Development Setup](#development-setup)
- [Testing & Language Detection](#testing--language-detection)
- [License & Acknowledgments](#license--acknowledgments)

## Features

- **Command palette & keyboard-first**: ⌘+K / Ctrl+K to run any action. Minimal interactions and clear shortcuts.
- **Syntax highlighting & language detection**: Automatic highlighting for JavaScript, Python, SQL, Shell, Markdown, YAML, HTML, CSS, XML, TypeScript, JSON, and Plain Text. Manual override available.
- **Offline-first & local storage**: Works as a PWA with IndexedDB storage (50MB+ capacity). All data stays in your browser - no accounts, no servers, no internet required.
- **Export/Import & autosave**: Edits are autosaved instantly. Backup or restore via the command palette.
- **Fast search**: Instantly filter and find snippets in the sidebar.

### Supported Languages
Language detection is automatic, with manual selection available via the dropdown:
- JavaScript, TypeScript, JSON
- Python
- SQL
- Shell
- Markdown
- YAML
- HTML, CSS, XML
- Plain Text

## Usage

### Creating Snippets
Typing in the editor autosaves changes. The first line is used as the sidebar title. Titles can be plain text or comment syntax, e.g:

```javascript
// React useEffect Hook
import { useEffect, useState } from 'react';
// ...
```

```python
# Python Data Processing
import pandas as pd
# ...
```

```sql
-- PostgreSQL Query
SELECT * FROM users WHERE active = true;
```

### Command Palette
Open with ⌘+K / Ctrl+K. Commands include:
- New snippet
- Open file from disk
- Search snippets
- Toggle sidebar
- Copy current snippet
- Delete current snippet
- Export all snippets
- Import snippets
- Increase font size
- Decrease font size

### Export & Import
- **Export:** Use the command palette (⌘+K / Ctrl+K) to export all snippets/settings as JSON (`snippets-YYYY-MM-DD.json`).
- **Import:** Use the command palette to import from a JSON file. Imports merge with existing snippets and restore settings.


## Tech Stack

- **Backend:** Node.js + Express (static only)
- **Frontend:** Vanilla JS, HTML, CodeMirror
- **Styling:** Tailwind CSS (built + minified via CLI)
- **Storage:** IndexedDB with in-memory cache
- **Testing:** Playwright with comprehensive test coverage (78 tests)


## Development Setup

This section covers how to run the app locally for development and testing.

1. **Install dependencies:**
   ```bash
   git clone https://github.com/wrlannen/snippets.git
   cd snippets
   npm install
   ```
2. **Run locally:**
   ```bash
   npm start
   # open http://localhost:3000
   ```

### Tailwind CSS
We use the Tailwind CLI to generate the stylesheet at `public/tailwind.output.css`.

- One-time build:
   ```bash
   npm run build:css
   ```
- Watch mode (keep running while developing):
   ```bash
   npm run dev:css
   ```

### JavaScript Bundling
Client-side code is bundled and minified using esbuild. Output files go to `public/dist/`:

- `public/dist/app.js` (bundled from `public/js/app.js`)
- `public/dist/sidebar-state.js` (minified early boot script)

To build everything (CSS + JS):
```bash
npm run build
```

Vendor scripts (CodeMirror and its addons) are concatenated into `public/dist/vendor.js` to keep network requests low.

### Docker
```bash
docker build -t snippets-app .
docker run -p 3000:3000 snippets-app
```


## Testing & Language Detection

Run all Playwright tests:
```bash
npm test
```
Or run interactively:
```bash
npm run test:ui
```

### Language Detection Tests
The app uses pattern-based language detection to automatically highlight code snippets. Detection is tested against 200+ real-world examples across all supported languages.

#### How It Works
- Detection logic in `public/js/detect-language.js`
- Tests use fixtures in `tests/fixtures/language-detection/`
- Each fixture file contains a code snippet named by expected language

#### Running Tests
```bash
npm run test:lang-fixtures
```

#### Adding New Fixtures
1. Create file in `tests/fixtures/language-detection/<language>/`
2. Add code snippet representing real-world usage
3. Run tests to verify detection

## License & Acknowledgments

This project is licensed under the O'Saasy License - see the [LICENSE](LICENSE) file for details.

Built with [CodeMirror](https://codemirror.net/) and the [Dracula theme](https://draculatheme.com/) (both MIT licensed).