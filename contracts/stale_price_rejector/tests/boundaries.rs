use soroban_sdk::Env;
use stale_price_rejector::{StalePriceRejector, StalePriceRejectorClient};

#[test]
fn maximum_age_is_inclusive() {
    let env = Env::default();
    let id = env.register(StalePriceRejector, ());
    let client = StalePriceRejectorClient::new(&env, &id);

    assert!(client.assert_fresh(&900, &1_000, &100));
    assert!(!client.assert_fresh(&899, &1_000, &100));
}
