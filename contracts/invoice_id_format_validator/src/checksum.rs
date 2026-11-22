//! Streaming mod-97 checksum over an ASCII digit string (IBAN-style).
//!
//! The reduction `acc = (acc * 10 + digit) % 97` consumes one digit at a
//! time, so arbitrarily long digit strings are supported with no allocation
//! and no big-integer arithmetic. The running value never exceeds
//! `96 * 10 + 9 = 969`, so a `u32` accumulator cannot overflow.

/// Compute the mod-97 checksum value (`0..=96`) over `digits`.
///
/// Returns `None` as soon as a non-ASCII-digit byte is encountered. An empty
/// slice yields `Some(0)`, the identity element of the reduction.
pub(crate) fn checksum_digit(digits: &[u8]) -> Option<u8> {
    let mut acc: u32 = 0;
    for &byte in digits {
        if !byte.is_ascii_digit() {
            return None;
        }
        acc = (acc * 10 + u32::from(byte - b'0')) % 97;
    }
    Some(acc as u8)
}
