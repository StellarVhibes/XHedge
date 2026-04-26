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

test.describe('APY chart historical share price feed', () => {
  test('renders empty state when no history exists (no mock fallback)', async ({ page }) => {
    await injectMockFreighter(page);

    let latestLedgerCalls = 0;
    let eventsCalls = 0;

    await page.route('**/*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' && request.url().includes('rpc')) {
        const postData = request.postDataJSON?.();

        if (postData?.method === 'getLatestLedger') {
          latestLedgerCalls++;
          await route.fulfill({
            json: {
              jsonrpc: '2.0',
              id: postData.id,
              result: { id: 'l', protocolVersion: 20, sequence: 200500 },
            },
          });
          return;
        }

        if (postData?.method === 'getEvents') {
          eventsCalls++;
          await route.fulfill({
            json: {
              jsonrpc: '2.0',
              id: postData.id,
              result: {
                latestLedger: 200500,
                events: [],
              },
            },
          });
          return;
        }
      }

      await route.fallback();
    });

    await page.goto('/vault');

    const connectBtn = page.locator('button:has-text("Connect Wallet")');
    if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectBtn.click();
    }

    await expect(page.locator('h2:has-text("APY History")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=No APY data available')).toBeVisible({ timeout: 15000 });

    expect(latestLedgerCalls).toBeGreaterThan(0);
    expect(eventsCalls).toBeGreaterThan(0);
  });

  test('timeframe filter changes query startLedger (range limiting)', async ({ page }) => {
    await injectMockFreighter(page);

    const observedStartLedgers: number[] = [];
    let getEventsCallIndex = 0;

    await page.route('**/*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' && request.url().includes('rpc')) {
        const postData = request.postDataJSON?.();

        if (postData?.method === 'getLatestLedger') {
          await route.fulfill({
            json: {
              jsonrpc: '2.0',
              id: postData.id,
              result: { id: 'l', protocolVersion: 20, sequence: 200500 },
            },
          });
          return;
        }

        if (postData?.method === 'getEvents') {
          const startLedger = postData?.params?.[0]?.startLedger;
          if (typeof startLedger === 'number') {
            observedStartLedgers.push(startLedger);
          }

          // First getEvents call returns one Deposit event, next returns empty to end loop.
          getEventsCallIndex++;
          if (getEventsCallIndex === 1) {
            await route.fulfill({
              json: {
                jsonrpc: '2.0',
                id: postData.id,
                result: {
                  latestLedger: 200500,
                  events: [
                    {
                      type: 'contract',
                      ledger: 200000,
                      ledgerClosedAt: new Date().toISOString(),
                      contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
                      id: '0000-01',
                      pagingToken: '0000-01',
                      topic: [{ _type: 'scvSymbol', _value: 'Deposit' }],
                      value: {
                        _type: 'scvVec',
                        _value: [
                          { _type: 'scvU32', _value: 0 },
                          { _type: 'scvI128', _value: '10000000' },
                          { _type: 'scvI128', _value: '1000000000' },
                          { _type: 'scvI128', _value: '1000000000' },
                          { _type: 'scvI128', _value: '1000000000' },
                        ],
                      },
                    },
                  ],
                },
              },
            });
            return;
          }

          await route.fulfill({
            json: {
              jsonrpc: '2.0',
              id: postData.id,
              result: {
                latestLedger: 200500,
                events: [],
              },
            },
          });
          return;
        }
      }

      await route.fallback();
    });

    await page.goto('/vault');

    const connectBtn = page.locator('button:has-text("Connect Wallet")');
    if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectBtn.click();
    }

    await expect(page.locator('h2:has-text("APY History")')).toBeVisible({ timeout: 15000 });

    // Change timeframe to 1D, then 1Y, and verify startLedger shifts.
    // We wait for a getEvents request each time (the chart data effect re-runs).
    const firstReq = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().includes('rpc') && req.postDataJSON()?.method === 'getEvents',
      { timeout: 30000 }
    );
    await page.locator('button:has-text("1D")').click();
    await firstReq;

    const secondReq = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().includes('rpc') && req.postDataJSON()?.method === 'getEvents',
      { timeout: 30000 }
    );
    await page.locator('button:has-text("1Y")').click();
    await secondReq;

    // We expect at least two observed startLedgers across calls.
    expect(observedStartLedgers.length).toBeGreaterThan(1);

    const maxStart = Math.max(...observedStartLedgers);
    const minStart = Math.min(...observedStartLedgers);

    // Shorter timeframe => higher startLedger (closer to latest ledger).
    expect(maxStart).toBeGreaterThan(minStart);
  });
});
