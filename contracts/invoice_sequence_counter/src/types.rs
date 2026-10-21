//! Seller identity and the error / verdict types for sequence checks.

use std::fmt;

/// First sequence number issued for a seller that has none yet.
pub const FIRST_SEQUENCE: u64 = 1;

/// A non-empty seller id.
///
/// On chain this is a Soroban `Address`. This crate stores the same
/// identity as a UTF-8 string so the counter can run without
/// `soroban-sdk`. The string is compared byte-for-byte: no trimming,
/// no case folding.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SellerId(String);

impl SellerId {
    /// Accept `raw` when it is non-empty.
    ///
    /// # Errors
    ///
    /// Returns [`SequenceError::EmptySeller`] when `raw` is `""`.
    pub fn parse(raw: &str) -> Result<Self, SequenceError> {
        if raw.is_empty() {
            return Err(SequenceError::EmptySeller);
        }
        Ok(Self(raw.to_owned()))
    }

    /// Borrow the seller id.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Consume the id and return the owned string.
    #[must_use]
    pub fn into_string(self) -> String {
        self.0
    }
}

impl AsRef<str> for SellerId {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl fmt::Display for SellerId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Why a sequence operation was rejected.
///
/// Discriminants are stable so an off-chain caller can match the
/// numeric code without depending on the Rust name.
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
#[repr(u32)]
pub enum SequenceError {
    /// `seller` was `""`.
    EmptySeller = 1,
    /// The seller's last issued number is [`u64::MAX`], so the next
    /// number cannot be represented.
    Saturated = 2,
}

impl SequenceError {
    /// Stable English description of the error.
    #[must_use]
    pub fn message(self) -> &'static str {
        match self {
            Self::EmptySeller => "Seller id is empty.",
            Self::Saturated => "Invoice sequence is saturated at u64::MAX.",
        }
    }
}

impl fmt::Display for SequenceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.message())
    }
}

impl std::error::Error for SequenceError {}

/// How a candidate sequence compares with the number that should be
/// submitted next.
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum SequenceVerdict {
    /// `candidate` is exactly the next number (`last + 1`, or
    /// [`FIRST_SEQUENCE`] when nothing has been issued).
    Accept,
    /// `candidate` was already issued for this seller (`1..=last`).
    Collision,
    /// `candidate` is `0`, skips ahead of the next number, or no
    /// successor exists because the counter is saturated.
    OutOfOrder,
}
