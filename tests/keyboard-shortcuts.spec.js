import { test, expect } from '@playwright/test';
import { fillEditor } from './test-utils';

test.describe('Keyboard Shortcuts & Platform Detection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('⌘K creates a new snippet on Mac', async ({ page }) => {
        // Simulate Mac platform
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'MacIntel'
            });
        });
        await page.reload();

        // Press ⌘K
        await page.keyboard.press('Meta+k');

        // Should create a new snippet and focus editor
        await expect(page.locator('.CodeMirror')).toHaveClass(/CodeMirror-focused/);

        // Type some content
        await fillEditor(page, 'Test snippet from ⌘K');
        await page.waitForTimeout(1000);

        // Verify snippet was created
        await expect(page.locator('#list li')).toHaveCount(1);
    });

    test('Ctrl+K creates a new snippet on Windows', async ({ page }) => {
        // Simulate Windows platform
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32'
            });
        });
        await page.reload();

        // Press Ctrl+K
        await page.keyboard.press('Control+k');

        // Should create a new snippet and focus editor
        await expect(page.locator('.CodeMirror')).toHaveClass(/CodeMirror-focused/);

        // Type some content
        await fillEditor(page, 'Test snippet from Ctrl+K');
        await page.waitForTimeout(1000);

        // Verify snippet was created
        await expect(page.locator('#list li')).toHaveCount(1);
    });

    test('⌘F opens search on Mac', async ({ page }) => {
        // Create some snippets first
        await page.keyboard.press('Meta+k');
        await fillEditor(page, 'First snippet');
        await page.waitForTimeout(1000);

        await page.keyboard.press('Meta+k');
        await fillEditor(page, 'Second snippet');
        await page.waitForTimeout(1000);

        // Press ⌘F
        await page.keyboard.press('Meta+f');

        // Search should be visible and focused
        await expect(page.locator('#searchWrapper')).not.toHaveClass(/hidden/);
        await expect(page.locator('#search')).toBeFocused();
    });

    test('Escape clears search', async ({ page }) => {
        // Type in search
        const searchInput = page.locator('#search');
        await searchInput.fill('test query');
        await expect(searchInput).toHaveValue('test query');

        // Press Escape
        await page.keyboard.press('Escape');

        // Search should be cleared
        await expect(searchInput).toHaveValue('');
    });

    test('displays ⌘ symbol on Mac platform', async ({ page }) => {
        // Simulate Mac platform
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'MacIntel'
            });
        });
        await page.reload();

        // Check status bar
        await expect(page.locator('#modKey')).toHaveText('⌘');
        await expect(page.locator('#modKeySearch')).toHaveText('⌘');

        // Open About modal
        await page.locator('#aboutBtn').click();

        // Check modal
        await expect(page.locator('#modalModKey1')).toHaveText('⌘');
        await expect(page.locator('#modalModKey2')).toHaveText('⌘');
    });

    test('displays Ctrl on Windows platform', async ({ page }) => {
        // Simulate Windows platform
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32'
            });
        });
        await page.reload();

        // Check status bar
        await expect(page.locator('#modKey')).toHaveText('Ctrl');
        await expect(page.locator('#modKeySearch')).toHaveText('Ctrl');

        // Open About modal
        await page.locator('#aboutBtn').click();

        // Check modal
        await expect(page.locator('#modalModKey1')).toHaveText('Ctrl');
        await expect(page.locator('#modalModKey2')).toHaveText('Ctrl');
    });

    test('displays Ctrl on Linux platform', async ({ page }) => {
        // Simulate Linux platform
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Linux x86_64'
            });
        });
        await page.reload();

        // Check status bar
        await expect(page.locator('#modKey')).toHaveText('Ctrl');
        await expect(page.locator('#modKeySearch')).toHaveText('Ctrl');
    });

    test('About modal opens and closes correctly', async ({ page }) => {
        // Modal should be hidden initially
        await expect(page.locator('#aboutModal')).toHaveClass(/hidden/);

        // Click info button
        await page.locator('#aboutBtn').click();

        // Modal should be visible
        await expect(page.locator('#aboutModal')).not.toHaveClass(/hidden/);

        // Close button should work
        await page.locator('#closeAboutModal').click();

        // Modal should be hidden again
        await expect(page.locator('#aboutModal')).toHaveClass(/hidden/);
    });

    test('About modal closes when clicking outside', async ({ page }) => {
        // Open modal
        await page.locator('#aboutBtn').click();
        await expect(page.locator('#aboutModal')).not.toHaveClass(/hidden/);

        // Click on the backdrop (outside the modal content)
        await page.locator('#aboutModal').click({ position: { x: 10, y: 10 } });

        // Modal should be hidden
        await expect(page.locator('#aboutModal')).toHaveClass(/hidden/);
    });

    test('keyboard shortcuts are displayed in status bar', async ({ page }) => {
        // Check that shortcuts are visible
        await expect(page.locator('text=K New')).toBeVisible();
        await expect(page.locator('text=F Search')).toBeVisible();
    });

    test('About modal shows all keyboard shortcuts', async ({ page }) => {
        await page.locator('#aboutBtn').click();
        const modal = page.locator('#aboutModal');

        // Check shortcuts are documented
        await expect(modal.locator('text=New snippet')).toBeVisible();
        await expect(modal.locator('text=Search')).toBeVisible();
        await expect(modal.locator('text=Copy snippet')).toBeVisible();
    });

    test('About modal shows privacy information', async ({ page }) => {
        await page.locator('#aboutBtn').click();

        // Check privacy and backup section
        await expect(page.locator('text=offline-first tool')).toBeVisible();
        await expect(page.locator('text=localStorage')).toBeVisible();
    });
});
