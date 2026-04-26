import { test, expect } from '@playwright/test';

test.describe('Notifications', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Clear localStorage before each test to have a clean state
        await page.evaluate(() => localStorage.removeItem('xh_notifications'));
        await page.reload();
    });

    test('should show unread badge when a notification is added', async ({ page }) => {
        // Open the notification drawer
        await page.locator('button[aria-label="Toggle Notifications"]').click();
        
        // Click "Check for Updates" to add a notification
        await page.locator('button:has-text("Check for Updates")').click();
        
        // Close the drawer
        await page.locator('button:has-text("Notifications") + button').click();
        
        // Check for the unread badge on the bell icon
        const badge = page.locator('button[aria-label="Toggle Notifications"] span');
        await expect(badge).toBeVisible();
        await expect(badge).toHaveText('1');
    });

    test('should mark notification as read and update badge count', async ({ page }) => {
        // Open drawer and add notification
        await page.locator('button[aria-label="Toggle Notifications"]').click();
        await page.locator('button:has-text("Check for Updates")').click();
        
        // Verify it's unread (has blue dot)
        const unreadDot = page.locator('.bg-primary.rounded-full.w-2.h-2').first();
        await expect(unreadDot).toBeVisible();
        
        // Click the notification to mark it as read
        await page.locator('div[class*="bg-primary/5"]').first().click();
        
        // Verify blue dot is gone (or at least that specific one is gone)
        await expect(unreadDot).not.toBeVisible();
        
        // Close drawer and check badge
        await page.locator('button:has-text("Notifications") + button').click();
        const badge = page.locator('button[aria-label="Toggle Notifications"] span');
        await expect(badge).not.toBeVisible();
    });

    test('should persist notifications after page reload', async ({ page }) => {
        // Open drawer and add notification
        await page.locator('button[aria-label="Toggle Notifications"]').click();
        await page.locator('button:has-text("Check for Updates")').click();
        
        // Verify notification title is visible
        const notifTitle = await page.locator('.divide-y span.font-semibold').first().textContent();
        expect(notifTitle).toBeTruthy();
        
        // Reload page
        await page.reload();
        
        // Check if badge is still there
        const badge = page.locator('button[aria-label="Toggle Notifications"] span');
        await expect(badge).toBeVisible();
        await expect(badge).toHaveText('1');
        
        // Open drawer and verify notification is still there
        await page.locator('button[aria-label="Toggle Notifications"]').click();
        await expect(page.locator(`.divide-y span.font-semibold:has-text("${notifTitle}")`)).toBeVisible();
    });

    test('should mark all as read', async ({ page }) => {
        await page.locator('button[aria-label="Toggle Notifications"]').click();
        // Add two notifications
        await page.locator('button:has-text("Check for Updates")').click();
        await page.locator('button:has-text("Check for Updates")').click();
        
        // Verify badge says 2
        await page.locator('button:has-text("Notifications") + button').click();
        const badge = page.locator('button[aria-label="Toggle Notifications"] span');
        await expect(badge).toHaveText('2');
        
        // Open drawer and click "Mark all as read"
        await page.locator('button[aria-label="Toggle Notifications"]').click();
        await page.locator('button:has-text("Mark all as read")').click();
        
        // Verify no unread dots
        await expect(page.locator('.bg-primary.rounded-full.w-2.h-2')).not.toBeVisible();
        
        // Close drawer and verify badge is gone
        await page.locator('button:has-text("Notifications") + button').click();
        await expect(badge).not.toBeVisible();
    });

    test('should clear all notifications', async ({ page }) => {
        await page.locator('button[aria-label="Toggle Notifications"]').click();
        await page.locator('button:has-text("Check for Updates")').click();
        
        await expect(page.locator('.divide-y > div')).toHaveCount(1);
        
        await page.locator('button:has-text("Clear all")').click();
        
        await expect(page.locator('p:has-text("No notifications yet")')).toBeVisible();
        await expect(page.locator('.divide-y > div')).toHaveCount(0);
    });
});
