//! Pure cap arithmetic, kept free of `Env` so it can be unit-tested on the
//! host target without a contract instance.

use crate::types::InvoiceCapError;

/// Validate that a cap value is usable.
///
/// A cap of zero would immediately reject every `record_invoice` call, which
/// is almost certainly a misconfiguration.
pub fn validate_cap(cap: u32) -> Result<(), InvoiceCapError> {
    if cap == 0 {
        Err(InvoiceCapError::ZeroCap)
    } else {
        Ok(())
    }
}

/// Attempt to advance `current` by one, respecting `cap`.
///
/// Returns the new count on success, or [`InvoiceCapError::CapExceeded`] when
/// `current` has already reached `cap`.
pub fn try_increment(current: u32, cap: u32) -> Result<u32, InvoiceCapError> {
    if current >= cap {
        Err(InvoiceCapError::CapExceeded)
    } else {
        // Safe: current < cap <= u32::MAX, so current + 1 cannot overflow.
        Ok(current + 1)
    }
}

/// Return how many more invoices may be created before the cap is hit.
///
/// `cap.saturating_sub(current)` avoids any possible underflow if the stored
/// count somehow exceeded the cap (which the contract prevents, but is
/// defensive here).
pub fn remaining(current: u32, cap: u32) -> u32 {
    cap.saturating_sub(current)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_cap_rejects_zero() {
        assert_eq!(validate_cap(0), Err(InvoiceCapError::ZeroCap));
    }

    #[test]
    fn validate_cap_accepts_positive() {
        assert!(validate_cap(1).is_ok());
        assert!(validate_cap(100).is_ok());
        assert!(validate_cap(u32::MAX).is_ok());
    }

    #[test]
    fn try_increment_advances_within_cap() {
        assert_eq!(try_increment(0, 5), Ok(1));
        assert_eq!(try_increment(4, 5), Ok(5));
    }

    #[test]
    fn try_increment_fails_at_cap() {
        assert_eq!(try_increment(5, 5), Err(InvoiceCapError::CapExceeded));
        assert_eq!(try_increment(10, 5), Err(InvoiceCapError::CapExceeded));
    }

    #[test]
    fn remaining_counts_down() {
        assert_eq!(remaining(0, 5), 5);
        assert_eq!(remaining(3, 5), 2);
        assert_eq!(remaining(5, 5), 0);
    }

    #[test]
    fn remaining_saturates_on_overflow() {
        // Defensive: if count somehow exceeds cap, remaining returns 0 not a
        // wrapped-around huge number.
        assert_eq!(remaining(10, 5), 0);
    }
}
