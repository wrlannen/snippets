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

        // Change to Roboto Mono
        await page.locator('#fontFamily').selectOption("'Roboto Mono', monospace");

        // Verify immediate change
        const newFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(newFont).toContain('Roboto Mono');

        // Reload and verify persistence
        await page.reload();
        await expect(page.locator('#fontFamily')).toHaveValue("'Roboto Mono', monospace");
        const persistedFont = await page.locator('#content').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(persistedFont).toContain('Roboto Mono');
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

    test('line numbers are visible by default', async ({ page }) => {
        const lineNumbers = page.locator('#lineNumbers');
        
        // Line numbers should be visible by default
        await expect(lineNumbers).toBeVisible();
        
        // Type some text to create multiple lines
        await page.locator('#content').fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
        
        // Wait a bit for line numbers to update
        await page.waitForTimeout(100);
        
        // Should have 5 line number elements
        const lineNumberDivs = await lineNumbers.locator('div').count();
        expect(lineNumberDivs).toBe(5);
        
        // Check that line numbers display correct numbers
        const firstLineNumber = await lineNumbers.locator('div').first().textContent();
        expect(firstLineNumber).toBe('1');
        
        const lastLineNumber = await lineNumbers.locator('div').last().textContent();
        expect(lastLineNumber).toBe('5');
    });

    test('toggle button hides and shows line numbers', async ({ page }) => {
        const lineNumbers = page.locator('#lineNumbers');
        const toggleBtn = page.locator('#toggleLineNumbers');
        const editor = page.locator('#content');
        
        // Add some content first
        await editor.fill('First line\nSecond line\nThird line');
        await page.waitForTimeout(100);
        
        // Line numbers should be visible initially
        await expect(lineNumbers).toBeVisible();
        const initialLineCount = await lineNumbers.locator('div').count();
        expect(initialLineCount).toBe(3);
        
        // Click toggle button to hide line numbers
        await toggleBtn.click();
        
        // Line numbers should be hidden (display: none)
        await expect(lineNumbers).toHaveCSS('display', 'none');
        
        // Click toggle button again to show line numbers
        await toggleBtn.click();
        
        // Line numbers should be visible again
        await expect(lineNumbers).not.toHaveCSS('display', 'none');
        
        // Should still have the correct number of line numbers
        const finalLineCount = await lineNumbers.locator('div').count();
        expect(finalLineCount).toBe(3);
    });

    test('line numbers toggle state persists after reload', async ({ page }) => {
        const lineNumbers = page.locator('#lineNumbers');
        const toggleBtn = page.locator('#toggleLineNumbers');
        const editor = page.locator('#content');
        
        // Add content
        await editor.fill('Test line 1\nTest line 2');
        await page.waitForTimeout(100);
        
        // Verify line numbers are visible
        await expect(lineNumbers).toBeVisible();
        
        // Turn off line numbers
        await toggleBtn.click();
        await expect(lineNumbers).toHaveCSS('display', 'none');
        
        // Reload page
        await page.reload();
        
        // Line numbers should still be hidden after reload
        await expect(lineNumbers).toHaveCSS('display', 'none');
        
        // Turn line numbers back on
        await toggleBtn.click();
        await expect(lineNumbers).not.toHaveCSS('display', 'none');
        
        // Reload again
        await page.reload();
        
        // Line numbers should be visible after reload
        await expect(lineNumbers).toBeVisible();
    });

    test('line numbers update when typing', async ({ page }) => {
        const lineNumbers = page.locator('#lineNumbers');
        const editor = page.locator('#content');
        
        // Start with one line
        await editor.fill('Line 1');
        await page.waitForTimeout(100);
        
        let lineCount = await lineNumbers.locator('div').count();
        expect(lineCount).toBe(1);
        
        // Add more lines
        await editor.fill('Line 1\nLine 2');
        await page.waitForTimeout(100);
        
        lineCount = await lineNumbers.locator('div').count();
        expect(lineCount).toBe(2);
        
        // Add several more lines
        await editor.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7');
        await page.waitForTimeout(100);
        
        lineCount = await lineNumbers.locator('div').count();
        expect(lineCount).toBe(7);
    });

    test('line numbers highlight current line', async ({ page }) => {
        const lineNumbers = page.locator('#lineNumbers');
        const editor = page.locator('#content');
        
        // Add multiple lines
        await editor.fill('Line 1\nLine 2\nLine 3\nLine 4');
        
        // Click at the beginning of the editor to set cursor position
        await editor.click({ position: { x: 5, y: 5 } });
        await page.waitForTimeout(100);
        
        // Check that at least one line number div has the 'current-line' class
        const lineWithClass = await lineNumbers.locator('div.current-line').count();
        expect(lineWithClass).toBeGreaterThanOrEqual(1);
        
        // Press arrow down to move to next line
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
        
        // Should still have exactly one line with current-line class
        const afterMove = await lineNumbers.locator('div.current-line').count();
        expect(afterMove).toBe(1);
    });

    test('line numbers match editor font size', async ({ page }) => {
        const lineNumbers = page.locator('#lineNumbers');
        const editor = page.locator('#content');
        
        // Add some content
        await editor.fill('Test line');
        await page.waitForTimeout(100);
        
        // Get initial font sizes
        const initialEditorFontSize = await editor.evaluate((el) => getComputedStyle(el).fontSize);
        const initialLineNumbersFontSize = await lineNumbers.evaluate((el) => getComputedStyle(el).fontSize);
        
        // Font sizes should match
        expect(initialEditorFontSize).toBe(initialLineNumbersFontSize);
        
        // Increase font size
        await page.locator('#increaseFont').click();
        await page.waitForTimeout(50);
        
        // Check that both changed and still match
        const newEditorFontSize = await editor.evaluate((el) => getComputedStyle(el).fontSize);
        const newLineNumbersFontSize = await lineNumbers.evaluate((el) => getComputedStyle(el).fontSize);
        
        expect(newEditorFontSize).toBe(newLineNumbersFontSize);
        expect(newEditorFontSize).not.toBe(initialEditorFontSize);
    });

    test('toggle button changes appearance when line numbers are hidden', async ({ page }) => {
        const toggleBtn = page.locator('#toggleLineNumbers');
        
        // Initial state - button should be active (line numbers on) with text-gray-300
        const initialClasses = await toggleBtn.evaluate(el => Array.from(el.classList));
        expect(initialClasses).toContain('text-gray-300');
        // Note: hover:text-gray-300 is always present, we check the non-hover class
        
        // Click to hide line numbers
        await toggleBtn.click();
        await page.waitForTimeout(50);
        
        // Button appearance should change to text-gray-400 when line numbers are off
        const afterHideClasses = await toggleBtn.evaluate(el => Array.from(el.classList));
        expect(afterHideClasses).toContain('text-gray-400');
        // After hiding, text-gray-300 should not be in the list (only hover:text-gray-300 remains)
        const hasTextGray300 = afterHideClasses.includes('text-gray-300');
        expect(hasTextGray300).toBe(false);
        
        // Click to show line numbers again
        await toggleBtn.click();
        await page.waitForTimeout(50);
        
        // Should be back to text-gray-300 (active state)
        const afterShowClasses = await toggleBtn.evaluate(el => Array.from(el.classList));
        expect(afterShowClasses).toContain('text-gray-300');
        const hasTextGray400 = afterShowClasses.includes('text-gray-400');
        expect(hasTextGray400).toBe(false);
    });
});
