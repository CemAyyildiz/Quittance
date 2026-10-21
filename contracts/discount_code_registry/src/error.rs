//! Failures returned by registration and redemption.

use std::fmt;

/// Error from [`crate::DiscountRegistry`].
///
/// Registration and redemption never report failure as `Ok(false)`. Each
/// rejected call returns one of these variants.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiscountError {
    /// `caller` is not the admin stored on the registry.
    Unauthorized,
    /// `DiscountRegistry::new` was given an empty admin address.
    EmptyAdmin,
    /// The code was `""`.
    EmptyCode,
    /// The code was longer than [`crate::MAX_CODE_LEN`] characters.
    CodeTooLong,
    /// The code contained a character outside `A-Z` and `0-9`.
    InvalidCharset,
    /// `max_uses` was `0`. A registered code must allow at least one redemption.
    InvalidMaxUses,
    /// This code is already present in the ledger.
    AlreadyExists,
    /// No ledger row exists for this code.
    NotFound,
    /// `now` is strictly greater than the code's `expires_at`.
    Expired,
    /// The code has already been redeemed `max_uses` times.
    Exhausted,
}

impl DiscountError {
    fn message(self) -> &'static str {
        match self {
            Self::Unauthorized => "caller is not the registry admin",
            Self::EmptyAdmin => "admin address must be non-empty",
            Self::EmptyCode => "discount code must be non-empty",
            Self::CodeTooLong => "discount code exceeds 32 characters",
            Self::InvalidCharset => "discount code must match [A-Z0-9]",
            Self::InvalidMaxUses => "max_uses must be at least 1",
            Self::AlreadyExists => "discount code is already registered",
            Self::NotFound => "discount code was not found",
            Self::Expired => "discount code is expired",
            Self::Exhausted => "discount code has no remaining uses",
        }
    }
}

impl fmt::Display for DiscountError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.message())
    }
}

impl std::error::Error for DiscountError {}
