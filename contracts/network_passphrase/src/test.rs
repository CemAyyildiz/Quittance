#![cfg(test)]

use soroban_sdk::{Env, String, Symbol};

use crate::{is_known_passphrase, passphrase_testnet, passphrase_public};

const FUTURENET_PASSPHRASE: &str = "Test SDF Future Network ; October 2022";

#[test]
fn testnet_passphrase_is_known() {
    let env = Env::default();
    let passphrase = passphrase_testnet(&env);
    assert!(is_known_passphrase(&env, &passphrase), "Testnet passphrase should be known");
}

#[test]
fn public_passphrase_is_known() {
    let env = Env::default();
    let passphrase = passphrase_public(&env);
    assert!(is_known_passphrase(&env, &passphrase), "Public passphrase should be known");
}

#[test]
fn futurenet_passphrase_is_not_known() {
    let env = Env::default();
    let futurenet_passphrase = Symbol::new(&env, FUTURENET_PASSPHRASE);
    assert!(!is_known_passphrase(&env, &futurenet_passphrase),
        "Futurenet passphrase should NOT be known - this locks rejection of Futurenet");
}

#[test]
fn random_passphrase_is_not_known() {
    let env = Env::default();
    let random_passphrase = Symbol::new(&env, "Some Random Passphrase");
    assert!(!is_known_passphrase(&env, &random_passphrase),
        "Random passphrase should not be known");
}

#[test]
fn empty_passphrase_is_not_known() {
    let env = Env::default();
    let empty_passphrase = Symbol::new(&env, "");
    assert!(!is_known_passphrase(&env, &empty_passphrase),
        "Empty passphrase should not be known");
}