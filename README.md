# Snippets: Minimal, Fast, Local
![Screenshot of Snippets app](assets/screenshot.png)

A lightweight, privacy-focused snippet manager with a modern dark UI. All data stays in your browser via `localStorage` (no database, no accounts).

Installable as a Progressive Web App (PWA), so you can add it to your desktop/mobile home screen and keep using it offline.

## Features

- **Installable PWA**: Offline-capable and installable on desktop/mobile.
- **Local-first storage**: Snippets live in browser `localStorage`.
- **Fast editing**: Debounced autosave and a clean editor experience.
- **Quick navigation**: Sidebar list + instant search.
- **Quality-of-life tools**: Copy to clipboard, line numbers, and editor preferences (font family/size).
- **Keyboard-first**: <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> (new), <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>F</kbd> (search), <kbd>Esc</kbd> (dismiss).

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

## Docker

```bash
docker build -t snippets-app .
docker run -p 3000:3000 snippets-app
```

## Tech Stack

- **Backend**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (static serving + headers)
- **Frontend**: Vanilla JavaScript + HTML
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (CDN)
- **Storage**: Browser `localStorage`
- **Testing**: [Playwright](https://playwright.dev/)

## Testing

```bash
npm test
npm run test:ui
```

---
Created for speed and simplicity.
