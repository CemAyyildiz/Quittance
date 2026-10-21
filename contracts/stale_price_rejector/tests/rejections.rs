use soroban_sdk::Env;
use stale_price_rejector::{StalePriceRejector, StalePriceRejectorClient};

#[test]
fn future_price_is_rejected() {
    let env = Env::default();
    let id = env.register(StalePriceRejector, ());
    let client = StalePriceRejectorClient::new(&env, &id);

    assert!(!client.assert_fresh(&1_001, &1_000, &10));
}
