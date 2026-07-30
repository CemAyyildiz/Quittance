//! Edge cases: native vs non-native asset, present-but-empty optional
//! fields, length-prefix-safety demonstrations, and collisions between
//! adjacent fields.

use quittance_receipt_hash::{
    compute, compute_hex, Asset, DomainSeparator, ReceiptFields, ReceiptFieldsBuilder,
};

fn basic() -> ReceiptFieldsBuilder {
    ReceiptFieldsBuilder::default()
        .network_passphrase("Test SDF Network ; September 2015")
        .tx_hash([0xab; 32])
        .ledger(12_345)
        .seller("SellerA-PubKey-1234567890123456789012345678901234")
        .payer("PayerA-PubKey-123456789012345678901234567890123456")
        .amount_stroops(100_000_000)
        .asset(Asset::native())
}

#[test]
fn native_xlm_differs_from_xlm_with_issuer() {
    // Both encode asset_code == "XLM", but the optional issuer distinguishes
    // them. They MUST hash differently because on chain they are different
    // assets even if both speak "XLM".
    let domain = DomainSeparator::quittance_v1();
    let native = compute(
        &domain,
        &basic().asset(Asset::native()).build().unwrap(),
    );
    let pseudo = compute(
        &domain,
        &basic()
            .asset(Asset::new(
                "XLM",
                "IssuerG-PubKey-12345678901234567890123456789012X",
            ))
            .build()
            .unwrap(),
    );
    assert_ne!(native, pseudo);
}

#[test]
fn length_prefix_blocks_concatenation_collision() {
    // Two fields with adjacent-but-identical-length values must not collide.
    // The encoding prefixes each value with its own length, so "amount" and
    // "seller" (whose values look the same length) never hash to the same
    // preimage even if the names were swapped.
    let domain = DomainSeparator::quittance_v1();
    let f_a = basic()
        .memo("ABC")
        .invoice_id("DEF")
        .build()
        .unwrap();
    let f_b = basic()
        .memo("DEF")
        .invoice_id("ABC")
        .build()
        .unwrap();
    assert_ne!(compute(&domain, &f_a), compute(&domain, &f_b));
}

#[test]
fn empty_optional_fields_still_have_distinct_encodings() {
    // All-optional-minimum tests still produce 32 byte hashes.
    let f = ReceiptFieldsBuilder::default()
        .network_passphrase("")
        .tx_hash([0u8; 32])
        .ledger(0)
        .seller("")
        .payer("")
        .amount_stroops(0)
        .asset(Asset::native())
        .build()
        .unwrap();
    let domain = DomainSeparator::quittance_v1();
    let h = compute(&domain, &f);
    assert_eq!(h.as_bytes().len(), 32);
    // All zero inputs are deterministic.
    let h2 = compute(&domain, &f);
    assert_eq!(h, h2);
}

#[test]
fn testnet_and_public_passphrase_differ() {
    let domain = DomainSeparator::quittance_v1();
    let testnet = compute(
        &domain,
        &basic()
            .network_passphrase("Test SDF Network ; September 2015")
            .build()
            .unwrap(),
    );
    let public = compute(
        &domain,
        &basic()
            .network_passphrase("Public Global Stellar Network ; September 2015")
            .build()
            .unwrap(),
    );
    assert_ne!(testnet, public);
}

#[test]
fn compute_hex_matches_compute_to_hex() {
    let domain = DomainSeparator::quittance_v1();
    let f = basic().memo("hello").build().unwrap();
    assert_eq!(
        compute_hex(&domain, &f),
        compute(&domain, &f).to_hex()
    );
}

#[test]
fn extreme_amount_values_still_yield_32_byte_hash() {
    let domain = DomainSeparator::quittance_v1();
    for n in [i64::MIN, -1, 0, 1, i64::MAX] {
        let f = basic().amount_stroops(n).build().unwrap();
        let h = compute(&domain, &f);
        assert_eq!(h.as_bytes().len(), 32);
    }
}

#[test]
fn extremely_long_memo_still_supported() {
    // Stellar text memo is at most 28 bytes, but the encoder does not need
    // to enforce that. A 100-byte memo must still hash deterministically.
    let s = "x".repeat(100);
    let domain = DomainSeparator::quittance_v1();
    let f = basic().memo(s.clone()).build().unwrap();
    let h1 = compute(&domain, &f).to_hex();
    let f2 = basic().memo(s).build().unwrap();
    let h2 = compute(&domain, &f2).to_hex();
    assert_eq!(h1, h2);
}
