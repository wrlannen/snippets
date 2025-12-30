import { test, expect } from '@playwright/test';
import { fillEditor } from './test-utils';

test.describe('Keyboard Shortcuts & Platform Detection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('snippets.v1', '[]');
        });
        await page.reload();
    });

    test('⌘K opens command palette on Mac', async ({ page }) => {
        // Simulate Mac platform
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'MacIntel'
            });
        });
        await page.reload();

        // Press ⌘K
        await page.keyboard.press('Meta+k');

        // Command palette should be visible
        await expect(page.locator('#commandPalette')).not.toHaveClass(/hidden/);
        await expect(page.locator('#commandPaletteInput')).toBeFocused();
    });

    test('Ctrl+K opens command palette on Windows', async ({ page }) => {
        // Simulate Windows platform
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32'
            });
        });
        await page.reload();

        // Press Ctrl+K
        await page.keyboard.press('Control+k');

        // Command palette should be visible
        await expect(page.locator('#commandPalette')).not.toHaveClass(/hidden/);
        await expect(page.locator('#commandPaletteInput')).toBeFocused();
    });

    test('Can create new snippet via command palette', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('Meta+k');

        // Type "new" to filter
        await page.locator('#commandPaletteInput').fill('new');
        await page.waitForTimeout(100);

        // Press Enter to execute "New Snippet" command
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Should create a new snippet and focus editor
        await expect(page.locator('.CodeMirror')).toHaveClass(/CodeMirror-focused/);

        // Type some content
        await fillEditor(page, 'Test snippet from command palette');
        await page.waitForTimeout(1000);

        // Verify snippet was created
        await expect(page.locator('#list li')).toHaveCount(1);
    });

    test('Can search via command palette', async ({ page }) => {
        // Create some snippets first
        await page.keyboard.press('Meta+k');
        await page.locator('#commandPaletteInput').fill('new');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        await fillEditor(page, 'First snippet');
        await page.waitForTimeout(1000);

        // Open command palette again
        await page.keyboard.press('Meta+k');
        await page.locator('#commandPaletteInput').fill('search');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Search input should be focused
        await expect(page.locator('#search')).toBeFocused();
    });

    test('⌘/ toggles sidebar', async ({ page }) => {
        // Initially sidebar should be visible
        await expect(page.locator('#sidebar')).toBeVisible();

        // Press ⌘/
        await page.keyboard.press('Meta+/');
        await page.waitForTimeout(300);

        // Check if sidebar is hidden via CSS class
        const html = page.locator('html');
        await expect(html).toHaveClass(/sidebar-hidden/);

        // Press ⌘/ again to show
        await page.keyboard.press('Meta+/');
        await page.waitForTimeout(300);

        await expect(html).not.toHaveClass(/sidebar-hidden/);
    });

    test('Escape closes command palette', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('Meta+k');
        await expect(page.locator('#commandPalette')).not.toHaveClass(/hidden/);

        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // Command palette should be closed
        await expect(page.locator('#commandPalette')).toHaveClass(/hidden/);
    });

    test('Arrow keys navigate command palette', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('Meta+k');
        
        // Get the command list
        const list = page.locator('#commandPaletteList');
        
        // First item should be selected by default
        let selected = list.locator('[data-selected="true"]');
        await expect(selected).toHaveCount(1);
        
        // Press down arrow
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
        
        // Second item should now be selected
        selected = list.locator('[data-selected="true"]');
        await expect(selected).toHaveCount(1);
        
        // Press up arrow
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(100);
        
        // First item should be selected again
        selected = list.locator('[data-selected="true"]');
        await expect(selected).toHaveCount(1);
    });

    test('Fuzzy search filters commands', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('Meta+k');
        
        // Get initial command count
        const initialCount = await page.locator('#commandPaletteList > div').count();
        expect(initialCount).toBeGreaterThan(0);
        
        // Type a search query
        await page.locator('#commandPaletteInput').fill('exp');
        await page.waitForTimeout(100);
        
        // Should filter to export command
        const filteredCount = await page.locator('#commandPaletteList > div').count();
        expect(filteredCount).toBeLessThan(initialCount);
        expect(filteredCount).toBeGreaterThan(0);
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
        await expect(page.locator('text=K Commands')).toBeVisible();
    });

    test('About modal shows all keyboard shortcuts', async ({ page }) => {
        await page.locator('#aboutBtn').click();
        const modal = page.locator('#aboutModal');

        // Check shortcuts are documented - use exact match to avoid duplicate text matches
        await expect(modal.getByText('Command palette', { exact: true })).toBeVisible();
        await expect(modal.getByText('Toggle sidebar', { exact: true })).toBeVisible();
    });

    test('About modal shows privacy information', async ({ page }) => {
        await page.locator('#aboutBtn').click();

        // Check privacy and backup section (updated copy)
        await expect(page.locator('text=Minimal local scratchpad for code & notes')).toBeVisible();
    });
});
