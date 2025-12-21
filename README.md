
# Snippets (localStorage)

A lightweight Node.js app with a modern, minimal UI for storing text snippets in your browser’s `localStorage`.

## Features

- Create, edit, delete snippets
- Minimal sidebar UI (no search)
- Keyboard shortcut: <kbd>⌘</kbd><kbd>.</kbd> (Mac) to create a new snippet
- Inline delete popover (click ×, then Delete)
- Copy snippet text
- Autosaves as you type
- All data is stored locally in your browser (no server DB)

## Run

```bash
npm install
npm start
```

Then open:

- http://127.0.0.1:3000

## Docker

Build:

```bash
docker build -t snippets-localstore .
```

Run:

```bash
docker run --rm -p 3000:3000 snippets-localstore
```

Open:

- http://localhost:3000

## Notes

- Data is stored only in the browser (`localStorage` key: `snippets.v1`).
- The Node server is just for serving static files.
