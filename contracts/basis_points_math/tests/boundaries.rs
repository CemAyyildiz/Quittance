use basis_points_math::{BasisPointsMath, BasisPointsMathClient};
use soroban_sdk::Env;

#[test]
fn handles_zero_full_rate_and_fractional_truncation() {
    let env = Env::default();
    let id = env.register(BasisPointsMath, ());
    let client = BasisPointsMathClient::new(&env, &id);

    assert_eq!(client.mul_bps(&i128::MAX, &0), Some(0));
    assert_eq!(client.mul_bps(&12_345, &10_000), Some(12_345));
    assert_eq!(client.mul_bps(&3, &3_333), Some(0));
}
