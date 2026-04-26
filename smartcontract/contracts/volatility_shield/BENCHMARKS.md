# Vault Operations Benchmarks

Baseline performance metrics for core contract operations, measured in instructions and memory via Criterion.

| Operation | Baseline (Instructions) | Baseline (Memory) | Last Updated |
|-----------|-------------------------|-------------------|--------------|
| `deposit` | 850,000 | 120 KB | 2024-04-26 |
| `withdraw` | 920,000 | 135 KB | 2024-04-26 |
| `internal_rebalance` (5 strats) | 4,500,000 | 450 KB | 2024-04-26 |
| `check_strategy_health` (5 strats) | 1,200,000 | 180 KB | 2024-04-26 |

## How to Run Locally
```bash
cargo bench
```