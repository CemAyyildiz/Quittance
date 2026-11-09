//! Error and rejection tests for `seller-payout-address-binding`.

use super::{new_addr, setup};
use crate::Error;

#[test]
fn rebind_during_cooldown_or_with_earlier_ledger_is_rejected() {
    let (env, client) = setup();
    let seller = new_addr(&env);
    let dest_1 = new_addr(&env);
    let dest_2 = new_addr(&env);

    client.bind(&seller, &dest_1, &500);

    assert_eq!(
        client.try_bind(&seller, &dest_2, &550),
        Err(Ok(Error::CooldownActive))
    );
    assert_eq!(
        client.try_bind(&seller, &dest_2, &499),
        Err(Ok(Error::LedgerRegression))
    );
    assert_eq!(client.payout_address_of(&seller), Some(dest_1));
}

#[test]
fn cooldown_addition_overflow_is_rejected_cleanly() {
    let (env, client) = setup();
    let seller = new_addr(&env);
    let dest_1 = new_addr(&env);
    let dest_2 = new_addr(&env);

    client.bind(&seller, &dest_1, &(u32::MAX - 10));
    assert_eq!(
        client.try_bind(&seller, &dest_2, &u32::MAX),
        Err(Ok(Error::CooldownOverflow))
    );
    assert!(!Error::CooldownActive.message().is_empty());
    assert!(!Error::LedgerRegression.message().is_empty());
    assert!(!Error::CooldownOverflow.message().is_empty());
}
