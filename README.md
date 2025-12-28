
# Snippets
![Screenshot](assets/demo_screenshot_3.png)

Minimal, privacy-first snippet manager. All data stays in your browser (`localStorage`). No accounts, no servers. Fast, dark, and installable as a PWA.


## Features

- **Offline-first**: PWA, installable, works offline
- **Local storage**: No backend, all data in your browser
- **Comment-based titles**: First line comment is the sidebar title
- **Export/Import**: Backup and restore as JSON
- **Autosave**: Edits save instantly
- **Fast search**: Instant filter and navigation
- **Adjustable editor**: Font size, syntax highlighting
- **Copy to clipboard**: One shortcut, always ready


## Getting Started

1. **Install dependencies:**
   ```bash
   git clone https://github.com/your-username/snippets.git
   cd snippets
   npm install
   ```
2. **Run locally:**
   ```bash
   npm start
   # open http://localhost:3000
   ```

### Tailwind CSS (Production)

This app uses Tailwind via the CLI (not the CDN). The stylesheet is generated into `public/tailwind.output.css`.

- One-time build:
   ```bash
   npm run build:css
   ```
- Watch mode (run in a second terminal while developing UI):
   ```bash
   npm run dev:css
   ```

### JavaScript (Production)

The app’s first-party JS is bundled + minified with esbuild into `public/dist/`:

- `public/dist/app.js` (bundled from `public/app.js`)
- `public/dist/sidebar-state.js` (minified early boot script)

Build everything (CSS + JS):
```bash
npm run build
```


## Keyboard Shortcuts

| Shortcut                | Action             |
|-------------------------|--------------------|
| ⌘/Ctrl + B              | Toggle sidebar     |
| ⌘/Ctrl + K              | New snippet        |
| ⌘/Ctrl + F              | Search             |
| ⌘/Ctrl + Shift + C      | Copy snippet       |
| Escape                  | Dismiss search/modals |


## Export & Import

- **Export:** Click Export in the sidebar to download all snippets/settings as JSON (`snippets-YYYY-MM-DD.json`).
- **Import:** Click Import to restore from a JSON file. Imports merge with existing snippets and restore settings.


## Creating Snippets

Just start typing—changes autosave. Use a comment on the first line for the sidebar title:


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
- `// Title` (JavaScript, TypeScript, C++)
- `# Title` (Python, Ruby, Bash)
- `-- Title` (SQL)
- `/* Title */` (CSS, JavaScript)
- `<!-- Title -->` (HTML)


## Docker

```bash
docker build -t snippets-app .
docker run -p 3000:3000 snippets-app
```
*Uses Google's distroless Node image for minimal size and security.*


## Tech Stack

- **Backend:** Node.js + Express (static only)
- **Frontend:** Vanilla JS, HTML, CodeMirror
- **Styling:** Tailwind CSS (built + minified via CLI)
- **Storage:** Browser localStorage
- **Testing:** Playwright


## Testing

Run all Playwright tests:
```bash
npm test
```
Or run interactively:
```bash
npm run test:ui
```