//! Domain separation tests: changing the domain leaves proof fields
//! unchanged, but the resulting hash differs.

use quittance_receipt_hash::{
    compute, Asset, DomainSeparator, ReceiptFields, ReceiptFieldsBuilder,
};

fn sample_fields() -> ReceiptFields {
    ReceiptFieldsBuilder::default()
        .network_passphrase("Test SDF Network ; September 2015")
        .tx_hash([0xab; 32])
        .ledger(12_345)
        .seller("SellerA-PubKey-1234567890123456789012345678901234")
        .payer("PayerA-PubKey-123456789012345678901234567890123456")
        .amount_stroops(100_000_000)
        .asset(Asset::native())
        .memo("Invoice INV-001")
        .invoice_id("11111111-1111-1111-1111-111111111111")
        .build()
        .unwrap()
}

#[test]
fn default_helper_matches_explicit_label() {
    let fields = sample_fields();
    let a = compute(&DomainSeparator::quittance_v1(), &fields);
    let b = compute(
        &DomainSeparator::new("Quittance/ReceiptHash/v1/STELLAR"),
        &fields,
    );
    assert_eq!(a, b, "quittance_v1() must equal the literal default label");
}

#[test]
fn differing_unrelated_label_changes_hash() {
    let fields = sample_fields();
    let a = compute(&DomainSeparator::quittance_v1(), &fields);
    let b = compute(
        &DomainSeparator::new("Quittance/OtherSubsystem/v1"),
        &fields,
    );
    assert_ne!(
        a, b,
        "two semantically different domain labels must produce different hashes"
    );
}

#[test]
fn single_byte_difference_in_label_changes_hash() {
    let fields = sample_fields();
    let a = compute(
        &DomainSeparator::new("Quittance/ReceiptHash/v1/STELLAR"),
        &fields,
    );
    let b = compute(
        &DomainSeparator::new("Quittance/ReceiptHash/v1/STELLAS"),
        &fields,
    );
    assert_ne!(a, b);
}

#[test]
fn version_bump_in_label_changes_hash() {
    let fields = sample_fields();
    let v1 = compute(
        &DomainSeparator::new("Quittance/ReceiptHash/v1/STELLAR"),
        &fields,
    );
    let v2 = compute(
        &DomainSeparator::new("Quittance/ReceiptHash/v2/STELLAR"),
        &fields,
    );
    assert_ne!(v1, v2);
}

#[test]
fn label_extensions_change_hash() {
    let fields = sample_fields();
    let base = compute(&DomainSeparator::new("Quittance"), &fields);
    let extended = compute(&DomainSeparator::new("Quittance/ReceiptHash"), &fields);
    assert_ne!(base, extended);
}

#[test]
fn empty_label_produces_some_hash() {
    let fields = sample_fields();
    let h = compute(&DomainSeparator::new(""), &fields);
    assert_eq!(h.as_bytes().len(), 32);
}
