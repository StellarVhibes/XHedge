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

test.describe('Portfolio Breakdown Card', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockFreighter(page);
    });

    test('should display positive P&L correctly', async ({ page }) => {
        const userAddress = 'GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N';
        
        await page.addInitScript(({ address }) => {
            // Mock vault data in localStorage cache to be used by fetchVaultData fallback or hook
            const vaultData = {
                totalAssets: "10000000000",
                totalShares: "10000000000",
                sharePrice: "1.2500000", // Current price is 1.25
                userBalance: "1000000000", // Derived balance
                userShares: "1000000000",  // 100.00 shares (stroops / 10^7)
                assetSymbol: "USDC",
            };
            localStorage.setItem("xhedge-vault-cache", JSON.stringify(vaultData));
            localStorage.setItem("xhedge-vault-cache-time", Date.now().toString());
            
            // Set entry price to 1.0 (25% gain)
            localStorage.setItem(`xh_entry_price_${address}`, "1.0000000");
        }, { address: userAddress });

        await page.goto('/');
        
        // Wait for the Portfolio Card to be visible
        const portfolioCard = page.locator('h2:has-text("Your Portfolio Breakdown")');
        await expect(portfolioCard).toBeVisible({ timeout: 15000 });
        
        // Verify Shares Held
        await expect(page.locator('text=100.00 XHS')).toBeVisible();
        
        // Verify P&L Percentage (+25.00%)
        await expect(page.locator('text=+25.00%')).toBeVisible();
        
        // Verify Color Coding (green for positive)
        const pnlText = page.locator('p:has-text("+25.00%")');
        await expect(pnlText).toHaveClass(/text-green-500/);
        
        // Verify Estimated Value: 100 shares * 1.25 = 125.00
        await expect(page.locator('text=$125.00')).toBeVisible();
    });

    test('should display negative P&L correctly', async ({ page }) => {
        const userAddress = 'GBXFQY665K3S3SZESTSY3A4Y5Z6K2O3B4C5D6E7F8G9H0I1J2K3L4M5N';
        
        await page.addInitScript(({ address }) => {
            const vaultData = {
                totalAssets: "10000000000",
                totalShares: "10000000000",
                sharePrice: "0.7500000", // Current price is 0.75
                userBalance: "750000000",
                userShares: "1000000000",  // 100.00 shares
                assetSymbol: "USDC",
            };
            localStorage.setItem("xhedge-vault-cache", JSON.stringify(vaultData));
            localStorage.setItem("xhedge-vault-cache-time", Date.now().toString());
            
            // Set entry price to 1.0 (25% loss)
            localStorage.setItem(`xh_entry_price_${address}`, "1.0000000");
        }, { address: userAddress });

        await page.goto('/');
        
        const portfolioCard = page.locator('h2:has-text("Your Portfolio Breakdown")');
        await expect(portfolioCard).toBeVisible({ timeout: 15000 });
        
        // Verify P&L Percentage (-25.00%)
        await expect(page.locator('text=-25.00%')).toBeVisible();
        
        // Verify Color Coding (red for negative)
        const pnlText = page.locator('p:has-text("-25.00%")');
        await expect(pnlText).toHaveClass(/text-red-500/);
        
        // Verify Estimated Value: 100 shares * 0.75 = 75.00
        await expect(page.locator('text=$75.00')).toBeVisible();
    });
});
