use note_length_guard::{NoteLengthGuard, NoteLengthGuardClient};
use soroban_sdk::{Env, String};

#[test]
fn control_and_non_ascii_characters_are_invalid() {
    let env = Env::default();
    let contract_id = env.register(NoteLengthGuard, ());
    let client = NoteLengthGuardClient::new(&env, &contract_id);

    for value in ["line\nbreak", "tab\tcharacter", "café"] {
        let note = String::from_str(&env, value);
        assert!(!client.is_valid_note(&note, &64), "accepted {value:?}");
    }
}
