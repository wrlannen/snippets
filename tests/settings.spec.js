import { test, expect } from '@playwright/test';

test.describe('Settings & Fonts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('changes font family and persists settings', async ({ page }) => {
        // Default check
        await expect(page.locator('#fontFamily')).toHaveValue("'Source Code Pro', monospace");
        const initialFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(initialFont).toContain('Source Code Pro');

        // Change to JetBrains Mono
        await page.locator('#fontFamily').selectOption("'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace");

        // Verify immediate change
        const newFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(newFont).toContain('JetBrains Mono');

        // Reload and verify persistence
        await page.reload();
        await expect(page.locator('#fontFamily')).toHaveValue("'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace");
        const persistedFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(persistedFont).toContain('JetBrains Mono');
    });

    test('adjusts font size with A+/A- buttons', async ({ page }) => {
        const editor = page.locator('#content');

        // Get initial font size
        const initialSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));

        // Click Increase (A+)
        await page.locator('#increaseFont').click();
        const increasedSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
        expect(increasedSize).toBeGreaterThan(initialSize);

        // Click Decrease (A-) twice
        await page.locator('#decreaseFont').click();
        await page.locator('#decreaseFont').click();
        const decreasedSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
        expect(decreasedSize).toBeLessThan(increasedSize);

        // Reload and verify persistence
        await page.reload();
        const persistedSize = await editor.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
        expect(persistedSize).toBe(decreasedSize);
    });
});
