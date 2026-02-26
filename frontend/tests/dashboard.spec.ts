import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
    test('should display the main dashboard elements', async ({ page }) => {
        await page.goto('/');

        // Check for main title
        await expect(page.locator('h1')).toContainText('XHedge');

        // Check for subtitle
        await expect(page.locator('text=Volatility Shield for Weak Currencies')).toBeVisible();

        // Check for main navigation links
        await expect(page.locator('text=Deposit Funds')).toBeVisible();
        await expect(page.locator('text=Withdraw Funds')).toBeVisible();

        // Check for essential components
        await expect(page.locator('h2:has-text("Vault Overview")')).toBeVisible();
        await expect(page.locator('h2:has-text("AI Insight Stream")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to vault page', async ({ page }) => {
        await page.goto('/');
        await page.click('text=Deposit Funds');
        await page.waitForURL('**/vault');
        await expect(page.locator('h1')).toContainText('Vault');
    });
});
