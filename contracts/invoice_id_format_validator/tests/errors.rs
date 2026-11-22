//! Failure cases through the contract client: bad inputs are rejected.

use invoice_id_format_validator::{
    Error, InvoiceIdFormatValidator, InvoiceIdFormatValidatorClient,
};
use soroban_sdk::{Env, String};

fn client(env: &Env) -> InvoiceIdFormatValidatorClient<'_> {
    let contract_id = env.register(InvoiceIdFormatValidator, ());
    InvoiceIdFormatValidatorClient::new(env, &contract_id)
}

#[test]
fn checksum_digit_rejects_non_digit_bytes() {
    let env = Env::default();
    let client = client(&env);

    let letters = String::from_str(&env, "12a4");
    assert_eq!(
        client.try_checksum_digit(&letters),
        Err(Ok(Error::NonDigitChars))
    );

    let punctuated = String::from_str(&env, "12-4");
    assert_eq!(
        client.try_checksum_digit(&punctuated),
        Err(Ok(Error::NonDigitChars))
    );
}

#[test]
fn checksum_digit_rejects_non_ascii() {
    let env = Env::default();
    let client = client(&env);

    // Full-width digit '２' is multi-byte UTF-8, not ASCII '2'.
    let full_width = String::from_str(&env, "1２3");
    assert_eq!(
        client.try_checksum_digit(&full_width),
        Err(Ok(Error::NonDigitChars))
    );
}

#[test]
fn checksum_digit_rejects_overlong_input() {
    let env = Env::default();
    let client = client(&env);

    let long = "1".repeat(65);
    let digits = String::from_str(&env, &long);
    assert_eq!(client.try_checksum_digit(&digits), Err(Ok(Error::TooLong)));
}

#[test]
fn checksum_digit_accepts_empty_and_pure_digits() {
    let env = Env::default();
    let client = client(&env);

    let empty = String::from_str(&env, "");
    assert_eq!(client.checksum_digit(&empty), 0);

    let digits = String::from_str(&env, "1234567890");
    assert_eq!(client.checksum_digit(&digits), 2);
}

#[test]
fn is_valid_returns_false_for_every_malformed_id() {
    let env = Env::default();
    let client = client(&env);

    for bad in [
        "",                              // empty
        "inv000000000101",               // lowercase prefix
        "IVN000000000101",               // scrambled prefix
        "INV000000000102",               // checksum mismatch
        "INV00000000010",                // too short
        "INV0000000001010",              // too long
        "INV000000000A01",               // non-digit body byte
        "INV00000000010A",               // non-digit checksum byte
        "1NV000000000101",               // digit inside the prefix
    ] {
        assert!(
            !client.is_valid_invoice_id(&String::from_str(&env, bad)),
            "expected invalid: {bad}"
        );
    }

    assert!(client.is_valid_invoice_id(&String::from_str(&env, "INV000000000101")));
}
