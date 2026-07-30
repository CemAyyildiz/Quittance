//! Print the SHA-256 of the canonical Quittance sample receipt so the
//! hex digest can be frozen as a pinned test vector.
//!
//! The fields here mirror `tests/stability.rs::sample_fields()` exactly
//! (cross-reference note in that file). Run with
//! `cargo run --example canonical_sample` and update the assertion in
//! `pinned_canonical_sample_hash` if you intentionally change the
//! encoding.

use quittance_receipt_hash::{
    compute_hex, Asset, DomainSeparator, ReceiptFieldsBuilder,
};

fn main() {
    let fields = ReceiptFieldsBuilder::default()
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
        .expect("sample fields are complete");
    let domain = DomainSeparator::quittance_v1();
    println!("{}", compute_hex(&domain, &fields));
}
