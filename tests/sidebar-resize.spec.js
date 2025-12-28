import { test, expect } from '@playwright/test';

test.describe('Sidebar Resize', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('sidebar has default width on initial load', async ({ page }) => {
        const sidebar = page.locator('aside');
        const box = await sidebar.boundingBox();

        // Default width is 192px (w-48 = 12rem = 192px)
        expect(box.width).toBe(192);
    });

    test('can drag sidebar edge to make sidebar wider', async ({ page }) => {
        const sidebar = page.locator('aside');

        // Get initial width
        const initialBox = await sidebar.boundingBox();
        const initialWidth = initialBox.width;

        // Get position near the right edge of sidebar (within 5px of edge)
        const edgeX = initialBox.x + initialBox.width - 5;
        const edgeY = initialBox.y + initialBox.height / 2;

        // Drag from near the edge 100px to the right
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.mouse.move(edgeX + 100, edgeY);
        await page.mouse.up();

        // Verify sidebar got wider
        const newBox = await sidebar.boundingBox();
        expect(newBox.width).toBeGreaterThan(initialWidth);
        expect(newBox.width).toBeCloseTo(initialWidth + 100, -1);
    });

    test('can drag sidebar edge to make sidebar narrower', async ({ page }) => {
        const sidebar = page.locator('aside');

        // Get initial width
        const initialBox = await sidebar.boundingBox();
        const initialWidth = initialBox.width;

        // Get position near the right edge of sidebar (within 5px of edge)
        const edgeX = initialBox.x + initialBox.width - 5;
        const edgeY = initialBox.y + initialBox.height / 2;

        // Drag from near the edge 50px to the left
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.mouse.move(edgeX - 50, edgeY);
        await page.mouse.up();

        // Verify sidebar got narrower
        const newBox = await sidebar.boundingBox();
        expect(newBox.width).toBeLessThan(initialWidth);
        expect(newBox.width).toBeCloseTo(initialWidth - 50, -1);
    });

    test('sidebar width respects minimum constraint', async ({ page }) => {
        const sidebar = page.locator('aside');

        // Get position near the right edge of sidebar
        const initialBox = await sidebar.boundingBox();
        const edgeX = initialBox.x + initialBox.width - 5;
        const edgeY = initialBox.y + initialBox.height / 2;

        // Try to drag edge way to the left (beyond minimum)
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.mouse.move(0, edgeY);
        await page.mouse.up();

        // Sidebar should be at minimum width (120px)
        const newBox = await sidebar.boundingBox();
        expect(newBox.width).toBe(120);
    });

    test('sidebar width respects maximum constraint', async ({ page }) => {
        const sidebar = page.locator('aside');

        // Get position near the right edge of sidebar
        const initialBox = await sidebar.boundingBox();
        const edgeX = initialBox.x + initialBox.width - 5;
        const edgeY = initialBox.y + initialBox.height / 2;
        
        // Try to drag edge way to the right (beyond maximum)
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.mouse.move(edgeX + 500, edgeY);
        await page.mouse.up();
        
        // Sidebar should be at maximum width (500px)
        const newBox = await sidebar.boundingBox();
        expect(newBox.width).toBe(500);
    });

    test('sidebar width persists after reload', async ({ page }) => {
        const sidebar = page.locator('aside');
        
        // Get position near the right edge of sidebar
        const initialBox = await sidebar.boundingBox();
        const edgeX = initialBox.x + initialBox.width - 5;
        const edgeY = initialBox.y + initialBox.height / 2;
        
        // Drag from near the edge 80px to the right
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.mouse.move(edgeX + 80, edgeY);
        await page.mouse.up();
        
        // Get the new width
        const newBox = await sidebar.boundingBox();
        const savedWidth = newBox.width;
        
        // Reload the page
        await page.reload();
        
        // Sidebar should still have the same width
        const afterReloadBox = await sidebar.boundingBox();
        expect(afterReloadBox.width).toBeCloseTo(savedWidth, 0);
    });

    test('sidebar width is stored in settings localStorage', async ({ page }) => {
        const sidebar = page.locator('aside');
        
        // Get position near the right edge of sidebar
        const initialBox = await sidebar.boundingBox();
        const edgeX = initialBox.x + initialBox.width - 5;
        const edgeY = initialBox.y + initialBox.height / 2;
        
        // Drag from near the edge 60px to the right
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.mouse.move(edgeX + 60, edgeY);
        await page.mouse.up();
        
        // Check localStorage
        const settings = await page.evaluate(() => {
            const raw = localStorage.getItem('snippets.settings.v1');
            return JSON.parse(raw);
        });
        
        expect(settings.sidebarWidth).toBeDefined();
        expect(settings.sidebarWidth).toBeCloseTo(192 + 60, -1);
    });

    test('resize shows visual feedback while dragging', async ({ page }) => {
        const sidebar = page.locator('aside');

        // Get position near the right edge of sidebar
        const sidebarBox = await sidebar.boundingBox();
        const edgeX = sidebarBox.x + sidebarBox.width - 5;
        const edgeY = sidebarBox.y + sidebarBox.height / 2;

        // Start dragging from near the edge
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();

        // Check for visual feedback class on body
        await expect(page.locator('body')).toHaveClass(/resizing-sidebar/);

        // Move mouse and release
        await page.mouse.move(edgeX + 50, edgeY);
        await page.mouse.up();

        // Visual feedback class should be removed
        await expect(page.locator('body')).not.toHaveClass(/resizing-sidebar/);
    });


    test('other settings are preserved when resizing sidebar', async ({ page }) => {
        // First, change font size to create a setting
        await page.locator('#increaseFont').click();

        const sidebar = page.locator('aside');

        // Get position near the right edge of sidebar
        const sidebarBox = await sidebar.boundingBox();
        const edgeX = sidebarBox.x + sidebarBox.width - 5;
        const edgeY = sidebarBox.y + sidebarBox.height / 2;

        // Resize sidebar
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.mouse.move(edgeX + 30, edgeY);
        await page.mouse.up();
        
        // Check that other settings are preserved
        const settings = await page.evaluate(() => {
            const raw = localStorage.getItem('snippets.settings.v1');
            return JSON.parse(raw);
        });
        
        expect(settings.fontSize).toBe(16); // increased from default 15
        expect(settings.sidebarWidth).toBeDefined();
    });
});
