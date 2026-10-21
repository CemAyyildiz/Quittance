//! Happy-path case: a single valid extension succeeds.

use invoice_expiry_extend::ExpiryExtender;

#[test]
fn a_valid_extension_succeeds() {
    let mut extender = ExpiryExtender::new();
    let result = extender.extend_expiry("INV-1", "GISSUER", 1_000, 2_000);

    assert!(result.is_ok());
}

#[test]
fn the_invoice_is_reported_as_extended_afterwards() {
    let mut extender = ExpiryExtender::new();
    extender.extend_expiry("INV-1", "GISSUER", 1_000, 2_000).unwrap();

    assert!(extender.has_been_extended("INV-1"));
}

#[test]
fn an_unrelated_invoice_is_not_affected() {
    let mut extender = ExpiryExtender::new();
    extender.extend_expiry("INV-1", "GISSUER", 1_000, 2_000).unwrap();

    assert!(!extender.has_been_extended("INV-2"));
}
