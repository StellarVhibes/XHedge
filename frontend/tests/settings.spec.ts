import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/settings');
    });

    test('should display the Settings page heading', async ({ page }) => {
        await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    });

    test('should display Display Preferences section', async ({ page }) => {
        await expect(page.locator('text=Display Preferences')).toBeVisible({ timeout: 10000 });
    });

    test('should display Notification Preferences section', async ({ page }) => {
        await expect(page.locator('text=Notification Preferences')).toBeVisible({ timeout: 10000 });
    });

    test('should show theme selection buttons', async ({ page }) => {
        await expect(page.locator('button:has-text("Light")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("Dark")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("System")')).toBeVisible({ timeout: 10000 });
    });

    test('should show currency format buttons', async ({ page }) => {
        await expect(page.locator('button:has-text("US Dollar")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("Nigerian Naira")')).toBeVisible({ timeout: 10000 });
    });

    test('should show notification toggle labels', async ({ page }) => {
        await expect(page.locator('text=Vault Alerts')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Price Alerts')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Transaction Alerts')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Weekly Reports')).toBeVisible({ timeout: 10000 });
    });

    test('notification toggles should be interactive', async ({ page }) => {
        // Weekly Reports starts off (false), click to enable
        const toggle = page.locator('button[role="switch"]').last();
        await expect(toggle).toBeVisible({ timeout: 10000 });
        const initialState = await toggle.getAttribute('aria-checked');
        await toggle.click();
        const newState = await toggle.getAttribute('aria-checked');
        expect(newState).not.toBe(initialState);
    });

    test('should show Save Preferences button', async ({ page }) => {
        await expect(page.locator('button:has-text("Save Preferences")')).toBeVisible({ timeout: 10000 });
    });

    test('Save Preferences should show confirmation feedback', async ({ page }) => {
        await page.locator('button:has-text("Save Preferences")').click();
        await expect(page.locator('button:has-text("Saved")')).toBeVisible({ timeout: 5000 });
    });

    test('theme selection should update active state', async ({ page }) => {
        const darkBtn = page.locator('button:has-text("Dark")');
        await darkBtn.click();
        await expect(darkBtn).toHaveClass(/border-primary/, { timeout: 5000 });
    });

    test('currency selection should update active state', async ({ page }) => {
        const ngnBtn = page.locator('button:has-text("Nigerian Naira")');
        await ngnBtn.click();
        await expect(ngnBtn).toHaveClass(/border-primary/, { timeout: 5000 });
    });

    test('preferences should persist across page reloads', async ({ page }) => {
        // Switch to NGN currency
        await page.locator('button:has-text("Nigerian Naira")').click();
        await page.locator('button:has-text("Save Preferences")').click();
        await page.reload();
        // After reload, NGN sidebar button should still be active
        await expect(page.locator('button:has-text("NGN")')).toHaveClass(/bg-primary/, { timeout: 10000 });
    });
});
