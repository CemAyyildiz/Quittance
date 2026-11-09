//! Overflow-safe difference helpers for `payment-amount-tolerance`.

/// Compute `|a - b|` for non-negative `i128` values without overflow.
#[must_use]
pub const fn abs_diff_non_negative(a: i128, b: i128) -> i128 {
    if a >= b {
        a - b
    } else {
        b - a
    }
}
