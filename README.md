
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


## Keyboard Shortcuts

| Shortcut                | Action             |
|-------------------------|--------------------|
| ⌘/Ctrl + K              | New snippet        |
| ⌘/Ctrl + F              | Search             |
| ⌘/Ctrl + B              | Toggle sidebar     |
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
- **Styling:** Tailwind CSS (CDN)
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