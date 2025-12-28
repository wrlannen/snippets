# Snippets: Minimal, Fast, Local
![Screenshot of Snippets app](assets/demo_screenshot_new.png)

A lightweight, privacy-focused snippet manager with a modern dark UI. All data stays in your browser via `localStorage` (no database, no accounts).

Installable as a Progressive Web App (PWA), so you can add it to your desktop and keep using it offline.

## Features

- **Installable PWA**: Offline-capable and installable on desktop/mobile.
- **Local-first storage**: Snippets live in browser `localStorage`.
- **Comment-based titles**: Use `//`, `#`, `--`, `/* */`, or `<!-- -->` for snippet titles.
- **Export/Import**: Backup and restore your snippets and settings.
- **Autosave**: Edit without worry—changes save automatically.
- **Quick navigation**: Sidebar list with instant search.
- **Customizable editor**: Adjust font family, size, and color.
- **Keyboard shortcuts**: <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> (new), <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>F</kbd> (search), <kbd>Esc</kbd> (dismiss).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)

### Install & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/snippets.git
   cd snippets
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000

## Usage

### Export & Import

**Export**: Click the Export button in the sidebar to download all your snippets and settings as a JSON file (named `snippets-YYYY-MM-DD.json`). This is useful for:
- Creating backups
- Moving snippets between browsers or devices
- Sharing snippet collections with others

**Import**: Click the Import button to restore snippets and settings from a previously exported JSON file. The import:
- Merges with existing snippets (skips duplicates by ID)
- Restores your editor preferences (font size, font family, font color)
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

Snippet titles are extracted from the first line using comment syntax patterns:

```javascript
const TITLE_PATTERNS = [
  /^\/\/\s*(.+)$/m,      // // Title
  /^#\s*(.+)$/m,         // # Title  
  /^--\s*(.+)$/m,        // -- Title
  /^\/\*+\s*(.+?)\s*\*+\/$/m,  // /* Title */
  /^<!--\s*(.+?)\s*-->$/m     // <!-- Title -->
];
```

This approach:
- Prevents syntax highlighting from affecting titles
- Works across multiple programming languages
- Maintains clean visual separation between titles and code
- Falls back to "Untitled Snippet" if no comment is found

## Testing

```bash
npm test
npm run test:ui
```

---
Created for speed and simplicity.
