import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
    test('should display the main dashboard elements', async ({ page }) => {
        await page.goto('/');

        // Brand heading and tagline
        await expect(page.locator('h1:has-text("XHedge")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Volatility Shield for Weak Currencies')).toBeVisible();

        // Quick-action cards
        await expect(page.locator('text=Deposit Funds')).toBeVisible();
        await expect(page.locator('text=Withdraw Funds')).toBeVisible();

        // Vault overview and AI stream sections
        await expect(page.locator('h2:has-text("Vault Overview")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('h2:has-text("AI Insight Stream")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to vault page when Deposit Funds is clicked', async ({ page }) => {
        await page.goto('/');
        await page.click('text=Deposit Funds');
        await page.waitForURL('**/vault');
        await expect(page.locator('h1:has-text("Vault")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to vault page when Withdraw Funds is clicked', async ({ page }) => {
        await page.goto('/');
        await page.click('text=Withdraw Funds');
        await page.waitForURL('**/vault');
        await expect(page.locator('h1:has-text("Vault")')).toBeVisible({ timeout: 10000 });
    });

    test('AI Insight Stream should show live badge', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('text=Live')).toBeVisible({ timeout: 10000 });
    });

    test('network switcher should be visible in sidebar', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('text=Network')).toBeVisible({ timeout: 10000 });
        // At least one network option should render
        await expect(page.locator('button:has-text("testnet"), button:has-text("mainnet")')).toBeVisible({
            timeout: 10000,
        });
    });

    test('currency switcher should be visible in sidebar', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('text=Currency')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("USD ($)")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("NGN")')).toBeVisible({ timeout: 10000 });
    });

    test('currency can be switched between USD and NGN', async ({ page }) => {
        await page.goto('/');
        const ngnBtn = page.locator('button:has-text("NGN")');
        await expect(ngnBtn).toBeVisible({ timeout: 10000 });
        await ngnBtn.click();
        // NGN button should now have active styling (bg-primary/10)
        await expect(ngnBtn).toHaveClass(/bg-primary/);
        // Switch back to USD
        const usdBtn = page.locator('button:has-text("USD ($)")');
        await usdBtn.click();
        await expect(usdBtn).toHaveClass(/bg-primary/);
    });
});
