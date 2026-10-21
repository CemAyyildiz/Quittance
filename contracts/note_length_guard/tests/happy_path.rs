use note_length_guard::{NoteLengthGuard, NoteLengthGuardClient};
use soroban_sdk::{Env, String};

#[test]
fn printable_invoice_note_is_valid() {
    let env = Env::default();
    let contract_id = env.register(NoteLengthGuard, ());
    let client = NoteLengthGuardClient::new(&env, &contract_id);
    let note = String::from_str(&env, "Invoice INV-42: paid");

    assert!(client.is_valid_note(&note, &64));
}
