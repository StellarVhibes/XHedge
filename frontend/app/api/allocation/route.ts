import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function readI128(i128: any) {
  if (!i128) return 0;
  // prefer 'lo' when available (snapshots use hi/lo small numbers)
  if (typeof i128 === 'number') return i128;
  if (i128.i128) return readI128(i128.i128);
  if (i128.lo !== undefined) return Number(i128.lo);
  if (i128.u32 !== undefined) return Number(i128.u32);
  return 0;
}

async function parseSnapshot(snapshotPath: string) {
  const raw = await fs.readFile(snapshotPath, 'utf8');
  const json = JSON.parse(raw);

  const ledgerEntries = json.ledger?.ledger_entries ?? [];

  const strategies: { address: string; balance: number }[] = [];

  for (const entry of ledgerEntries) {
    try {
      const key = entry[0]?.contract_data?.key;
      const data = entry[1]?.[0]?.data?.contract_data?.val;
      if (key?.vec && key.vec[0]?.symbol === 'Balance' && key.vec[1]?.address) {
        const address = key.vec[1].address;
        const balance = readI128(data);
        strategies.push({ address, balance });
      }
    } catch (e) {
      // ignore malformed entries
    }
  }

  // find contract instance storage for TotalAssets
  let totalAssets = 0;
  for (const entry of ledgerEntries) {
    try {
      const key = entry[0]?.contract_data?.key;
      if (key === 'ledger_key_contract_instance') {
        const storage = entry[1]?.[0]?.data?.contract_data?.val?.contract_instance?.storage ?? [];
        for (const item of storage) {
          const kvec = item?.key?.vec;
          if (kvec && kvec[0]?.symbol === 'TotalAssets') {
            totalAssets = readI128(item.val?.i128 ?? item.val);
          }
        }
      }
    } catch (e) {}
  }

  // fallback: try to find TotalAssets as key.vec symbol in other entries
  if (!totalAssets) {
    for (const entry of ledgerEntries) {
      try {
        const key = entry[0]?.contract_data?.key;
        const dataVal = entry[1]?.[0]?.data?.contract_data?.val;
        if (key?.vec && key.vec[0]?.symbol === 'TotalAssets') {
          totalAssets = readI128(dataVal);
        }
      } catch (e) {}
    }
  }

  const sumStrategies = strategies.reduce((s, c) => s + c.balance, 0);
  const unallocated = Math.max(0, (totalAssets || 0) - sumStrategies);

  const slices = strategies.map((s, i) => ({ name: s.address, value: s.balance, color: `hsl(${(i * 70) % 360} 70% 50%)` }));
  if (unallocated > 0) slices.push({ name: 'Unallocated', value: unallocated, color: '#CBD5E1' });

  return { totalAssets: totalAssets || sumStrategies, strategies, slices };
}

export async function GET() {
  try {
    const snapshotPath = path.join(process.cwd(), 'smartcontract', 'contracts', 'volatility_shield', 'test_snapshots', 'test', 'test_withdraw_success.1.json');
    const parsed = await parseSnapshot(snapshotPath);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: 'Could not read snapshot', details: String(e) }, { status: 500 });
  }
}
