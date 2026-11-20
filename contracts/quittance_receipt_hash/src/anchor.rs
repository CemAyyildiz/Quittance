//! On-chain anchor record for a paid Quittance receipt.
//!
//! The hash module computes a canonical digest for a receipt; this module is
//! the write-side of the same crate: it defines the single record a Soroban
//! contract stores for an invoice and the rules for writing it. Reusing the
//! crate keeps the digest and the anchor on the same wire format — no second
//! crate and no second hashing implementation.
//!
//! A Soroban deployment can expose the rules below as:
//!
//! ```text
//! anchor(env, invoice_id: String, digest: Bytes) -> Result<(), Error>
//! ```
//!
//! where `Error` maps one-to-one onto [`AnchorError`]. The seller's address
//! must authorize that host-function call; the server never holds a key.

use std::collections::BTreeMap;

/// Fixed byte length of the canonical SHA-256 digest.
pub const DIGEST_LEN: usize = 32;

/// Errors returned when an anchor is written.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnchorError {
    /// The invoice is not in the PAID state yet.
    InvoiceNotPaid,
    /// This invoice already has an anchor; anchors are one-shot.
    AlreadyAnchored,
    /// The submitted digest is not the canonical digest of the invoice.
    DigestMismatch,
    /// The digest is not 32 bytes of hexadecimal.
    InvalidDigest,
}

impl core::fmt::Display for AnchorError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let message = match self {
            AnchorError::InvoiceNotPaid => "invoice is not paid",
            AnchorError::AlreadyAnchored => "invoice already has an anchor",
            AnchorError::DigestMismatch => "digest does not match the invoice",
            AnchorError::InvalidDigest => "digest must be 32 bytes of hex",
        };
        f.write_str(message)
    }
}

impl std::error::Error for AnchorError {}

/// The immutable record written on chain: invoice id plus canonical digest.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReceiptAnchor {
    /// Quittance invoice UUID the proof belongs to.
    pub invoice_id: String,
    /// Canonical 32-byte receipt digest.
    pub digest: [u8; DIGEST_LEN],
}

impl ReceiptAnchor {
    /// Build an anchor from an invoice id and a lowercase/uppercase hex digest.
    pub fn new(invoice_id: impl Into<String>, digest_hex: &str) -> Result<Self, AnchorError> {
        let raw = hex::decode(digest_hex).map_err(|_| AnchorError::InvalidDigest)?;
        if raw.len() != DIGEST_LEN {
            return Err(AnchorError::InvalidDigest);
        }
        let mut digest = [0u8; DIGEST_LEN];
        digest.copy_from_slice(&raw);
        Ok(Self {
            invoice_id: invoice_id.into(),
            digest,
        })
    }

    /// Lowercase hex representation of the anchored digest.
    pub fn digest_hex(&self) -> String {
        hex::encode(self.digest)
    }
}

/// Minimal append-once store mirroring the Soroban instance-storage rules.
#[derive(Debug, Default)]
pub struct AnchorStore {
    anchors: BTreeMap<String, ReceiptAnchor>,
}

impl AnchorStore {
    /// Create an empty store.
    pub fn new() -> Self {
        Self::default()
    }

    /// Write one anchor for a paid invoice.
    ///
    /// The digest is checked against the invoice's canonical digest *before*
    /// anything is stored (the off-chain equivalent of rejecting before
    /// signing). A second anchor for the same invoice is always rejected.
    pub fn anchor(
        &mut self,
        invoice_id: &str,
        digest_hex: &str,
        canonical_digest_hex: &str,
        is_paid: bool,
    ) -> Result<ReceiptAnchor, AnchorError> {
        if !is_paid {
            return Err(AnchorError::InvoiceNotPaid);
        }
        if self.anchors.contains_key(invoice_id) {
            return Err(AnchorError::AlreadyAnchored);
        }
        if digest_hex.trim().to_ascii_lowercase() != canonical_digest_hex.to_ascii_lowercase() {
            return Err(AnchorError::DigestMismatch);
        }
        let record = ReceiptAnchor::new(invoice_id, digest_hex)?;
        self.anchors.insert(invoice_id.to_string(), record.clone());
        Ok(record)
    }

    /// Read the anchor recorded for an invoice, if any.
    pub fn get(&self, invoice_id: &str) -> Option<&ReceiptAnchor> {
        self.anchors.get(invoice_id)
    }

    /// Number of invoices anchored so far.
    pub fn len(&self) -> usize {
        self.anchors.len()
    }

    /// Whether no invoice has been anchored yet.
    pub fn is_empty(&self) -> bool {
        self.anchors.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const DIGEST: &str = "45d16a23e4b9492ccd2d36951094398064db488e804d2e975f0222c4fdde8e31";

    #[test]
    fn anchors_a_paid_invoice_with_the_canonical_digest() {
        let mut store = AnchorStore::new();
        let record = store
            .anchor("11111111-1111-1111-1111-111111111111", DIGEST, DIGEST, true)
            .expect("anchoring a paid invoice must succeed");
        assert_eq!(record.digest_hex(), DIGEST);
        assert_eq!(store.len(), 1);
        assert_eq!(
            store.get("11111111-1111-1111-1111-111111111111"),
            Some(&record)
        );
    }

    #[test]
    fn refuses_a_second_anchor_for_the_same_invoice() {
        let mut store = AnchorStore::new();
        store.anchor("inv-1", DIGEST, DIGEST, true).unwrap();
        assert_eq!(
            store.anchor("inv-1", DIGEST, DIGEST, true),
            Err(AnchorError::AlreadyAnchored)
        );
        assert_eq!(store.len(), 1);
    }

    #[test]
    fn refuses_a_mismatched_digest() {
        let mut store = AnchorStore::new();
        let wrong = "00".repeat(32);
        assert_eq!(
            store.anchor("inv-1", &wrong, DIGEST, true),
            Err(AnchorError::DigestMismatch)
        );
        assert!(store.is_empty());
    }

    #[test]
    fn refuses_an_unpaid_invoice() {
        let mut store = AnchorStore::new();
        assert_eq!(
            store.anchor("inv-1", DIGEST, DIGEST, false),
            Err(AnchorError::InvoiceNotPaid)
        );
    }

    #[test]
    fn rejects_a_digest_that_is_not_32_bytes() {
        let mut store = AnchorStore::new();
        assert_eq!(
            store.anchor("inv-1", "abcd", "abcd", true),
            Err(AnchorError::InvalidDigest)
        );
    }

    #[test]
    fn accepts_a_digest_produced_by_the_hash_module() {
        use crate::{compute_hex, Asset, DomainSeparator, ReceiptFieldsBuilder};

        let fields = ReceiptFieldsBuilder::default()
            .network_passphrase("Test SDF Network ; September 2015")
            .tx_hash([0xab; 32])
            .ledger(12_345)
            .seller("SellerA")
            .payer("PayerA")
            .amount_stroops(100_000_000)
            .asset(Asset::native())
            .invoice_id("inv-1")
            .build()
            .unwrap();
        let digest = compute_hex(&DomainSeparator::quittance_v1(), &fields);

        let mut store = AnchorStore::new();
        store.anchor("inv-1", &digest, &digest, true).unwrap();
        assert_eq!(store.get("inv-1").unwrap().digest_hex(), digest);
    }
}
