//! `paid-status` — Compact encode/decode enum for Quittance invoice
//! paid status.
//!
//! Off-chain indexers, dashboards, and (eventually) Soroban contracts
//! need to agree on a single, compact representation for an invoice's
//! payment state. This crate centralises the encodings so every
//! surface uses the **same** byte value for the same state.
//!
//! # Scope (intentionally bounded)
//!
//! - Variants: [`PaidStatus::Pending`], [`PaidStatus::Paid`],
//!   [`PaidStatus::Expired`], [`PaidStatus::Cancelled`].
//! - On-wire representation: a single `u8` per status.
//! - Encode/decode round-trip in unit tests.
//! - Reject invalid (out-of-range) byte values on decode.
//! - Stable English [`PaidStatus::message`] method mirroring
//!   `contracts/error_codes/src/lib.rs`.
//!
//! # Non-goals
//!
//! - No persistence, no contract storage, no host calls.
//! - No on-chain transition logic ("when does Pending become Paid?"):
//!   that is the consumer contract's job, and is explicitly out of
//!   scope for this crate.
//! - No additional variants beyond the four above. Adding a new
//!   variant means adding a stable `u8` discriminant here and
//!   reserving the chosen value forever to keep wire compatibility.

#![deny(unsafe_code)]
#![deny(unused_must_use)]
#![forbid(missing_docs)]

/// Compact enum for the lifecycle state of a Quittance invoice.
///
/// Each variant is mapped to a **stable** `u8` discriminant (see
/// [`PaidStatus::discriminant`]). The discriminants are part of the
/// public ABI of this crate: they are intended to be written to disk,
/// passed across the wire, and (eventually) embedded in Soroban
/// storage. They must not be renumbered or reused.
#[derive(Debug, Copy, Clone, Eq, PartialEq, Hash)]
#[repr(u8)]
pub enum PaidStatus {
    /// The invoice has been issued but no payment has been confirmed.
    Pending = 0,
    /// A payment matching the invoice's memo, amount, and destination
    /// has been confirmed on the ledger.
    Paid = 1,
    /// The invoice's settlement window has elapsed without a matching
    /// payment being confirmed.
    Expired = 2,
    /// The invoice was cancelled by the seller before settlement.
    Cancelled = 3,
}

impl PaidStatus {
    /// Return the stable `u8` discriminant for this status.
    ///
    /// This is the single source of truth for the wire format. Any
    /// off-chain persister and any future on-chain consumer must use
    /// the value returned here, never a hand-written literal.
    #[inline]
    pub const fn discriminant(self) -> u8 {
        self as u8
    }

    /// Decode a `u8` byte into a [`PaidStatus`] variant.
    ///
    /// - Returns `Ok(_)` for the four canonical discriminants
    ///   (`0..=3`).
    /// - Returns `Err(InvalidStatus { got })` for any value outside
    ///   that range. The `got` field is the offending byte so
    ///   callers can log or surface the exact offending value
    ///   instead of a generic "invalid status" string.
    pub const fn from_discriminant(byte: u8) -> Result<Self, InvalidStatus> {
        match byte {
            0 => Ok(PaidStatus::Pending),
            1 => Ok(PaidStatus::Paid),
            2 => Ok(PaidStatus::Expired),
            3 => Ok(PaidStatus::Cancelled),
            other => Err(InvalidStatus { got: other }),
        }
    }

    /// Return a stable English message describing the status.
    ///
    /// Mirrors the convention in
    /// `contracts/error_codes/src/lib.rs`'s `message()` method:
    /// static English strings for developer tooling, logs, and
    /// off-chain metadata consumers. Not user-facing UI strings.
    pub fn message(&self) -> &'static str {
        match self {
            PaidStatus::Pending => "Invoice has been issued but no payment has been confirmed.",
            PaidStatus::Paid => "Payment confirmed on the ledger.",
            PaidStatus::Expired => "Settlement window elapsed without a confirmed payment.",
            PaidStatus::Cancelled => "Invoice cancelled by seller before settlement.",
        }
    }

    /// Returns `true` if this status represents a **terminal** state.
    ///
    /// Terminal states cannot transition to any other state. By
    /// construction:
    /// - `Paid` is terminal: a paid invoice is settled.
    /// - `Expired` is terminal: the window has elapsed.
    /// - `Cancelled` is terminal: the seller cancelled it.
    /// - `Pending` is **not** terminal: it can still become Paid,
    ///   Expired, or Cancelled.
    pub const fn is_terminal(self) -> bool {
        !matches!(self, PaidStatus::Pending)
    }
}

/// Error returned by [`PaidStatus::from_discriminant`] when a byte
/// outside the canonical range (`0..=3`) is presented as a status.
///
/// The struct carries the offending byte so calling code can log
/// the exact invalid value rather than a generic "decode failed"
/// message.
#[derive(Debug, Copy, Clone, Eq, PartialEq)]
pub struct InvalidStatus {
    /// The `u8` value that `from_discriminant` could not map to a
    /// valid `PaidStatus` variant.
    pub got: u8,
}

impl InvalidStatus {
    /// Static English message describing the error.
    pub fn message(&self) -> String {
        format!("Invalid paid-status discriminant: {}.", self.got)
    }
}

impl core::fmt::Display for InvalidStatus {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "invalid paid-status discriminant: {}", self.got)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── discriminants are the canonical values ──────────────────────

    #[test]
    fn pending_is_zero() {
        assert_eq!(PaidStatus::Pending.discriminant(), 0);
    }

    #[test]
    fn paid_is_one() {
        assert_eq!(PaidStatus::Paid.discriminant(), 1);
    }

    #[test]
    fn expired_is_two() {
        assert_eq!(PaidStatus::Expired.discriminant(), 2);
    }

    #[test]
    fn cancelled_is_three() {
        assert_eq!(PaidStatus::Cancelled.discriminant(), 3);
    }

    #[test]
    fn discriminants_are_unique() {
        let mut seen = std::collections::BTreeSet::new();
        let statuses = [
            PaidStatus::Pending,
            PaidStatus::Paid,
            PaidStatus::Expired,
            PaidStatus::Cancelled,
        ];
        for s in statuses {
            let n = s.discriminant();
            assert!(seen.insert(n), "duplicate discriminant {} for {:?}", n, s);
        }
        assert_eq!(seen.len(), 4);
    }

    #[test]
    fn discriminants_are_contiguous_and_zero_indexed() {
        // Lock the contiguous zero-indexed property so a future
        // refactor cannot accidentally create gaps in the wire
        // format.
        let mut values: Vec<u8> = [
            PaidStatus::Pending,
            PaidStatus::Paid,
            PaidStatus::Expired,
            PaidStatus::Cancelled,
        ]
        .iter()
        .map(|s| s.discriminant())
        .collect();
        values.sort_unstable();
        assert_eq!(values, vec![0, 1, 2, 3]);
    }

    // ── round trips ─────────────────────────────────────────────────

    #[test]
    fn round_trip_pending() {
        let s = PaidStatus::Pending;
        let byte = s.discriminant();
        assert_eq!(PaidStatus::from_discriminant(byte), Ok(s));
    }

    #[test]
    fn round_trip_paid() {
        let s = PaidStatus::Paid;
        let byte = s.discriminant();
        assert_eq!(PaidStatus::from_discriminant(byte), Ok(s));
    }

    #[test]
    fn round_trip_expired() {
        let s = PaidStatus::Expired;
        let byte = s.discriminant();
        assert_eq!(PaidStatus::from_discriminant(byte), Ok(s));
    }

    #[test]
    fn round_trip_cancelled() {
        let s = PaidStatus::Cancelled;
        let byte = s.discriminant();
        assert_eq!(PaidStatus::from_discriminant(byte), Ok(s));
    }

    #[test]
    fn round_trip_table_exhaustive() {
        for s in [
            PaidStatus::Pending,
            PaidStatus::Paid,
            PaidStatus::Expired,
            PaidStatus::Cancelled,
        ] {
            let byte = s.discriminant();
            assert_eq!(
                PaidStatus::from_discriminant(byte),
                Ok(s),
                "round-trip failed for {:?}",
                s
            );
        }
    }

    // ── invalid discriminants ───────────────────────────────────────

    #[test]
    fn rejects_byte_four() {
        assert_eq!(
            PaidStatus::from_discriminant(4),
            Err(InvalidStatus { got: 4 })
        );
    }

    #[test]
    fn rejects_byte_255_max() {
        assert_eq!(
            PaidStatus::from_discriminant(255),
            Err(InvalidStatus { got: 255 })
        );
    }

    #[test]
    fn rejects_a_sampling_of_invalid_discriminants() {
        for byte in [4u8, 5, 7, 16, 32, 100, 127, 128, 200, 254, 255] {
            assert_eq!(
                PaidStatus::from_discriminant(byte),
                Err(InvalidStatus { got: byte }),
                "byte {} should be rejected",
                byte
            );
        }
    }

    // ── error metadata ───────────────────────────────────────────────

    #[test]
    fn invalid_status_message_contains_offending_byte() {
        let err = InvalidStatus { got: 42 };
        let msg = err.message();
        assert!(
            msg.contains("42"),
            "message {:?} should mention offending byte 42",
            msg
        );
        assert!(
            msg.ends_with('.'),
            "message {:?} should end with a period",
            msg
        );
    }

    #[test]
    fn invalid_status_display_format_is_stable() {
        let err = InvalidStatus { got: 7 };
        assert_eq!(format!("{}", err), "invalid paid-status discriminant: 7");
    }

    // ── messages ─────────────────────────────────────────────────────

    #[test]
    fn every_variant_has_non_empty_message() {
        for s in [
            PaidStatus::Pending,
            PaidStatus::Paid,
            PaidStatus::Expired,
            PaidStatus::Cancelled,
        ] {
            assert!(!s.message().is_empty(), "{:?} message must be non-empty", s);
        }
    }

    #[test]
    fn every_message_ends_with_period() {
        for s in [
            PaidStatus::Pending,
            PaidStatus::Paid,
            PaidStatus::Expired,
            PaidStatus::Cancelled,
        ] {
            assert!(
                s.message().ends_with('.'),
                "{:?} message {:?} must end with a period",
                s,
                s.message()
            );
        }
    }

    #[test]
    fn message_string_matches_expected() {
        assert_eq!(
            PaidStatus::Pending.message(),
            "Invoice has been issued but no payment has been confirmed."
        );
        assert_eq!(PaidStatus::Paid.message(), "Payment confirmed on the ledger.");
        assert_eq!(
            PaidStatus::Expired.message(),
            "Settlement window elapsed without a confirmed payment."
        );
        assert_eq!(
            PaidStatus::Cancelled.message(),
            "Invoice cancelled by seller before settlement."
        );
    }

    // ── is_terminal ──────────────────────────────────────────────────

    #[test]
    fn pending_is_not_terminal() {
        assert!(!PaidStatus::Pending.is_terminal());
    }

    #[test]
    fn paid_is_terminal() {
        assert!(PaidStatus::Paid.is_terminal());
    }

    #[test]
    fn expired_is_terminal() {
        assert!(PaidStatus::Expired.is_terminal());
    }

    #[test]
    fn cancelled_is_terminal() {
        assert!(PaidStatus::Cancelled.is_terminal());
    }

    #[test]
    fn terminal_classification_is_inverse_of_pending() {
        for s in [
            PaidStatus::Pending,
            PaidStatus::Paid,
            PaidStatus::Expired,
            PaidStatus::Cancelled,
        ] {
            let is_pending = matches!(s, PaidStatus::Pending);
            let is_terminal = s.is_terminal();
            assert_ne!(is_pending, is_terminal, "{:?}", s);
        }
    }
}
