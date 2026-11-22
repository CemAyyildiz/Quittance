//! Concept scenario: id minting and tamper detection round-trip.
//!
//! An issuer mints ids by appending `checksum_suffix(body)`; any single-byte
//! tamper afterwards must make the id invalid. This is the property that
//! makes the checksum worth having.

use invoice_id_format_validator::{checksum_suffix, is_valid_invoice_id};

fn mint(body: &str) -> String {
    let suffix = checksum_suffix(body).expect("body must be pure digits");
    let suffix = core::str::from_utf8(&suffix).expect("suffix is ASCII");
    format!("INV{body}{suffix}")
}

#[test]
fn minted_ids_always_validate() {
    for body in [
        "0000000000",
        "0000000001",
        "0000000042",
        "1234567890",
        "9999999999",
        "9876543210",
    ] {
        assert!(is_valid_invoice_id(&mint(body)), "body {body}");
    }
}

#[test]
fn tampering_with_any_byte_invalidates_the_id() {
    let id = mint("1234567890");
    let bytes = id.as_bytes();

    for i in 0..bytes.len() {
        let mut mutated = bytes.to_vec();
        // Flip to a different byte that keeps the id printable ASCII.
        mutated[i] = if bytes[i] == b'0' { b'1' } else { b'0' };
        let mutated = String::from_utf8(mutated).expect("still ASCII");
        assert!(!is_valid_invoice_id(&mutated), "tamper at {i} undetected");
    }
}

#[test]
fn wrong_checksum_on_an_otherwise_valid_body_is_rejected() {
    let body = "0000000042";
    let good = mint(body);
    let good_checksum = good.chars().last().unwrap();

    // Walk the checksum digit through every other value; all must fail.
    for tampered in ('0'..='9').filter(|c| *c != good_checksum) {
        let id = format!("INV{body}0{tampered}");
        assert!(!is_valid_invoice_id(&id));
    }
    // The genuine checksum verifies.
    assert!(is_valid_invoice_id(&good));
}
