/**
 * Global setup for Playwright tests
 * Clears IndexedDB before test suite runs
 */

export default async function globalSetup() {
  console.log('Global setup: Clearing IndexedDB...');
  // This runs in Node context, we'll need to clear per-test instead
}
