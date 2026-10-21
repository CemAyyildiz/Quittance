use note_length_guard::{NoteLengthGuard, NoteLengthGuardClient};
use soroban_sdk::{Env, String};

#[test]
fn note_at_inclusive_byte_limit_is_valid() {
    let env = Env::default();
    let contract_id = env.register(NoteLengthGuard, ());
    let client = NoteLengthGuardClient::new(&env, &contract_id);
    let note = String::from_str(&env, "12345678");

    assert!(client.is_valid_note(&note, &8));
}

#[test]
fn one_byte_over_limit_is_invalid() {
    let env = Env::default();
    let contract_id = env.register(NoteLengthGuard, ());
    let client = NoteLengthGuardClient::new(&env, &contract_id);
    let note = String::from_str(&env, "123456789");

    assert!(!client.is_valid_note(&note, &8));
}
