//! SHA-256 receipt hash computation and the `ReceiptHash` value type.

use sha2::{Digest, Sha256};

use crate::domain::DomainSeparator;
use crate::encoding::build_preimage;
use crate::receipt::ReceiptFields;

/// 32-byte SHA-256 receipt hash.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ReceiptHash([u8; 32]);

impl ReceiptHash {
    /// Raw bytes of the hash.
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }

    /// Lowercase hex encoding of the hash (64 characters).
    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }
}

impl core::fmt::Display for ReceiptHash {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(&self.to_hex())
    }
}

/// Compute the domain-separated SHA-256 receipt hash for the given proof
/// fields under the given domain separator.
///
/// Calling this twice with byte-identical inputs always yields equal hashes;
/// using two different domain separators for the same fields yields two
/// different hashes.
pub fn compute(domain: &DomainSeparator, fields: &ReceiptFields) -> ReceiptHash {
    let preimage = build_preimage(domain, fields);
    let mut hasher = Sha256::new();
    hasher.update(&preimage);
    let digest = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(digest.as_slice());
    ReceiptHash(out)
}

/// Convenience wrapper around [`compute`] that returns the lowercase hex
/// string (64 chars).
pub fn compute_hex(domain: &DomainSeparator, fields: &ReceiptFields) -> String {
    compute(domain, fields).to_hex()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::receipt::{Asset, ReceiptFieldsBuilder};

    fn sample() -> ReceiptFields {
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
    fn hash_is_32_bytes() {
        let h = compute(&DomainSeparator::quittance_v1(), &sample());
        assert_eq!(h.as_bytes().len(), 32);
    }

    #[test]
    fn hex_is_64_chars() {
        let hex = compute_hex(&DomainSeparator::quittance_v1(), &sample());
        assert_eq!(hex.len(), 64);
    }
}
