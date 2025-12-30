# Snippets
A minimal, keyboard-focused scratchpad for code snippets and notes. Everything is stored locally in the browser - no accounts, no servers. It's fast, dark-themed, installable as a PWA and works offline.

Try it now at [https://snippets.dev](https://snippets.dev)

![Screenshot](assets/screenshot_3012.png)

## Features

- **Keyboard-first**: Fast, minimal, and designed for shortcuts
- **Syntax highlighting**: Supports JavaScript, Python, SQL, Shell, Markdown, YAML, HTML, CSS, XML, TypeScript, JSON, and Plain Text
- **Automatic language detection**: Highlights code as content is entered; manual override available
- **Offline-first**: Functions as a PWA, no internet required
- **Local storage**: Data is stored in the browser
- **Export/Import**: Backup and restore with one click
- **Autosave**: Edits are saved automatically
- **Fast search**: Instant filtering
- **Copy to clipboard**: Shortcut for copying code blocks

## Syntax Highlighting

Language detection is automatic, with manual selection available via the dropdown. Supported languages:
- JavaScript, TypeScript, JSON
- Python
- SQL
- Shell
- Markdown
- YAML
- HTML, CSS, XML
- Plain Text

## Creating Snippets

Typing in the editor autosaves changes. The first line is used as the sidebar title. Titles can be plain text or comment syntax:


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


Supported title formats:
- Plain text (e.g. `My Notes`)
- `// Title` (JavaScript, TypeScript, C++)
- `# Title` (Python, Ruby, Bash)
- `-- Title` (SQL)
- `/* Title */` (CSS, JavaScript)
- `<!-- Title -->` (HTML)


## Keyboard Shortcuts

| Shortcut                | Action             |
|-------------------------|--------------------|
| ⌘/Ctrl + B              | Toggle sidebar     |
| ⌘/Ctrl + K              | New snippet        |
| ⌘/Ctrl + F              | Search             |
| ⌘/Ctrl + Shift + C      | Copy snippet       |


## Export & Import

- **Export:** Click Export in the sidebar to download all snippets/settings as JSON (`snippets-YYYY-MM-DD.json`).
- **Import:** Click Import to restore from a JSON file. Imports merge with existing snippets and restore settings.


## Tech Stack

- **Backend:** Node.js + Express (static only)
- **Frontend:** Vanilla JS, HTML, CodeMirror
- **Styling:** Tailwind CSS (built + minified via CLI)
- **Storage:** Browser localStorage
- **Testing:** Playwright


## Getting Started

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


## Docker

```bash
docker build -t snippets-app .
docker run -p 3000:3000 snippets-app
```


## Testing

Run all Playwright tests:
```bash
npm test
```
Or run interactively:
```bash
npm run test:ui
```