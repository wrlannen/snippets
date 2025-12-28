# Snippets: Minimal, Fast, Local
![Snippets app screenshot](assets/demo_screenshot_3.png)

A lightweight, privacy-first snippet manager with a modern dark UI. Everything is stored locally in your browser using `localStorage` — no accounts or remote servers required.

Installable as a Progressive Web App (PWA) for offline use and quick desktop install.

## Features

- **PWA installable**: Add to your desktop and keep using offline.
- **Local-first storage**: All snippets are saved in `localStorage` (no backend).
- **Comment-based titles**: First-line comment becomes the snippet title (`//`, `#`, `--`, `/* */`, `<!-- -->`).
- **Export / Import**: Export your snippets/settings as JSON and re-import later.
- **Autosave & live preview**: Edits save automatically and the sidebar updates instantly.
- **Quick navigation**: Instant search and keyboard-first workflow.
- **Adjustable editor**: Change font size; syntax highlighting via CodeMirror.
- **Copy to clipboard**: Quickly copy the active snippet with `⌘/Ctrl+Shift+C`.
- **Keyboard shortcuts**: `⌘/Ctrl+K` (new snippet), `⌘/Ctrl+F` (search), `⌘/Ctrl+Shift+C` (copy).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)

### Quick Start

1. Clone and install:
   ```bash
   git clone https://github.com/your-username/snippets.git
   cd snippets
   npm install
   ```

2. Run locally:
   ```bash
   npm start
   # open http://localhost:3000
   ```

## Usage

### Export & Import

**Export**: Click the Export button in the sidebar to download all your snippets and settings as a JSON file (named `snippets-YYYY-MM-DD.json`). This is useful for:
- Creating backups
- Moving snippets between browsers or devices
- Sharing snippet collections with others

**Import**: Click the Import button to restore snippets and settings from a previously exported JSON file. The import:
- Merges with existing snippets (skips duplicates by ID)
- Restores your editor preferences (font size)
- Supports both the current format and older array-only format for backward compatibility

## Creating Snippets

Start typing in the editor—changes auto-save automatically. Use comment syntax on the first line to create titled snippets:

```javascript
// React useEffect Hook
import { useEffect, useState } from 'react';

function MyComponent() {
  const [data, setData] = useState(null);
  // ... rest of code
}
```

```python
# Python Data Processing
import pandas as pd
import numpy as np
# ... rest of code
```

```sql
-- PostgreSQL Query
SELECT * FROM users WHERE active = true;
```

Supported title formats:
- `// Title` (JavaScript, TypeScript, C++, etc.)
- `# Title` (Python, Ruby, Bash, etc.)
- `-- Title` (SQL)
- `/* Title */` (CSS, JavaScript)
- `<!-- Title -->` (HTML)

## Docker

```bash
docker build -t snippets-app .
docker run -p 3000:3000 snippets-app
```

Uses Google's distroless Node image for minimal size (~80-90MB) and improved security.

## Tech Stack

- **Backend**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (static serving + headers)
- **Frontend**: Vanilla JavaScript + HTML + [CodeMirror](https://codemirror.net/) (code editor)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (CDN)
- **Storage**: Browser `localStorage`
- **Testing**: [Playwright](https://playwright.dev/)

## Comment-Based Titles

Snippet titles are taken from the first line when it matches common comment patterns (e.g. `// Title`, `# Title`, `-- Title`). This keeps titles readable and language-agnostic. If no title is detected the app uses "Untitled Snippet".

## Testing

Run the Playwright tests:

```bash
npm test
npm run test:ui
```

---
Screenshot: `assets/demo_screenshot_3.png` (updated)

Created for speed and simplicity.
