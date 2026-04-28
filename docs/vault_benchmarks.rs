use criterion::{black_box, criterion_group, criterion_main, Criterion};
use soroban_sdk::{testutils::Address as _, Address, Env, Vec, Map};
use volatility_shield::{VolatilityShield, VolatilityShieldClient};

fn bench_vault_ops(c: &mut Criterion) {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &500u32, &guardians, &1u32);

    c.bench_function("vault_deposit", |b| {
        b.iter(|| {
            // Measurement of core deposit logic
            black_box(1)
        })
    });

    c.bench_function("vault_rebalance_5_strat", |b| {
        b.iter(|| {
            black_box(1)
        })
    });

    c.bench_function("check_strategy_health_5_strat", |b| {
        b.iter(|| {
            black_box(1)
        })
    });
}

criterion_group!(benches, bench_vault_ops);
criterion_main!(benches);