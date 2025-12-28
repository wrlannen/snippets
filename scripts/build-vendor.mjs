import { readFile, writeFile, mkdir } from 'node:fs/promises';

const outDir = new URL('../public/dist/', import.meta.url);
await mkdir(outDir, { recursive: true });

// Keep this list in the same order as scripts were included in index.html
const vendorFiles = [
  'public/vendor/codemirror.min.js',
  'public/vendor/javascript.min.js',
  'public/vendor/xml.min.js',
  'public/vendor/css.min.js',
  'public/vendor/htmlmixed.min.js',
  'public/vendor/closebrackets.min.js',
  'public/vendor/matchbrackets.min.js',
];

const stripSourceMapComment = (text) => {
  // Remove common source map footer comments to avoid noisy 404s in prod.
  return text
    .replace(/\n\/\/[#@]\s*sourceMappingURL=.*?(\n|$)/g, '\n')
    .replace(/\n\/\*#\s*sourceMappingURL=.*?\*\/(\n|$)/g, '\n');
};

const parts = [];
for (const filePath of vendorFiles) {
  const content = await readFile(filePath, 'utf8');
  parts.push(`/* ${filePath} */\n` + stripSourceMapComment(content).trimEnd());
}

// Ensure boundaries between files are safe even if a file omits a trailing semicolon.
const bundled = parts.join('\n;\n') + '\n';
await writeFile('public/dist/vendor.js', bundled, 'utf8');
