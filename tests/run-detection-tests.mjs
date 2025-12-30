#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use the real detection logic from the app (browser/Node compatible)
import { detectLanguage } from '../public/js/detect-language.js';

// Map folder names to expected modes
const modeMap = {
  'javascript': 'javascript',
  'python': 'python',
  'sql': 'sql',
  'shell': 'shell',
  'markdown': 'markdown',
  'yaml': 'yaml',
  'html': 'htmlmixed',
  'css': 'css',
  'xml': 'xml',
  'plaintext': 'null', // null is string representation of null mode
};

// Test fixtures directory
const fixturesDir = path.join(__dirname, 'fixtures', 'language-detection');

let passed = 0;
let failed = 0;
const failures = [];

// Iterate through language directories
for (const [folderName, expectedMode] of Object.entries(modeMap)) {
  const langDir = path.join(fixturesDir, folderName);
  
  if (!fs.existsSync(langDir)) {
    console.log(`⚠️  Directory not found: ${folderName}`);
    continue;
  }

  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.txt'));

  for (const file of files) {
    const filePath = path.join(langDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const detected = detectLanguage(content);
    const detectedStr = detected === null ? 'null' : detected;
    
    if (detectedStr === expectedMode) {
      passed++;
      process.stdout.write('.');
    } else {
      failed++;
      process.stdout.write('F');
      failures.push({
        file: `${folderName}/${file}`,
        expected: expectedMode,
        detected: detectedStr,
        preview: content.substring(0, 100).replace(/\n/g, ' ')
      });
    }
  }
}

console.log('\n');

if (failures.length > 0) {
  console.log(`❌ ${failed} Failed:\n`);
  for (const failure of failures) {
    console.log(`  ${failure.file}`);
    console.log(`    Expected: ${failure.expected}, Got: ${failure.detected}`);
    console.log(`    Preview: ${failure.preview}...`);
  }
}

console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);
