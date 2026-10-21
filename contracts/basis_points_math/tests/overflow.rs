use basis_points_math::{BasisPointsMath, BasisPointsMathClient};
use soroban_sdk::Env;

#[test]
fn reports_unrepresentable_multiplication_and_addition() {
    let env = Env::default();
    let id = env.register(BasisPointsMath, ());
    let client = BasisPointsMathClient::new(&env, &id);

    assert_eq!(client.mul_bps(&i128::MAX, &u32::MAX), None);
    assert_eq!(client.checked_add_bps(&i128::MAX, &1), None);
}
