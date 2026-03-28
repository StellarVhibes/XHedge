import { test, expect } from '@playwright/test';

async function injectMockFreighter(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
        const mockFreighter = {
            isConnected: () => Promise.resolve(true),
            getPublicKey: () =>
                Promise.resolve('GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N'),
            isAllowed: () => Promise.resolve(true),
            setAllowed: () => Promise.resolve(true),
            getNetwork: () => Promise.resolve('TESTNET'),
            requestAccess: () =>
                Promise.resolve('GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N'),
            signTransaction: (xdr: string) => Promise.resolve(xdr),
        };
        (window as any).freighter = mockFreighter;
    });
}

test.describe('Wallet Connectivity', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockFreighter(page);
    });

    test('should show Connect Wallet button on dashboard', async ({ page }) => {
        await page.goto('/');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        await expect(connectBtn).toBeVisible({ timeout: 15000 });
        await expect(connectBtn).toBeEnabled({ timeout: 15000 });
    });

    test('should show connected wallet state after clicking connect', async ({ page }) => {
        await page.goto('/');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        await expect(connectBtn).toBeVisible({ timeout: 15000 });
        await connectBtn.click();
        await expect(
            page.locator('button:has-text("Disconnect"), button:has-text("G...")')
        ).toBeVisible({ timeout: 10000 });
    });

    test('should show APY History on vault page when connected', async ({ page }) => {
        // BUG FIX: "Recent Activity" (TransactionList) lives on the home page, NOT /vault.
        // The vault page shows "APY History" when a wallet is connected.
        await page.goto('/vault');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await connectBtn.click();
        }
        await expect(page.locator('h2:has-text("APY History")')).toBeVisible({ timeout: 15000 });
    });

    test('should show Recent Activity on dashboard when connected', async ({ page }) => {
        // TransactionList renders "Recent Activity" on the home page only.
        await page.goto('/');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await connectBtn.click();
        }
        await expect(page.locator('h2:has-text("Recent Activity")')).toBeVisible({ timeout: 15000 });
    });

    test('wallet button should be present on vault page', async ({ page }) => {
        await page.goto('/vault');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        await expect(connectBtn).toBeVisible({ timeout: 10000 });
    });
});
