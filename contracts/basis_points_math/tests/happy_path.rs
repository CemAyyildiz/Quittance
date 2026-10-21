use basis_points_math::{BasisPointsMath, BasisPointsMathClient};
use soroban_sdk::Env;

#[test]
fn computes_typical_fee_and_addition() {
    let env = Env::default();
    let id = env.register(BasisPointsMath, ());
    let client = BasisPointsMathClient::new(&env, &id);

    assert_eq!(client.mul_bps(&100_000, &250), Some(2_500));
    assert_eq!(client.checked_add_bps(&100_000, &250), Some(102_500));
}
