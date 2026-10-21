//! Failure cases: a second extension and a non-increasing expiry are both
//! rejected, and neither mutates the audit trail.

use invoice_expiry_extend::{ExpiryExtender, ExtendError};

#[test]
fn a_second_extension_on_the_same_invoice_is_rejected() {
    let mut extender = ExpiryExtender::new();
    extender.extend_expiry("INV-1", "GISSUER", 1_000, 2_000).unwrap();

    let result = extender.extend_expiry("INV-1", "GISSUER", 2_000, 3_000);

    assert_eq!(result, Err(ExtendError::AlreadyExtended));
}

#[test]
fn a_decreasing_expiry_is_rejected() {
    let mut extender = ExpiryExtender::new();
    let result = extender.extend_expiry("INV-1", "GISSUER", 2_000, 1_000);

    assert_eq!(result, Err(ExtendError::NewExpiryNotAfterOld));
}

#[test]
fn a_rejected_second_extension_does_not_overwrite_the_original_record() {
    let mut extender = ExpiryExtender::new();
    extender.extend_expiry("INV-1", "GISSUER", 1_000, 2_000).unwrap();
    let _ = extender.extend_expiry("INV-1", "GOTHER_ISSUER", 2_000, 5_000);

    let record = extender.history("INV-1").unwrap();
    assert_eq!(record.issuer, "GISSUER");
    assert_eq!(record.old_expiry, 1_000);
    assert_eq!(record.new_expiry, 2_000);
}
