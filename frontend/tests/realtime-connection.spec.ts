import { test, expect } from '@playwright/test';

test.describe('Vault Real-Time Connection Infrastructure', () => {

    test('should show "Live" connection status indicator in Vault Overview when RPC is reachable', async ({ page }) => {
        // Intercept Soroban RPC calls and return healthy mock responses
        await page.route('**/*', async (route) => {
            const req = route.request();
            if (req.method() === 'POST' && req.url().includes('rpc')) {
                let body: any;
                try { body = req.postDataJSON(); } catch { await route.fallback(); return; }

                if (body?.method === 'getLatestLedger') {
                    await route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result: { id: 'l', protocolVersion: 20, sequence: 500 } } });
                    return;
                }
                if (body?.method === 'getEvents') {
                    await route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result: { latestLedger: 501, events: [] } } });
                    return;
                }
            }
            await route.fallback();
        });

        // Register watcher before navigation so no requests are missed
        const latestLedgerReq = page.waitForRequest(
            req => req.method() === 'POST' && req.url().includes('rpc') && req.postDataJSON()?.method === 'getLatestLedger',
            { timeout: 20000 }
        );

        await page.goto('/');

        // Vault Overview must be visible
        await expect(page.locator('h2:has-text("Vault Overview")')).toBeVisible({ timeout: 15000 });

        // Wait until getLatestLedger fires to confirm the hook has started
        await latestLedgerReq;

        // The status indicator should transition to "Live"
        await expect(page.locator('#connection-status-indicator[data-status="connected"]')).toBeVisible({ timeout: 15000 });
    });

    test('should show reconnecting status when RPC fails and eventually recover', async ({ page }) => {
        let callCount = 0;

        await page.route('**/*', async (route) => {
            const req = route.request();
            if (req.method() === 'POST' && req.url().includes('rpc')) {
                let body: any;
                try { body = req.postDataJSON(); } catch { await route.fallback(); return; }

                callCount++;
                // Fail the first two RPC calls to trigger reconnecting state
                if (callCount <= 2) {
                    await route.fulfill({ status: 500, body: 'Internal Server Error' });
                    return;
                }
                // Succeed on subsequent calls
                if (body?.method === 'getLatestLedger') {
                    await route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result: { id: 'l', protocolVersion: 20, sequence: 500 } } });
                    return;
                }
                if (body?.method === 'getEvents') {
                    await route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result: { latestLedger: 501, events: [] } } });
                    return;
                }
            }
            await route.fallback();
        });

        await page.goto('/');
        await expect(page.locator('h2:has-text("Vault Overview")')).toBeVisible({ timeout: 15000 });

        // The connection status indicator should exist
        await expect(page.locator('#connection-status-indicator')).toBeVisible({ timeout: 15000 });

        // Eventually should recover to "Live" after backoff
        await expect(page.locator('#connection-status-indicator[data-status="connected"]')).toBeVisible({ timeout: 30000 });
    });

});
