//! `quittance-status-transitions`
//!
//! Pure helpers for validating invoice-status transitions in the Quittance
//! protocol. Every Quittance invoice moves through a well-defined lifecycle,
//! and this crate codifies which transitions are legal so that every layer
//! (smart contract, off-chain worker, API, dashboard) enforces the same rules.
//!
//! # Scope (intentionally bounded)
//!
//! - Defines the four canonical invoice statuses: `Pending`, `Paid`,
//!   `Expired`, and `Cancelled`.
//! - Exposes a const transition table (`ALLOWED_TRANSITIONS`) that
//!   lists every valid `(from, to)` pair.
//! - Provides `is_allowed` and `allowed_targets` for runtime checks.
//! - No I/O. No storage. No network calls. No Soroban host calls.
//!   This crate is deliberately dependency-free so it can be reused
//!   inside Soroban contracts, off-chain workers, and frontend WASM.
//!
//! # Transition model
//!
//! ```text
//!                  ┌──────────┐
//!                  │  Pending │
//!                  └────┬─────┘
//!          ┌────────────┼────────────┐
//!          ▼            ▼            ▼
//!   ┌──────────┐ ┌──────────┐ ┌────────────┐
//!   │   Paid   │ │ Expired  │ │ Cancelled  │
//!   └──────────┘ └──────────┘ └────────────┘
//!     TERMINAL      TERMINAL      TERMINAL
//! ```
//!
//! - **Pending** is the only non-terminal status. From `Pending` an
//!   invoice may transition to exactly one of the three terminal statuses.
//! - **Paid** is irreversible — once payment settles on-chain, the
//!   invoice is permanently paid.
//! - **Expired** is irreversible — once the expiry deadline passes
//!   without payment, the invoice is permanently expired.
//! - **Cancelled** is irreversible — once the seller cancels the
//!   invoice, it is permanently cancelled.

#![deny(unsafe_code)]
#![deny(unused_must_use)]

/// The four canonical invoice statuses recognised by the Quittance protocol.
///
/// The order of variants is **deliberate**: `Pending` first (entry state),
/// followed by the three terminal states in alphabetical order. Callers
/// that derive `Ord` on this enum will therefore see `Pending < Paid <
/// Expired < Cancelled`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum InvoiceStatus {
    /// The invoice has been created and is awaiting payment.
    Pending,
    /// Payment has been received and settled on-chain.
    Paid,
    /// The expiry deadline passed without payment.
    Expired,
    /// The seller voluntarily cancelled the invoice.
    Cancelled,
}

impl InvoiceStatus {
    /// Returns `true` when the status is terminal (no further transitions
    /// are allowed).
    ///
    /// # Examples
    ///
    /// ```
    /// use quittance_status_transitions::InvoiceStatus;
    ///
    /// assert!(!InvoiceStatus::Pending.is_terminal());
    /// assert!( InvoiceStatus::Paid.is_terminal());
    /// assert!( InvoiceStatus::Expired.is_terminal());
    /// assert!( InvoiceStatus::Cancelled.is_terminal());
    /// ```
    #[must_use]
    pub fn is_terminal(self) -> bool {
        matches!(self, InvoiceStatus::Paid | InvoiceStatus::Expired | InvoiceStatus::Cancelled)
    }
}

/// Stable lowercase display names for [`InvoiceStatus`].
///
/// The mapping is fixed so that any layer (smart contract, off-chain
/// worker, API, dashboard) renders the same strings:
///
/// | Variant    | Display output |
/// |------------|----------------|
/// | `Pending`  | `pending`      |
/// | `Paid`     | `paid`         |
/// | `Expired`  | `expired`      |
/// | `Cancelled`| `cancelled`    |
///
/// # Examples
///
/// ```
/// use quittance_status_transitions::InvoiceStatus;
///
/// assert_eq!(InvoiceStatus::Pending.to_string(),   "pending");
/// assert_eq!(InvoiceStatus::Paid.to_string(),      "paid");
/// assert_eq!(InvoiceStatus::Expired.to_string(),   "expired");
/// assert_eq!(InvoiceStatus::Cancelled.to_string(), "cancelled");
/// ```
impl core::fmt::Display for InvoiceStatus {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let name = match self {
            InvoiceStatus::Pending   => "pending",
            InvoiceStatus::Paid      => "paid",
            InvoiceStatus::Expired   => "expired",
            InvoiceStatus::Cancelled => "cancelled",
        };
        f.write_str(name)
    }
}

/// A single allowed transition: `(from, to)`.
///
/// Stored as a const array so callers and tooling can inspect the full
/// transition table at compile time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Transition {
    pub from: InvoiceStatus,
    pub to: InvoiceStatus,
}

/// The complete set of allowed status transitions.
///
/// Every entry in this table is a **valid** transition. Any `(from, to)`
/// pair NOT in this table is **illegal** and must be rejected.
///
/// The table covers exactly three transitions — one from `Pending` to each
/// terminal state. Self-transitions (`Pending → Pending`, etc.) and
/// transitions out of terminal states are intentionally absent.
///
/// # Stability
///
/// Adding a row to this table is a **breaking change** (it loosens the
/// transition rules). Removing a row is also a breaking change (it
/// tightens them). Callers should pin the major version.
pub const ALLOWED_TRANSITIONS: &[Transition] = &[
    Transition { from: InvoiceStatus::Pending, to: InvoiceStatus::Paid },
    Transition { from: InvoiceStatus::Pending, to: InvoiceStatus::Expired },
    Transition { from: InvoiceStatus::Pending, to: InvoiceStatus::Cancelled },
];

/// Returns `true` if the transition `from → to` is listed in
/// [`ALLOWED_TRANSITIONS`].
///
/// Self-transitions (e.g. `Pending → Pending`) always return `false` —
/// they are not in the table and are treated as no-ops, not allowed
/// transitions.
///
/// # Examples
///
/// ```
/// use quittance_status_transitions::{is_allowed, InvoiceStatus};
///
/// assert!( is_allowed(InvoiceStatus::Pending, InvoiceStatus::Paid));
/// assert!( is_allowed(InvoiceStatus::Pending, InvoiceStatus::Expired));
/// assert!( is_allowed(InvoiceStatus::Pending, InvoiceStatus::Cancelled));
///
/// // Terminal states cannot transition further.
/// assert!(!is_allowed(InvoiceStatus::Paid,     InvoiceStatus::Pending));
/// assert!(!is_allowed(InvoiceStatus::Expired,  InvoiceStatus::Paid));
/// assert!(!is_allowed(InvoiceStatus::Cancelled,InvoiceStatus::Pending));
///
/// // Self-transitions are not allowed.
/// assert!(!is_allowed(InvoiceStatus::Pending,  InvoiceStatus::Pending));
/// assert!(!is_allowed(InvoiceStatus::Paid,     InvoiceStatus::Paid));
/// ```
#[must_use = "a `false` return means the transition is illegal; the caller must handle this case"]
pub fn is_allowed(from: InvoiceStatus, to: InvoiceStatus) -> bool {
    ALLOWED_TRANSITIONS
        .iter()
        .any(|t| t.from == from && t.to == to)
}

/// Returns every status that can be legally reached from `from`.
///
/// The returned slice is **never empty** for valid inputs — even terminal
/// statuses return a valid (empty) set of follow-on targets, which is
/// useful for building generic status-machine code.
///
/// # Examples
///
/// ```
/// use quittance_status_transitions::{allowed_targets, InvoiceStatus};
///
/// let targets = allowed_targets(InvoiceStatus::Pending);
/// assert_eq!(targets.len(), 3);
/// assert!(targets.contains(&InvoiceStatus::Paid));
/// assert!(targets.contains(&InvoiceStatus::Expired));
/// assert!(targets.contains(&InvoiceStatus::Cancelled));
///
/// assert_eq!(allowed_targets(InvoiceStatus::Paid).len(),     0);
/// assert_eq!(allowed_targets(InvoiceStatus::Expired).len(),  0);
/// assert_eq!(allowed_targets(InvoiceStatus::Cancelled).len(),0);
/// ```
#[must_use]
pub fn allowed_targets(from: InvoiceStatus) -> &'static [InvoiceStatus] {
    // Match on each variant so the compiler can help us keep the
    // returned slices in sync when new variants are added.
    match from {
        InvoiceStatus::Pending => &[
            InvoiceStatus::Paid,
            InvoiceStatus::Expired,
            InvoiceStatus::Cancelled,
        ],
        InvoiceStatus::Paid      => &[],
        InvoiceStatus::Expired   => &[],
        InvoiceStatus::Cancelled => &[],
    }
}

// ---------------------------------------------------------------------------
// Transition table as a flat constant for documentation / inspection
// ---------------------------------------------------------------------------

/// A human-readable representation of every possible `(from, to)` pair
/// and whether it is allowed or denied.
///
/// Each entry is `(from, to, allowed)` with a `bool`. The table is
/// exhaustive — it covers **16 pairs** (4 × 4).
///
/// Callers can iterate this table to produce documentation, dashboards,
/// or audit reports without re-deriving the rules.
pub const FULL_TRANSITION_MATRIX: &[(InvoiceStatus, InvoiceStatus, bool)] = &build_full_matrix();

/// Build the 4×4 exhaustive transition matrix at compile time.
///
/// Const-evaluable helper so [`FULL_TRANSITION_MATRIX`] can be a simple
/// `&[(InvoiceStatus, InvoiceStatus, bool)]` constant.
#[must_use]
const fn build_full_matrix() -> [(InvoiceStatus, InvoiceStatus, bool); 16] {
    let statuses: [InvoiceStatus; 4] = [
        InvoiceStatus::Pending,
        InvoiceStatus::Paid,
        InvoiceStatus::Expired,
        InvoiceStatus::Cancelled,
    ];

    let mut matrix: [(InvoiceStatus, InvoiceStatus, bool); 16] = [
        (InvoiceStatus::Pending, InvoiceStatus::Pending, false); 16
    ];

    let mut i: usize = 0;
    while i < statuses.len() {
        let mut j: usize = 0;
        while j < statuses.len() {
            let from = statuses[i];
            let to = statuses[j];

            // Inline the allowed-check so the const fn can evaluate
            // without calling `is_allowed` (which iterates slices, and
            // const-fn slice iteration on stable Rust is limited).
            let allowed = matches!(
                (from, to),
                (InvoiceStatus::Pending, InvoiceStatus::Paid)
                    | (InvoiceStatus::Pending, InvoiceStatus::Expired)
                    | (InvoiceStatus::Pending, InvoiceStatus::Cancelled)
            );

            matrix[i * 4 + j] = (from, to, allowed);
            j += 1;
        }
        i += 1;
    }

    matrix
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ── Constants & shape ──────────────────────────────────────────────

    #[test]
    fn transition_table_has_exactly_three_entries() {
        assert_eq!(ALLOWED_TRANSITIONS.len(), 3);
    }

    #[test]
    fn full_matrix_has_sixteen_entries() {
        assert_eq!(FULL_TRANSITION_MATRIX.len(), 16);
    }

    #[test]
    fn full_matrix_no_duplicate_pairs() {
        // Every (from, to) pair must appear exactly once.
        for (i, &a) in FULL_TRANSITION_MATRIX.iter().enumerate() {
            for (j, &b) in FULL_TRANSITION_MATRIX.iter().enumerate() {
                if i == j {
                    continue;
                }
                assert!(
                    !(a.0 == b.0 && a.1 == b.1),
                    "duplicate pair in FULL_TRANSITION_MATRIX at indices {i} and {j}: ({:?}, {:?})",
                    a.0, a.1,
                );
            }
        }
    }

    // ── is_terminal ────────────────────────────────────────────────────

    #[test]
    fn pending_is_not_terminal() {
        assert!(!InvoiceStatus::Pending.is_terminal());
    }

    #[test]
    fn paid_expired_cancelled_are_terminal() {
        assert!(InvoiceStatus::Paid.is_terminal());
        assert!(InvoiceStatus::Expired.is_terminal());
        assert!(InvoiceStatus::Cancelled.is_terminal());
    }

    // ── is_allowed: valid transitions ──────────────────────────────────

    #[test]
    fn is_allowed_pending_to_paid() {
        assert!(is_allowed(InvoiceStatus::Pending, InvoiceStatus::Paid));
    }

    #[test]
    fn is_allowed_pending_to_expired() {
        assert!(is_allowed(InvoiceStatus::Pending, InvoiceStatus::Expired));
    }

    #[test]
    fn is_allowed_pending_to_cancelled() {
        assert!(is_allowed(InvoiceStatus::Pending, InvoiceStatus::Cancelled));
    }

    // ── is_allowed: denied self-transitions ────────────────────────────

    #[test]
    fn is_allowed_denies_pending_to_pending() {
        assert!(!is_allowed(InvoiceStatus::Pending, InvoiceStatus::Pending));
    }

    #[test]
    fn is_allowed_denies_paid_to_paid() {
        assert!(!is_allowed(InvoiceStatus::Paid, InvoiceStatus::Paid));
    }

    #[test]
    fn is_allowed_denies_expired_to_expired() {
        assert!(!is_allowed(InvoiceStatus::Expired, InvoiceStatus::Expired));
    }

    #[test]
    fn is_allowed_denies_cancelled_to_cancelled() {
        assert!(!is_allowed(InvoiceStatus::Cancelled, InvoiceStatus::Cancelled));
    }

    // ── is_allowed: denied exits from terminal states ──────────────────

    #[test]
    fn is_allowed_denies_paid_to_pending() {
        assert!(!is_allowed(InvoiceStatus::Paid, InvoiceStatus::Pending));
    }

    #[test]
    fn is_allowed_denies_paid_to_expired() {
        assert!(!is_allowed(InvoiceStatus::Paid, InvoiceStatus::Expired));
    }

    #[test]
    fn is_allowed_denies_paid_to_cancelled() {
        assert!(!is_allowed(InvoiceStatus::Paid, InvoiceStatus::Cancelled));
    }

    #[test]
    fn is_allowed_denies_expired_to_pending() {
        assert!(!is_allowed(InvoiceStatus::Expired, InvoiceStatus::Pending));
    }

    #[test]
    fn is_allowed_denies_expired_to_paid() {
        assert!(!is_allowed(InvoiceStatus::Expired, InvoiceStatus::Paid));
    }

    #[test]
    fn is_allowed_denies_expired_to_cancelled() {
        assert!(!is_allowed(InvoiceStatus::Expired, InvoiceStatus::Cancelled));
    }

    #[test]
    fn is_allowed_denies_cancelled_to_pending() {
        assert!(!is_allowed(InvoiceStatus::Cancelled, InvoiceStatus::Pending));
    }

    #[test]
    fn is_allowed_denies_cancelled_to_paid() {
        assert!(!is_allowed(InvoiceStatus::Cancelled, InvoiceStatus::Paid));
    }

    #[test]
    fn is_allowed_denies_cancelled_to_expired() {
        assert!(!is_allowed(InvoiceStatus::Cancelled, InvoiceStatus::Expired));
    }

    // ── allowed_targets ────────────────────────────────────────────────

    #[test]
    fn allowed_targets_pending_returns_exactly_the_expected_set() {
        let targets = allowed_targets(InvoiceStatus::Pending);

        // Length: exactly the three terminal statuses.
        assert_eq!(targets.len(), 3);

        // Members: the exact expected set — Paid, Expired, Cancelled —
        // with no extras and no omissions. Comparing the whole slice
        // means adding or removing any target fails this test.
        assert_eq!(
            targets,
            &[
                InvoiceStatus::Paid,
                InvoiceStatus::Expired,
                InvoiceStatus::Cancelled,
            ]
        );
    }

    #[test]
    fn allowed_targets_terminal_are_empty() {
        assert_eq!(allowed_targets(InvoiceStatus::Paid).len(), 0);
        assert_eq!(allowed_targets(InvoiceStatus::Expired).len(), 0);
        assert_eq!(allowed_targets(InvoiceStatus::Cancelled).len(), 0);
    }

    // ── allowed_targets ↔ is_allowed consistency ───────────────────────

    #[test]
    fn allowed_targets_consistent_with_is_allowed() {
        for status in [
            InvoiceStatus::Pending,
            InvoiceStatus::Paid,
            InvoiceStatus::Expired,
            InvoiceStatus::Cancelled,
        ] {
            let targets = allowed_targets(status);
            for target in targets {
                assert!(
                    is_allowed(status, *target),
                    "allowed_targets({status:?}) returned {target:?} but is_allowed returned false"
                );
            }
            // Conversely, any target NOT in the list must be denied.
            for candidate in [
                InvoiceStatus::Pending,
                InvoiceStatus::Paid,
                InvoiceStatus::Expired,
                InvoiceStatus::Cancelled,
            ] {
                if !targets.contains(&candidate) {
                    assert!(
                        !is_allowed(status, candidate),
                        "is_allowed({status:?}, {candidate:?}) returned true but candidate is not in allowed_targets"
                    );
                }
            }
        }
    }

    // ── FULL_TRANSITION_MATRIX ↔ is_allowed consistency ────────────────

    #[test]
    fn full_matrix_consistent_with_is_allowed() {
        for &(from, to, allowed_in_matrix) in FULL_TRANSITION_MATRIX {
            assert_eq!(
                is_allowed(from, to),
                allowed_in_matrix,
                "mismatch for ({from:?} → {to:?}): is_allowed={} but matrix says {}",
                is_allowed(from, to),
                allowed_in_matrix,
            );
        }
    }

    // ── Table-level invariants ─────────────────────────────────────────

    #[test]
    fn only_pending_is_a_source_of_transitions() {
        // For every allowed transition, `from` must be Pending.
        for t in ALLOWED_TRANSITIONS {
            assert_eq!(
                t.from,
                InvoiceStatus::Pending,
                "only Pending may be the source of a transition, found {:?} → {:?}",
                t.from,
                t.to,
            );
        }
    }

    #[test]
    fn every_allowed_target_is_terminal() {
        for t in ALLOWED_TRANSITIONS {
            assert!(
                t.to.is_terminal(),
                "every allowed target must be terminal, found {:?} → {:?}",
                t.from,
                t.to,
            );
        }
    }

    #[test]
    fn all_non_pending_statuses_are_terminal() {
        // A simple sanity-check: if someone adds a 5th variant that is
        // neither Pending nor terminal, this test breaks loudly.
        assert!(!InvoiceStatus::Pending.is_terminal());
        assert!(InvoiceStatus::Paid.is_terminal());
        assert!(InvoiceStatus::Expired.is_terminal());
        assert!(InvoiceStatus::Cancelled.is_terminal());
    }

    // ── Display ────────────────────────────────────────────────────────

    #[test]
    fn display_pending_is_lowercase() {
        assert_eq!(InvoiceStatus::Pending.to_string(), "pending");
    }

    #[test]
    fn display_paid_is_lowercase() {
        assert_eq!(InvoiceStatus::Paid.to_string(), "paid");
    }

    #[test]
    fn display_expired_is_lowercase() {
        assert_eq!(InvoiceStatus::Expired.to_string(), "expired");
    }

    #[test]
    fn display_cancelled_is_lowercase() {
        assert_eq!(InvoiceStatus::Cancelled.to_string(), "cancelled");
    }

    #[test]
    fn display_works_via_format_macro() {
        assert_eq!(format!("{}", InvoiceStatus::Pending),   "pending");
        assert_eq!(format!("{}", InvoiceStatus::Paid),      "paid");
        assert_eq!(format!("{}", InvoiceStatus::Expired),   "expired");
        assert_eq!(format!("{}", InvoiceStatus::Cancelled), "cancelled");
    }

    // ── Derive smoke-tests ─────────────────────────────────────────────

    #[test]
    fn debug_format_is_human_readable() {
        let s = format!("{:?}", InvoiceStatus::Pending);
        assert!(s.contains("Pending"), "Debug output should contain variant name, got: {s}");
    }

    #[test]
    fn clone_is_equal() {
        let a = InvoiceStatus::Paid;
        assert_eq!(a, a.clone());
    }

    #[test]
    fn copy_is_equal() {
        let a = InvoiceStatus::Expired;
        let b = a; // Copy
        assert_eq!(a, b);
    }

    #[test]
    fn ord_is_total() {
        // A simple smoke-test: the four variants must be fully ordered.
        let mut v = vec![
            InvoiceStatus::Cancelled,
            InvoiceStatus::Pending,
            InvoiceStatus::Paid,
            InvoiceStatus::Expired,
        ];
        v.sort();
        assert_eq!(
            v,
            vec![
                InvoiceStatus::Pending,
                InvoiceStatus::Paid,
                InvoiceStatus::Expired,
                InvoiceStatus::Cancelled,
            ]
        );
    }

    #[test]
    fn hash_is_consistent() {
        // Note: DefaultHasher output is NOT guaranteed to be stable
        // across Rust versions. This test only verifies intra-process
        // consistency (same call → same hash).
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        fn hash_of(s: InvoiceStatus) -> u64 {
            let mut h = DefaultHasher::new();
            s.hash(&mut h);
            h.finish()
        }

        // Two calls on the same variant must produce the same hash.
        assert_eq!(hash_of(InvoiceStatus::Pending), hash_of(InvoiceStatus::Pending));
        assert_eq!(hash_of(InvoiceStatus::Paid), hash_of(InvoiceStatus::Paid));
        // Different variants should (almost certainly) differ.
        assert_ne!(hash_of(InvoiceStatus::Pending), hash_of(InvoiceStatus::Paid));
    }
}
