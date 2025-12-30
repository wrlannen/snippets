/**
 * Language Detection & Mode Switching Tests
 * 
 * Tests for multi-language syntax highlighting support:
 * - Auto-detection from content patterns
 * - Manual mode switching via selector
 * - Mode persistence across page reloads
 */

import { test, expect } from '@playwright/test';
import { resetStorage, fillEditor, createSnippet } from './test-utils.js';

test.describe('Language Detection & Switching', () => {
  test.beforeEach(async ({ page }) => {
    await resetStorage(page);
  });

  test('detects JavaScript by default', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, 'const x = 42;');
    await page.waitForTimeout(1000); // Wait for autosave

    const selector = page.locator('#languageSelector');
    await expect(selector).toHaveValue('javascript');
  });

  test('detects HTML content automatically', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, '<!DOCTYPE html>\n<html><head></head><body></body></html>');
    await page.waitForTimeout(1000); // Wait for autosave

    // Wait for selector to update
    await page.waitForTimeout(200);
    
    const selector = page.locator('#languageSelector');
    await expect(selector).toHaveValue('htmlmixed');
  });

  test('detects CSS content automatically', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, '.container {\n  display: flex;\n  color: red;\n}');
    await page.waitForTimeout(1000); // Wait for autosave

    // Wait for selector to update
    await page.waitForTimeout(200);
    
    const selector = page.locator('#languageSelector');
    await expect(selector).toHaveValue('css');
  });

  test('detects XML content automatically', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, '<?xml version="1.0"?>\n<root><item>value</item></root>');
    await page.waitForTimeout(1000); // Wait for autosave

    // Wait for selector to update
    await page.waitForTimeout(200);
    
    const selector = page.locator('#languageSelector');
    await expect(selector).toHaveValue('xml');
  });

  test('manually switches language mode', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, 'some generic text');
    await page.waitForTimeout(1000);

    // Switch to CSS
    await page.locator('#languageSelector').selectOption('css');
    await expect(page.locator('#languageSelector')).toHaveValue('css');

    // Verify status message
    await expect(page.locator('#status')).toContainText('css');
  });

  test('persists language mode on reload', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, '<div>Test</div>');
    await page.waitForTimeout(1000);

    // Should auto-detect as htmlmixed
    await expect(page.locator('#languageSelector')).toHaveValue('htmlmixed');

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Click the snippet to load it
    const firstSnippet = page.locator('#list li').first();
    await firstSnippet.click();

    // Mode should still be htmlmixed
    await expect(page.locator('#languageSelector')).toHaveValue('htmlmixed');
  });

  test('updates mode when switching between snippets with different languages', async ({ page }) => {
    // Create first snippet with JavaScript
    await createSnippet(page, '// JS Test\nconst foo = "bar";');
    
    // Create second snippet with HTML
    await createSnippet(page, '<!-- HTML Test -->\n<html><body>Test</body></html>');
    
    // Verify both snippets exist
    await expect(page.locator('#list li')).toHaveCount(2);

    // Should be on HTML snippet (htmlmixed mode)
    await expect(page.locator('#languageSelector')).toHaveValue('htmlmixed');

    // Click the first (older) snippet - JavaScript
    const allSnippets = page.locator('#list li');
    await allSnippets.nth(1).click();
    await page.waitForTimeout(300);

    // Should switch to JavaScript mode
    await expect(page.locator('#languageSelector')).toHaveValue('javascript');

    // Click the second (newer) snippet - HTML
    await allSnippets.first().click();
    await page.waitForTimeout(300);

    // Should switch back to htmlmixed
    await expect(page.locator('#languageSelector')).toHaveValue('htmlmixed');
  });

  test('language selector is accessible and functional', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, 'test content');
    await page.waitForTimeout(1000);

    const selector = page.locator('#languageSelector');
    
    // Should be visible
    await expect(selector).toBeVisible();
    
    // Should have all mode options
    const options = await selector.locator('option').allTextContents();
    expect(options).toEqual([
      'JavaScript',
      'TypeScript',
      'Python',
      'SQL',
      'Shell',
      'Markdown',
      'YAML',
      'HTML',
      'CSS',
      'XML',
      'Plain Text'
    ]);
  });

  test('does not mis-detect prose containing "from" as SQL', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, `// Backup & sync\n\nSnippets are stored locally in your browser (localStorage).\n\nUse Export to download a JSON backup.\n\nUse Import to restore from a backup.`);
    await page.waitForTimeout(1100);

    // Should treat this as plain text
    await expect(page.locator('#languageSelector')).toHaveValue('null');
  });

  test('manual language selection disables auto-detection for that snippet', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await fillEditor(page, '<div>Hello</div>');
    await page.waitForTimeout(1000);

    // Auto-detect HTML
    await expect(page.locator('#languageSelector')).toHaveValue('htmlmixed');

    // Manually override to Python
    await page.locator('#languageSelector').selectOption('python');
    await expect(page.locator('#languageSelector')).toHaveValue('python');

    // Keep typing HTML; should remain Python due to manual lock
    await fillEditor(page, '<div>Hello</div>\n<div>Still HTML</div>');
    await page.waitForTimeout(1100);
    await expect(page.locator('#languageSelector')).toHaveValue('python');
  });

  test('exports and imports snippets with mode field', async ({ page }) => {
    // Create snippet with HTML content
    await page.keyboard.press('Meta+K');
    await fillEditor(page, '<!DOCTYPE html>\n<html></html>');
    await page.waitForTimeout(1000);

    // Export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#exportBtn')
    ]);

    const exportedData = await download.path();
    const fs = await import('fs');
    const content = fs.readFileSync(exportedData, 'utf-8');
    const data = JSON.parse(content);

    // Verify mode field exists
    expect(data.snippets[0].mode).toBe('htmlmixed');

    // Clear and import
    await resetStorage(page);

    const fileInput = page.locator('#importFileInput');
    await fileInput.setInputFiles(exportedData);
    await page.waitForTimeout(500);

    // Click imported snippet
    await page.locator('#list li').first().click();

    // Mode should be preserved
    await expect(page.locator('#languageSelector')).toHaveValue('htmlmixed');
  });
});
