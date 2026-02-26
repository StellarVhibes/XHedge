import { test, expect } from '@playwright/test';

test.describe('Wallet Connectivity', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Freighter API
        await page.addInitScript(() => {
            console.log('Mocking Freighter API...');
            const mockFreighter = {
                isConnected: () => {
                    console.log('freighter.isConnected called');
                    return Promise.resolve(true);
                },
                getPublicKey: () => {
                    console.log('freighter.getPublicKey called');
                    return Promise.resolve('GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N');
                },
                isAllowed: () => Promise.resolve(true),
                setAllowed: () => Promise.resolve(true),
                getNetwork: () => Promise.resolve('TESTNET'),
                requestAccess: () => Promise.resolve('GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N'),
                signTransaction: (xdr: string) => Promise.resolve(xdr),
            };
            (window as any).freighter = mockFreighter;
            console.log('Freighter API mocked.');
        });
    });

    test('should show connected wallet state', async ({ page }) => {
        await page.goto('/');

        // Click connect button
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        // Wait for it to be visible and enabled (resolve loading state)
        await expect(connectBtn).toBeVisible({ timeout: 15000 });
        await expect(connectBtn).toBeEnabled({ timeout: 15000 });
        await connectBtn.click();

        // Check for connected address or disconnect button
        // Based on WalletButton component (need to check it)
        await expect(page.locator('button:has-text("Disconnect"), button:has-text("G...")')).toBeVisible();
    });

    test('should show vault metrics when connected', async ({ page }) => {
        await page.goto('/vault');

        // Sometimes we need to click connect if it doesn't auto-connect
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        if (await connectBtn.isVisible()) {
            await connectBtn.click();
        }

        // Wait for connection to be recognized and elements to appear
        await expect(page.locator('h2:has-text("APY History")')).toBeVisible({ timeout: 15000 });

        // Verify deposit/withdraw form is active
        await expect(page.locator('button:has-text("Deposit")')).toBeEnabled();

        // Check for Recent Activity (TransactionList)
        await expect(page.locator('h2:has-text("Recent Activity")')).toBeVisible();
    });
});
