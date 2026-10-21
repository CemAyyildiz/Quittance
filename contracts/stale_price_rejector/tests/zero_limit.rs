use soroban_sdk::Env;
use stale_price_rejector::{StalePriceRejector, StalePriceRejectorClient};

#[test]
fn zero_age_limit_accepts_only_the_current_timestamp() {
    let env = Env::default();
    let id = env.register(StalePriceRejector, ());
    let client = StalePriceRejectorClient::new(&env, &id);

    assert!(client.assert_fresh(&1_000, &1_000, &0));
    assert!(!client.assert_fresh(&999, &1_000, &0));
}
