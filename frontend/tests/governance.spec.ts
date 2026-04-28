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

test.describe('Governance Page', () => {
    test('should render proposal list container', async ({ page }) => {
        await page.goto('/governance');
        await expect(page.getByTestId('governance-page')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('governance-proposal-list')).toBeVisible({ timeout: 10000 });
    });

    test('should show vote buttons for connected guardian wallet', async ({ page }) => {
        await injectMockFreighter(page);
        await page.goto('/governance');
        const connectBtn = page.locator('button:has-text("Connect Wallet")');
        if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await connectBtn.click();
        }

        await expect(page.locator('[data-testid^="vote-for-"]').first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-testid^="vote-against-"]').first()).toBeVisible({ timeout: 15000 });
    });
});
