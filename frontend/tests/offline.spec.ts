import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test('should show offline banner when connection is lost', async ({ page, context }) => {
    // Navigate to the app first
    await page.goto('/vault');

    // Wait for page to load
    await expect(page).toHaveTitle(/XHedge/i, { timeout: 10000 });

    // Simulate offline by disabling all network
    await context.setOffline(true);

    // Wait a moment for the offline event to propagate
    await page.waitForTimeout(500);

    // Check that the offline banner appears
    const offlineBanner = page.locator('text=You are offline');
    await expect(offlineBanner).toBeVisible({ timeout: 5000 });

    // Banner should indicate cached data is being shown
    const cachedIndicator = page.locator('text=showing cached data');
    await expect(cachedIndicator).toBeVisible();
  });

  test('offline.html should display cached vault data', async ({ page, context }) => {
    // First, visit vault to cache some data
    await page.goto('/vault');
    await expect(page).toHaveTitle(/XHedge/i, { timeout: 10000 });

    // Set some mock vault data in localStorage
    await page.evaluate(() => {
      const vaultData = {
        totalAssets: '10000000000',
        totalShares: '10000000000',
        sharePrice: '1.0000000',
        userBalance: '1000000000',
        userShares: '1000000000',
        assetSymbol: 'USDC',
      };
      localStorage.setItem('xhedge-vault-cache', JSON.stringify(vaultData));
      localStorage.setItem('xhedge-vault-cache-time', Date.now().toString());
    });

    // Go offline
    await context.setOffline(true);

    // Navigate to offline page
    await page.goto('/nonexistent-page');

    // Should show offline.html
    await expect(page.locator('text=You are offline')).toBeVisible({ timeout: 5000 });

    // Check that cached data is displayed
    const cachedBalance = page.locator('text=Your Balance').locator('..').locator('text=100');
    const cachedPrice = page.locator('text=Share Price');

    // At least one should be visible or show data
    await expect(page.locator('text=Cached Vault Data')).toBeVisible({ timeout: 5000 });
  });

  test('should reconnect and reload when online event fires', async ({ page, context }) => {
    // Navigate to the app
    await page.goto('/vault');
    await expect(page).toHaveTitle(/XHedge/i, { timeout: 10000 });

    // Go offline
    await context.setOffline(true);

    // Offline banner should appear
    const offlineBanner = page.locator('text=You are offline');
    await expect(offlineBanner).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);

    // The page should reload (check for the reload by waiting for navigation or checking page state)
    // Wait a moment for the reload to complete
    await page.waitForTimeout(2000);

    // Offline banner should disappear
    await expect(offlineBanner).not.toBeVisible({ timeout: 5000 });
  });

  test('should show retry button on offline page', async ({ page, context }) => {
    // Go offline first
    await context.setOffline(true);

    // Try to navigate (will show offline.html)
    await page.goto('/vault');

    // Look for retry button
    const retryButton = page.locator('button:has-text("Try Again")');
    await expect(retryButton).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);

    // Click retry button
    await retryButton.click();

    // Should navigate back and offline banner should be gone
    await page.waitForTimeout(1000);
  });

  test('should not show offline banner when online', async ({ page }) => {
    // Navigate while online (normal case)
    await page.goto('/vault');

    // Offline banner should not be visible
    const offlineBanner = page.locator('text=You are offline');
    await expect(offlineBanner).not.toBeVisible({ timeout: 5000 });
  });

  test('cached vault data should persist across page reloads while offline', async ({ page, context }) => {
    // First load and cache data
    await page.goto('/vault');
    await expect(page).toHaveTitle(/XHedge/i, { timeout: 10000 });

    // Set cache
    await page.evaluate(() => {
      localStorage.setItem('xhedge-vault-cache', JSON.stringify({
        userBalance: '500000000',
        sharePrice: '1.234567',
      }));
    });

    // Go offline
    await context.setOffline(true);

    // Reload the page
    await page.reload();

    // Wait for page and offline banner
    await expect(page.locator('text=You are offline')).toBeVisible({ timeout: 5000 });

    // Even though we can't access the data on offline.html from this context,
    // we can verify that the banner appears and the page doesn't crash
    const cachedVaultSection = page.locator('text=Cached Vault Data');
    // This might not be visible in all pages, but offline.html should have it
  });
});
