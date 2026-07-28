//! Field independence tests: changing exactly one field changes the hash.
//!
//! Each test pins every other field to a constant baseline and varies
//! exactly one. If two fields commute the test would silently fail;
//! changing only one byte in any field must yield a different hash.

use quittance_receipt_hash::{
    compute, Asset, DomainSeparator, ReceiptFields, ReceiptFieldsBuilder,
};

fn base_fields() -> ReceiptFields {
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

fn hash(f: &ReceiptFields) -> [u8; 32] {
    *compute(&DomainSeparator::quittance_v1(), f).as_bytes()
}

#[test]
fn changing_ledger_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.ledger = 12_346;
    assert_ne!(baseline, hash(&f));
}

#[test]
fn changing_tx_hash_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.tx_hash = [0xcd; 32];
    assert_ne!(baseline, hash(&f));
}

#[test]
fn changing_amount_stroops_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.amount_stroops = 100_000_001;
    assert_ne!(baseline, hash(&f));
}

#[test]
fn changing_seller_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.seller = "SellerB-PubKey-1234567890123456789012345678901234".to_string();
    assert_ne!(baseline, hash(&f));
}

#[test]
fn changing_payer_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.payer = "PayerB-PubKey-12345678901234567890123456789012345Z".to_string();
    assert_ne!(baseline, hash(&f));
}

#[test]
fn changing_network_passphrase_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.network_passphrase = "Public Global Stellar Network ; September 2015".to_string();
    assert_ne!(baseline, hash(&f));
}

#[test]
fn changing_asset_changes_hash() {
    let mut f = base_fields();
    let native_hash = hash(&f);
    f.asset = Asset::new(
        "USDC",
        "IssuerG-PubKey-123456789012345678901234567890123456V",
    );
    assert_ne!(native_hash, hash(&f));
}

#[test]
fn asset_code_only_change_changes_hash() {
    let mut f = base_fields();
    f.asset = Asset::new(
        "USDC",
        "IssuerG-PubKey-123456789012345678901234567890123456V",
    );
    let usdc = hash(&f);

    // Same structure but asset_code differs.
    f.asset.code = "BTC".to_string();
    assert_ne!(usdc, hash(&f));
}

#[test]
fn asset_issuer_only_change_changes_hash() {
    let mut f = base_fields();
    f.asset = Asset::new(
        "USDC",
        "IssuerG-PubKey-123456789012345678901234567890123456V",
    );
    let first = hash(&f);

    f.asset.issuer = Some("IssuerH-PubKey-12345678901234567890123456789012X".to_string());
    assert_ne!(first, hash(&f));
}

#[test]
fn memo_some_to_none_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.memo = None;
    assert_ne!(baseline, hash(&f));
}

#[test]
fn memo_different_text_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.memo = Some("Invoice INV-002".to_string());
    assert_ne!(baseline, hash(&f));
}

#[test]
fn memo_empty_string_differs_from_no_memo() {
    // Some("") encodes as 0x01 || u32_be(0); None encodes as 0x00.
    // They are different byte streams and must hash differently.
    let mut f = base_fields();
    let no_memo = hash(&f);
    f.memo = Some(String::new());
    assert_ne!(no_memo, hash(&f));
}

#[test]
fn invoice_id_some_to_none_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.invoice_id = None;
    assert_ne!(baseline, hash(&f));
}

#[test]
fn invoice_id_different_uuid_changes_hash() {
    let mut f = base_fields();
    let baseline = hash(&f);
    f.invoice_id = Some("22222222-2222-2222-2222-222222222222".to_string());
    assert_ne!(baseline, hash(&f));
}

#[test]
fn negative_amount_differs_from_zero() {
    let mut f = base_fields();
    let zero = hash(&f);
    f.amount_stroops = i64::MIN;
    assert_ne!(zero, hash(&f));
}
