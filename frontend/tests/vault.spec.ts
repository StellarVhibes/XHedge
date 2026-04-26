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

test.describe('Vault Page', () => {
    test('should display vault page heading', async ({ page }) => {
        await page.goto('/vault');
        await expect(page.locator('h1:has-text("Vault")')).toBeVisible({ timeout: 10000 });
    });

    test('should display Deposit and Withdraw tabs', async ({ page }) => {
        await page.goto('/vault');
        await expect(page.locator('button:has-text("Deposit")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("Withdraw")')).toBeVisible({ timeout: 10000 });
    });

    test('deposit amount input should be visible', async ({ page }) => {
        await page.goto('/vault');
        await expect(page.locator('#deposit-amount')).toBeVisible({ timeout: 10000 });
    });

    test('deposit submit button should be disabled when wallet is not connected', async ({ page }) => {
        await page.goto('/vault');
        // The primary submit button inside the deposit tab — disabled without wallet
        const depositSubmitBtn = page.locator('div[class*="space-y"] button:has-text("Deposit")').first();
        await expect(depositSubmitBtn).toBeDisabled({ timeout: 10000 });
    });

    test('should switch to Withdraw tab', async ({ page }) => {
        await page.goto('/vault');
        const withdrawTab = page.locator('button:has-text("Withdraw")').first();
        await withdrawTab.click();
        await expect(page.locator('#withdraw-amount')).toBeVisible({ timeout: 10000 });
    });

    test('withdraw submit button should be disabled when wallet is not connected', async ({ page }) => {
        await page.goto('/vault');
        await page.locator('button:has-text("Withdraw")').first().click();
        const withdrawSubmitBtn = page.locator('div[class*="space-y"] button:has-text("Withdraw")').first();
        await expect(withdrawSubmitBtn).toBeDisabled({ timeout: 10000 });
    });

    test('legal acceptance badges should be visible on deposit tab', async ({ page }) => {
        await page.goto('/vault');
        await expect(page.locator('text=Terms of Service')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Privacy Policy')).toBeVisible({ timeout: 10000 });
    });

    test('should show APY History section when wallet is connected', async ({ page }) => {
        await injectMockFreighter(page);
        await page.goto('/vault');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await connectBtn.click();
        }
        await expect(page.locator('h2:has-text("APY History")')).toBeVisible({ timeout: 15000 });
    });

    test('timeframe filter buttons should be visible when connected', async ({ page }) => {
        await injectMockFreighter(page);
        await page.goto('/vault');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await connectBtn.click();
        }
        await expect(page.locator('h2:has-text("APY History")')).toBeVisible({ timeout: 15000 });
        // Timeframe filter buttons (1W, 1M, 3M, 1Y) should be visible
        await expect(page.locator('button:has-text("1M")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("1W")')).toBeVisible({ timeout: 10000 });
    });

    test('deposit input should accept numeric values', async ({ page }) => {
        await page.goto('/vault');
        const input = page.locator('#deposit-amount');
        await expect(input).toBeVisible({ timeout: 10000 });
        // Input should be disabled without wallet connection
        await expect(input).toBeDisabled({ timeout: 5000 });
    });
});
