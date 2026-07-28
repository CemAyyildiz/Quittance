//! Stability tests: identical inputs always yield identical hashes.

use quittance_receipt_hash::{
    compute, Asset, DomainSeparator, ReceiptFields, ReceiptFieldsBuilder,
};

const PASSPHRASE_TESTNET: &str = "Test SDF Network ; September 2015";
const SELLER: &str = "SellerA-PubKey-1234567890123456789012345678901234";
const PAYER: &str = "PayerA-PubKey-123456789012345678901234567890123456";
const MEMO: &str = "Invoice INV-001";
const INVOICE_ID: &str = "11111111-1111-1111-1111-111111111111";

// IMPORTANT: the inputs of `sample_fields()` MUST stay byte-identical to
// the inputs of `examples/canonical_sample.rs::main`. The latter is the
// public regeneration entry point for the pinned hash below. If you edit
// either copy, edit the other as well and re-freeze the pinned vector by
// running `cargo run --example canonical_sample` and updating the expected
// hex in `pinned_canonical_sample_hash`.
fn sample_fields() -> ReceiptFields {
    ReceiptFieldsBuilder::default()
        .network_passphrase(PASSPHRASE_TESTNET)
        .tx_hash([0xab; 32])
        .ledger(12_345)
        .seller(SELLER)
        .payer(PAYER)
        .amount_stroops(100_000_000) // 10 XLM
        .asset(Asset::native())
        .memo(MEMO)
        .invoice_id(INVOICE_ID)
        .build()
        .expect("sample fields are complete")
}

#[test]
fn same_inputs_yield_identical_hash() {
    let domain = DomainSeparator::quittance_v1();
    let a = compute(&domain, &sample_fields());
    let b = compute(&domain, &sample_fields());
    assert_eq!(a, b);
}

#[test]
fn repeated_compute_matches_each_call() {
    let domain = DomainSeparator::quittance_v1();
    let first = compute(&domain, &sample_fields()).to_hex();
    for iteration in 0..10 {
        let got = compute(&domain, &sample_fields()).to_hex();
        assert_eq!(first, got, "iteration {iteration} drifted");
    }
}

#[test]
fn hash_is_32_bytes() {
    let domain = DomainSeparator::quittance_v1();
    let h = compute(&domain, &sample_fields());
    assert_eq!(h.as_bytes().len(), 32);
}

#[test]
fn hex_is_64_lowercase_hex_chars() {
    let domain = DomainSeparator::quittance_v1();
    let hex = compute(&domain, &sample_fields()).to_hex();
    assert_eq!(hex.len(), 64);
    for c in hex.chars() {
        assert!(
            matches!(c, '0'..='9' | 'a'..='f'),
            "non lowercase-hex char: {c:?}"
        );
    }
}

#[test]
fn display_matches_to_hex() {
    let domain = DomainSeparator::quittance_v1();
    let h = compute(&domain, &sample_fields());
    assert_eq!(format!("{}", h), h.to_hex());
}

/// Pinned regression vector.
///
/// The exact hash of `sample_fields()` under the default
/// `DomainSeparator::quittance_v1()`. If this hash ever changes, the SHA-256
/// preimage encoding has drifted: every byte of the readme spec must be
/// re-confirmed and the changelog must explain why. Re-derive this hex by
/// running `cargo run --example canonical_sample`.
#[test]
fn pinned_canonical_sample_hash() {
    let domain = DomainSeparator::quittance_v1();
    let hex = compute(&domain, &sample_fields()).to_hex();
    assert_eq!(
        hex,
        "45d16a23e4b9492ccd2d36951094398064db488e804d2e975f0222c4fdde8e31"
    );
}

#[test]
fn builders_and_direct_construction_have_same_hash() {
    let domain = DomainSeparator::quittance_v1();
    let via_builder = compute(&domain, &sample_fields());

    let direct = ReceiptFields {
        network_passphrase: PASSPHRASE_TESTNET.to_string(),
        tx_hash: [0xab; 32],
        ledger: 12_345,
        seller: SELLER.to_string(),
        payer: PAYER.to_string(),
        amount_stroops: 100_000_000,
        asset: Asset::native(),
        memo: Some(MEMO.to_string()),
        invoice_id: Some(INVOICE_ID.to_string()),
    };
    let via_direct = compute(&domain, &direct);
    assert_eq!(via_builder, via_direct);
}
