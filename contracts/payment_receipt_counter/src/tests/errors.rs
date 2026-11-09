use super::setup;
use crate::{DataKey, Error};
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn increment_payment_returns_overflow_error_at_u32_max() {
    let (env, client) = setup();
    let payer = Address::generate(&env);

    env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .set(&DataKey::Count(payer.clone()), &u32::MAX);
    });

    assert_eq!(
        client.try_increment_payment(&payer),
        Err(Ok(Error::CounterOverflow))
    );
}
