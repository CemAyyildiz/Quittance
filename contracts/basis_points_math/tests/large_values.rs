use basis_points_math::{BasisPointsMath, BasisPointsMathClient};
use soroban_sdk::Env;

#[test]
fn avoids_false_overflow_when_final_result_fits() {
    let env = Env::default();
    let id = env.register(BasisPointsMath, ());
    let client = BasisPointsMathClient::new(&env, &id);

    assert_eq!(client.mul_bps(&i128::MAX, &10_000), Some(i128::MAX));
    assert_eq!(client.mul_bps(&i128::MIN, &10_000), Some(i128::MIN));
}
