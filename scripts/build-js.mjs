import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

const outdir = new URL('../public/dist/', import.meta.url);
await mkdir(outdir, { recursive: true });

// Bundle+minify the ESM app entrypoint
await build({
  entryPoints: ['public/js/app.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2019'],
  outfile: 'public/dist/app.js',
  minify: true,
  legalComments: 'none',
});

// Minify the early sidebar state script (keep as classic script)
await build({
  entryPoints: ['public/js/sidebar-state.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2019'],
  outfile: 'public/dist/sidebar-state.js',
  minify: true,
  legalComments: 'none',
});
