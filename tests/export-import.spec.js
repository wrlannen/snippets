import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Export/Import Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('export button is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#exportBtn')).toBeVisible();
    await expect(page.locator('#exportBtn')).toContainText('Export');
  });

  test('import button is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#importBtn')).toBeVisible();
    await expect(page.locator('#importBtn')).toContainText('Import');
  });

  test('exports snippets and settings to JSON', async ({ page }) => {
    await page.goto('/');

    // Create some snippets
    await page.keyboard.press('Meta+k');
    await page.locator('#content').fill('First Snippet\nFirst content');
    await page.waitForTimeout(1000);

    await page.keyboard.press('Meta+k');
    await page.locator('#content').fill('Second Snippet\nSecond content');
    await page.waitForTimeout(1000);

    // Change font size to test settings export
    await page.locator('#increaseFont').click();
    await page.waitForTimeout(500);

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.locator('#exportBtn').click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/snippets-\d{4}-\d{2}-\d{2}\.json/);

    // Read the downloaded file
    const downloadPath = await download.path();
    const fileContent = fs.readFileSync(downloadPath, 'utf8');
    const exportData = JSON.parse(fileContent);

    // Validate export structure
    expect(exportData).toHaveProperty('version');
    expect(exportData).toHaveProperty('exportedAt');
    expect(exportData).toHaveProperty('snippets');
    expect(exportData).toHaveProperty('settings');

    // Check snippets
    expect(exportData.snippets).toHaveLength(2);
    expect(exportData.snippets[0].content).toContain('Second Snippet');
    expect(exportData.snippets[1].content).toContain('First Snippet');

    // Check settings
    expect(exportData.settings).toHaveProperty('fontSize');
    expect(exportData.settings).toHaveProperty('fontFamily');
    expect(exportData.settings).toHaveProperty('lineNumbers');

    // Verify status message
    await expect(page.locator('#status')).toContainText('Exported 2 snippets and settings');
  });

  test('imports snippets from JSON (new format with settings)', async ({ page }) => {
    await page.goto('/');

    // Create test import data with settings
    const importData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: [
        {
          id: 'test-id-1',
          content: 'Imported Title\nImported content',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test-id-2',
          content: 'Another Snippet\nMore content',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      settings: {
        fontSize: 18,
        fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
        lineNumbers: false
      }
    };

    // Create temporary file
    const tempDir = path.join(process.cwd(), 'test-results', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'import-test.json');
    fs.writeFileSync(tempFile, JSON.stringify(importData));

    // Set file input
    const fileInput = page.locator('#importFileInput');
    await fileInput.setInputFiles(tempFile);

    // Wait for import to complete
    await page.waitForTimeout(1000);

    // Verify snippets were imported
    await expect(page.locator('#list li')).toHaveCount(2);
    await expect(page.locator('#list')).toContainText('Imported Title');
    await expect(page.locator('#list')).toContainText('Another Snippet');

    // Verify status message
    await expect(page.locator('#status')).toContainText('Imported 2 snippets');
    await expect(page.locator('#status')).toContainText('settings');

    // Verify settings were applied
    const textarea = page.locator('#content');
    const fontSize = await textarea.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(fontSize).toBe('18px');

    // Clean up
    fs.unlinkSync(tempFile);
  });

  test('imports snippets from JSON (old array format)', async ({ page }) => {
    await page.goto('/');

    // Create test import data (old array format)
    const importData = [
      {
        id: 'old-format-1',
        content: 'Old Format\nThis is the old array format',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Create temporary file
    const tempDir = path.join(process.cwd(), 'test-results', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'import-old-format.json');
    fs.writeFileSync(tempFile, JSON.stringify(importData));

    // Set file input
    const fileInput = page.locator('#importFileInput');
    await fileInput.setInputFiles(tempFile);

    // Wait for import to complete
    await page.waitForTimeout(1000);

    // Verify snippet was imported
    await expect(page.locator('#list li')).toHaveCount(1);
    await expect(page.locator('#list')).toContainText('Old Format');

    // Verify status message
    await expect(page.locator('#status')).toContainText('Imported 1 snippet');

    // Clean up
    fs.unlinkSync(tempFile);
  });

  test('skips duplicate snippets on import', async ({ page }) => {
    await page.goto('/');

    // Create existing snippet
    await page.keyboard.press('Meta+k');
    await page.locator('#content').fill('Existing\nExisting content');
    await page.waitForTimeout(1000);

    // Get the ID of the existing snippet
    const snippetId = await page.evaluate(() => {
      const snippets = JSON.parse(localStorage.getItem('snippets.v1'));
      return snippets[0].id;
    });

    // Create import data with same ID
    const importData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: [
        {
          id: snippetId, // Duplicate ID
          content: 'Duplicate\nThis should be skipped',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'new-id',
          content: 'New Snippet\nThis should be imported',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      settings: {
        fontSize: 15,
        fontFamily: "'Source Code Pro', monospace",
        lineNumbers: true
      }
    };

    // Create temporary file
    const tempDir = path.join(process.cwd(), 'test-results', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'import-duplicate.json');
    fs.writeFileSync(tempFile, JSON.stringify(importData));

    // Set file input
    const fileInput = page.locator('#importFileInput');
    await fileInput.setInputFiles(tempFile);

    // Wait for import to complete
    await page.waitForTimeout(1000);

    // Verify only new snippet was imported
    await expect(page.locator('#list li')).toHaveCount(2);
    await expect(page.locator('#status')).toContainText('Imported 1 snippet');
    await expect(page.locator('#status')).toContainText('1 duplicate skipped');

    // Clean up
    fs.unlinkSync(tempFile);
  });

  test('handles invalid JSON on import', async ({ page }) => {
    await page.goto('/');

    // Create temporary file with invalid JSON
    const tempDir = path.join(process.cwd(), 'test-results', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'invalid.json');
    fs.writeFileSync(tempFile, 'not valid json {]');

    // Set file input
    const fileInput = page.locator('#importFileInput');
    await fileInput.setInputFiles(tempFile);

    // Wait for error
    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('#status')).toContainText('Error: Failed to parse JSON file');

    // Clean up
    fs.unlinkSync(tempFile);
  });

  test('handles invalid snippet format on import', async ({ page }) => {
    await page.goto('/');

    // Create test import data with missing required fields
    const importData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: [
        {
          id: 'test-1',
          // Missing 'content' field
          createdAt: new Date().toISOString()
        }
      ],
      settings: {}
    };

    // Create temporary file
    const tempDir = path.join(process.cwd(), 'test-results', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'invalid-format.json');
    fs.writeFileSync(tempFile, JSON.stringify(importData));

    // Set file input
    const fileInput = page.locator('#importFileInput');
    await fileInput.setInputFiles(tempFile);

    // Wait for error
    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('#status')).toContainText('Error: Invalid snippet format');

    // Clean up
    fs.unlinkSync(tempFile);
  });

  test('import button triggers file picker', async ({ page }) => {
    await page.goto('/');

    // Click import button should not throw error
    await page.locator('#importBtn').click();
    
    // File input should be present (even if hidden)
    await expect(page.locator('#importFileInput')).toBeAttached();
  });

  test('export and import roundtrip preserves data', async ({ page }) => {
    await page.goto('/');

    // Create snippets and change settings
    await page.keyboard.press('Meta+k');
    await page.locator('#content').fill('Test 1\nContent 1');
    await page.waitForTimeout(1000);

    await page.keyboard.press('Meta+k');
    await page.locator('#content').fill('Test 2\nContent 2');
    await page.waitForTimeout(1000);

    // Change font settings
    await page.locator('#increaseFont').click();
    await page.locator('#fontFamily').selectOption("'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace");
    await page.waitForTimeout(500);

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    // Clear everything
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#empty')).toBeVisible();

    // Import the exported file
    const fileInput = page.locator('#importFileInput');
    await fileInput.setInputFiles(downloadPath);
    await page.waitForTimeout(1000);

    // Verify everything is restored
    await expect(page.locator('#list li')).toHaveCount(2);
    await expect(page.locator('#list')).toContainText('Test 1');
    await expect(page.locator('#list')).toContainText('Test 2');

    // Verify settings preserved
    const selectedFont = await page.locator('#fontFamily').inputValue();
    expect(selectedFont).toBe("'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace");
  });
});
