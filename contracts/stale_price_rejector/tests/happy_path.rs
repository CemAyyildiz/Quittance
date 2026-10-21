use soroban_sdk::Env;
use stale_price_rejector::{StalePriceRejector, StalePriceRejectorClient};

#[test]
fn recent_price_is_fresh() {
    let env = Env::default();
    let id = env.register(StalePriceRejector, ());
    let client = StalePriceRejectorClient::new(&env, &id);

    assert!(client.assert_fresh(&990, &1_000, &30));
}
