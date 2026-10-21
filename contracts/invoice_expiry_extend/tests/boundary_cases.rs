//! Boundary cases around the smallest valid increase and equal values.

use invoice_expiry_extend::{ExpiryExtender, ExtendError};

#[test]
fn the_smallest_possible_increase_is_accepted() {
    let mut extender = ExpiryExtender::new();
    let result = extender.extend_expiry("INV-1", "GISSUER", 1_000, 1_001);

    assert!(result.is_ok());
}

#[test]
fn an_equal_new_expiry_is_rejected() {
    let mut extender = ExpiryExtender::new();
    let result = extender.extend_expiry("INV-1", "GISSUER", 1_000, 1_000);

    assert_eq!(result, Err(ExtendError::NewExpiryNotAfterOld));
}

#[test]
fn a_zero_old_expiry_with_any_positive_new_expiry_is_accepted() {
    let mut extender = ExpiryExtender::new();
    let result = extender.extend_expiry("INV-1", "GISSUER", 0, 1);

    assert!(result.is_ok());
}

#[test]
fn the_maximum_u64_new_expiry_is_accepted() {
    let mut extender = ExpiryExtender::new();
    let result = extender.extend_expiry("INV-1", "GISSUER", u64::MAX - 1, u64::MAX);

    assert!(result.is_ok());
}
