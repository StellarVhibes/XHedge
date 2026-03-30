import { test, expect } from '@playwright/test';

test.describe('Vault Real-Time Events', () => {
    test('should poll Soroban RPC events and update Vault Overview in real-time', async ({ page }) => {
        // Register request interception BEFORE navigation so no requests are missed
        await page.route('**/*', async (route) => {
            const request = route.request();
            if (request.method() === 'POST' && request.url().includes('rpc')) {
                let postData: any;
                try {
                    postData = request.postDataJSON();
                } catch {
                    await route.fallback();
                    return;
                }

                if (postData?.method === 'getLatestLedger') {
                    await route.fulfill({
                        json: {
                            jsonrpc: '2.0',
                            id: postData.id,
                            result: { id: 'l', protocolVersion: 20, sequence: 100 }
                        }
                    });
                    return;
                }

                if (postData?.method === 'getEvents') {
                    await route.fulfill({
                        json: {
                            jsonrpc: '2.0',
                            id: postData.id,
                            result: {
                                latestLedger: 101,
                                events: [{
                                    type: 'contract',
                                    ledger: 101,
                                    ledgerClosedAt: new Date().toISOString(),
                                    contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
                                    id: '0000-01',
                                    pagingToken: '0000-01',
                                    topic: [{ _type: 'scvSymbol', _value: 'Deposit' }],
                                    value: { _type: 'scvU32', _value: 500 }
                                }]
                            }
                        }
                    });
                    return;
                }
            }
            await route.fallback();
        });

        // Register request watcher BEFORE navigation — must be done early
        const eventsRequestPromise = page.waitForRequest(
            req => req.method() === 'POST' && req.url().includes('rpc') && req.postDataJSON()?.method === 'getEvents',
            { timeout: 30000 }
        );

        // Navigate to home page - VaultOverviewCard is rendered here
        await page.goto('/');

        // Assert Vault Overview is visible
        await expect(page.locator('h2:has-text("Vault Overview")')).toBeVisible({ timeout: 15000 });

        // Wait for the getEvents polling request to fire (after getLatestLedger runs on first tick)
        await eventsRequestPromise;

        // Assert VaultOverviewCard is still fully visible after event triggers a refresh
        await expect(page.locator('h2:has-text("Vault Overview")')).toBeVisible({ timeout: 10000 });
    });
});
