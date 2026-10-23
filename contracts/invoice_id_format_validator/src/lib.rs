#![no_std]

//! Standalone Soroban contract: invoice id format & checksum validator.
//!
//! Pure, allocation-free validator enforcing a fixed invoice id convention:
//!
//! ```text
//! INV <10-digit body> <2-digit mod-97 checksum>   (15 ASCII bytes total)
//! ```
//!
//! Anything that does not match — wrong prefix, wrong length, non-digit
//! bytes, or a checksum that does not verify — is rejected. The core
//! validation runs over borrowed byte slices on a fixed stack buffer, so no
//! heap allocation happens on-chain.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `is_valid_invoice_id(id)` | `fn(Env, String) -> bool` | Full format + checksum check. |
//! | `checksum_digit(digits)` | `fn(Env, String) -> Result<u32, Error>` | Mod-97 checksum of a digit string. |
//!
//! The pure `&str` primitives ([`is_valid_invoice_id`], [`checksum_digit`])
//! and the convention constants ([`PREFIX`], [`BODY_LEN`], [`CHECKSUM_LEN`],
//! [`ID_LEN`]) are exported for off-chain use.
//!
//! This crate is standalone: it is not a member of the root
//! `contracts/Cargo.toml` workspace and is not wired into the frontend,
//! backend, or any other contract.

mod checksum;
mod format;
mod types;

pub use format::{
    checksum_digit, checksum_suffix, is_valid_invoice_id, BODY_LEN, CHECKSUM_LEN, ID_LEN, PREFIX,
};
pub use types::Error;

use soroban_sdk::{contract, contractimpl, Env, String};

/// Maximum input length accepted by the contract wrapper, in bytes.
///
/// Long enough for any well-formed id (`ID_LEN == 15`) plus headroom for
/// off-chain callers validating longer digit strings with `checksum_digit`.
const MAX_INPUT_BYTES: usize = 64;

/// Why copying a host `String` onto the stack buffer failed.
enum CopyError {
    /// The string was longer than [`MAX_INPUT_BYTES`].
    TooLong,
    /// The string contained a non-ASCII byte.
    NonAscii,
}

/// Invoice id format & checksum validator contract.
#[contract]
pub struct InvoiceIdFormatValidator;

#[contractimpl]
impl InvoiceIdFormatValidator {
    /// Return whether `id` matches the fixed invoice id convention:
    /// `INV` prefix, exactly 10 ASCII digit body, and a trailing 2-digit
    /// mod-97 checksum over the body. Any mismatch — prefix, length,
    /// non-digit bytes, or bad checksum — returns `false`.
    pub fn is_valid_invoice_id(_env: Env, id: String) -> bool {
        let mut buf = [0u8; MAX_INPUT_BYTES];
        match copy_ascii(&id, &mut buf) {
            Ok(len) => format::is_valid_invoice_id_bytes(&buf[..len]),
            Err(_) => false,
        }
    }

    /// Return the mod-97 checksum digit (`0..=96`) of a pure digit string.
    ///
    /// Errors with [`Error::TooLong`] when the input exceeds
    /// [`MAX_INPUT_BYTES`], and [`Error::NonDigitChars`] when it contains
    /// anything outside ASCII `0`-`9`.
    pub fn checksum_digit(_env: Env, digits: String) -> Result<u32, Error> {
        let mut buf = [0u8; MAX_INPUT_BYTES];
        match copy_ascii(&digits, &mut buf) {
            Ok(len) => checksum::checksum_digit(&buf[..len])
                .map(u32::from)
                .ok_or(Error::NonDigitChars),
            Err(CopyError::TooLong) => Err(Error::TooLong),
            Err(CopyError::NonAscii) => Err(Error::NonDigitChars),
        }
    }
}

/// Copy a host `String` into a fixed stack buffer, validating ASCII.
///
/// The host `String` carries its own env internally, so no `Env` is needed
/// for the copy.
fn copy_ascii(s: &String, buf: &mut [u8; MAX_INPUT_BYTES]) -> Result<usize, CopyError> {
    let len = s.len() as usize;
    if len > buf.len() {
        return Err(CopyError::TooLong);
    }
    s.copy_into_slice(&mut buf[..len]);
    if !buf[..len].iter().all(u8::is_ascii) {
        return Err(CopyError::NonAscii);
    }
    Ok(len)
}
