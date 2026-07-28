//! Domain separator namespace for receipt hashes.
//!
//! A `DomainSeparator` is a short label that names the subsystem that
//! produced a hash commitment. Two separators with labels that differ in any
//! byte produce completely different hashes for the same proof fields.

/// Domain separator used to namespace Quittance receipt hashes.
///
/// The default separator is `Quittance/ReceiptHash/v1/STELLAR`. Callers that
/// need a different namespace (for example a future per-seller commitment)
/// can construct a custom one via [`DomainSeparator::new`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DomainSeparator {
    bytes: Vec<u8>,
}

impl DomainSeparator {
    /// Canonical default label for Quittance v1 receipt hashes.
    ///
    /// Format mirrors EIP-712 domain separator conventions:
    /// `<product> / <feature> / <version> / <network family>`.
    pub const DEFAULT_LABEL: &'static str = "Quittance/ReceiptHash/v1/STELLAR";

    /// Build a domain separator from an arbitrary label.
    pub fn new(label: &str) -> Self {
        Self { bytes: label.as_bytes().to_vec() }
    }

    /// Return the default Quittance receipt hash domain separator.
    pub fn quittance_v1() -> Self {
        Self::new(Self::DEFAULT_LABEL)
    }

    /// Raw bytes of the domain label (UTF-8).
    pub fn as_bytes(&self) -> &[u8] {
        &self.bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_stores_utf8_bytes() {
        let d = DomainSeparator::new("hello");
        assert_eq!(d.as_bytes(), b"hello");
    }

    #[test]
    fn defaults_have_expected_label() {
        assert_eq!(
            DomainSeparator::quittance_v1().as_bytes(),
            DomainSeparator::DEFAULT_LABEL.as_bytes()
        );
    }

    #[test]
    fn different_labels_produce_different_bytes() {
        assert_ne!(
            DomainSeparator::new("a").as_bytes(),
            DomainSeparator::new("b").as_bytes()
        );
    }
}
