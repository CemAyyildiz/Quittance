use note_length_guard::{NoteLengthGuard, NoteLengthGuardClient};
use soroban_sdk::{Env, String};

#[test]
fn empty_note_is_valid_even_with_zero_limit() {
    let env = Env::default();
    let contract_id = env.register(NoteLengthGuard, ());
    let client = NoteLengthGuardClient::new(&env, &contract_id);
    let empty = String::from_str(&env, "");
    let nonempty = String::from_str(&env, "x");

    assert!(client.is_valid_note(&empty, &0));
    assert!(!client.is_valid_note(&nonempty, &0));
}
