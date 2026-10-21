//! Pure counter arithmetic, kept free of `Env` so it can be unit-tested on the
//! host target without a contract instance.

use crate::types::{CounterError, FIRST_RECEIPT_NO};

/// Compute the next receipt number for a counter that currently sits at
/// `current`.
///
/// Receipt numbers are 1-based: the counter starts at `0` ("nothing issued
/// yet") and the first call returns [`FIRST_RECEIPT_NO`].
///
/// Returns [`CounterError::CounterOverflow`] when `current` is already
/// `u64::MAX`, because there is no representable successor.
pub fn next_after(current: u64) -> Result<u64, CounterError> {
    current.checked_add(1).ok_or(CounterError::CounterOverflow)
}

/// Validate a seed value for a fresh counter.
///
/// A counter must start at zero — a non-zero seed would let a seller skip
/// receipt numbers and break the "every receipt is accounted for" guarantee.
pub fn validate_seed(seed: u64) -> Result<(), CounterError> {
    if seed == 0 {
        Ok(())
    } else {
        Err(CounterError::InvalidSeed)
    }
}

/// The receipt number a counter at `current` will issue next.
///
/// Equivalent to `next_after` but expressed in terms of the value that is
/// about to be handed out, which is what callers usually want to reason about.
pub fn upcoming(current: u64) -> Result<u64, CounterError> {
    let next = next_after(current)?;
    if next < FIRST_RECEIPT_NO {
        return Err(CounterError::InvalidSeed);
    }
    Ok(next)
}
