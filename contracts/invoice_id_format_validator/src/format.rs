//! The fixed invoice id convention enforced by this crate.
//!
//! A Quittance invoice id is exactly [`ID_LEN`] ASCII bytes:
//!
//! ```text
//! INV <10-digit body> <2-digit mod-97 checksum>
//! ```
//!
//! - The prefix is the literal uppercase `INV` ([`PREFIX`]).
//! - The body is exactly [`BODY_LEN`] ASCII digits.
//! - The checksum is the decimal value of [`crate::checksum::checksum_digit`]
//!   over the body, zero-padded to [`CHECKSUM_LEN`] digits.
//!
//! The checksum is computed with a streaming mod-97 reduction (the same
//! technique IBAN uses), so validation never needs big-integer math.

use crate::checksum;

/// Required literal prefix of every invoice id.
pub const PREFIX: &str = "INV";

/// Width of the numeric body, in ASCII digits.
pub const BODY_LEN: usize = 10;

/// Width of the trailing mod-97 checksum, zero-padded to two digits.
pub const CHECKSUM_LEN: usize = 2;

/// Total length of a well-formed invoice id, in bytes.
pub const ID_LEN: usize = PREFIX.len() + BODY_LEN + CHECKSUM_LEN;

/// Validate a full invoice id against the fixed convention.
pub fn is_valid_invoice_id(id: &str) -> bool {
    is_valid_invoice_id_bytes(id.as_bytes())
}

/// Byte-slice core of [`is_valid_invoice_id`], used by the contract wrapper.
pub(crate) fn is_valid_invoice_id_bytes(id: &[u8]) -> bool {
    if id.len() != ID_LEN {
        return false;
    }

    let (prefix, rest) = id.split_at(PREFIX.len());
    if prefix != PREFIX.as_bytes() {
        return false;
    }

    let (body, check) = rest.split_at(BODY_LEN);
    let Some(expected) = checksum::checksum_digit(body) else {
        return false;
    };
    let Some(got) = two_digit_value(check) else {
        return false;
    };
    got == u16::from(expected)
}

/// Compute the checksum digit for a digit string, or `None` on non-digits.
///
/// This is the public `checksum_digit(digits: &str)` primitive from the
/// issue's suggested API.
pub fn checksum_digit(digits: &str) -> Option<u8> {
    checksum::checksum_digit(digits.as_bytes())
}

/// Parse exactly two ASCII digits into their numeric value.
fn two_digit_value(bytes: &[u8]) -> Option<u16> {
    if bytes.len() != CHECKSUM_LEN || !bytes[0].is_ascii_digit() || !bytes[1].is_ascii_digit() {
        return None;
    }
    Some(u16::from(bytes[0] - b'0') * 10 + u16::from(bytes[1] - b'0'))
}

/// Build the two-digit, zero-padded checksum suffix for a digit body.
///
/// Exposed for tests and for tooling that mints invoice ids; returns `None`
/// when `body` contains a non-digit byte.
pub fn checksum_suffix(body: &str) -> Option<[u8; CHECKSUM_LEN]> {
    let value = checksum::checksum_digit(body.as_bytes())?;
    let tens = (value / 10) + b'0';
    let ones = (value % 10) + b'0';
    Some([tens, ones])
}
