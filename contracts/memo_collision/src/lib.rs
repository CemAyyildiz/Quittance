//! # `memo-collision` — Stub in-memory memo collision guard
//!
//! **This is a test-only stub, not a production uniqueness system.**
//!
//! The crate provides [`MemoCollisionGuard`], a small in-memory guard
//! that tracks previously seen Soroban memo strings and flags duplicates
//! by returning `false` from [`MemoCollisionGuard::note`].
//!
//! ## Purpose
//!
//! When a Quittance invoice is paid, the payer attaches a unique memo
//! that the backend later correlates back to the invoice. Two payers
//! using the same memo simultaneously would cause a collision. This stub
//! offers a lightweight, ephemeral collision check that is suitable for
//! **unit tests and local development** only.
//!
//! ## Limitations (not production)
//!
//! - **Volatile**: State lives in a single `HashSet<String>` on the heap
//!   and is lost when the process exits.
//! - **Not distributed**: Each process has its own guard. Multiple
//!   replicas or serverless invocations would not share state.
//! - **No persistence**: Nothing is written to disk, a database, or the
//!   Stellar ledger.
//! - **No eviction**: The guard grows monotonically with each new unique
//!   memo inserted.
//!
//! ## Collision semantics
//!
//! Two memo strings are considered a *collision* if they are byte-for-byte
//! identical. Comparison is exact and case-sensitive.
//!
//! ```
//! # use memo_collision::MemoCollisionGuard;
//! let mut guard = MemoCollisionGuard::new();
//!
//! // First use — memo is accepted.
//! assert!(guard.note("memo-001"));
//!
//! // Second use — collision detected.
//! assert!(!guard.note("memo-001"));
//!
//! // Different memo is still accepted.
//! assert!(guard.note("memo-002"));
//! ```

use std::collections::HashSet;

/// An ephemeral, in-memory guard that detects duplicate Soroban memos.
///
/// This is a **test-only stub**. See the [crate-level
/// documentation](crate) for details on its limitations and intended
/// use.
///
/// # Examples
///
/// ```
/// use memo_collision::MemoCollisionGuard;
///
/// let mut guard = MemoCollisionGuard::new();
/// assert!(guard.is_empty());
///
/// guard.note("first-memo");
/// assert!(guard.has_seen("first-memo"));
/// assert!(!guard.is_empty());
///
/// guard.clear();
/// assert!(guard.is_empty());
/// ```
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct MemoCollisionGuard {
    seen: HashSet<String>,
}

impl MemoCollisionGuard {
    /// Create an empty guard with no previously seen memos.
    pub fn new() -> Self {
        Self {
            seen: HashSet::new(),
        }
    }

    /// Create a guard pre-loaded with the given memos.
    ///
    /// Any duplicates in `initial` are silently collapsed because the
    /// underlying storage is a [`HashSet`].
    ///
    /// This constructor is especially useful in tests that set up a
    /// known collision baseline without calling `note` repeatedly.
    ///
    /// # Examples
    ///
    /// ```
    /// use memo_collision::MemoCollisionGuard;
    ///
    /// let guard = MemoCollisionGuard::from_memos(["alpha", "beta"]);
    /// assert_eq!(guard.len(), 2);
    /// assert!(guard.has_seen("alpha"));
    /// assert!(guard.has_seen("beta"));
    /// ```
    pub fn from_memos<I, S>(initial: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let seen = initial
            .into_iter()
            .map(|s| s.as_ref().to_string())
            .collect();
        Self { seen }
    }

    /// Record a memo and return whether it is **new** (not a collision).
    ///
    /// Returns `true` if `memo` has never been seen before by this
    /// guard (the memo was inserted). Returns `false` if `memo` was
    /// already present (a collision was detected).
    ///
    /// # Examples
    ///
    /// ```
    /// use memo_collision::MemoCollisionGuard;
    ///
    /// let mut guard = MemoCollisionGuard::new();
    /// assert!(guard.note("fresh-memo"));
    /// assert!(!guard.note("fresh-memo"));  // collision
    /// ```
    pub fn note(&mut self, memo: &str) -> bool {
        self.seen.insert(memo.to_string())
    }

    /// Check whether `memo` has already been seen, without inserting.
    ///
    /// Returns `true` if the memo was previously recorded (either
    /// through [`note`](Self::note) or [`from_memos`](Self::from_memos)).
    pub fn has_seen(&self, memo: &str) -> bool {
        self.seen.contains(memo)
    }

    /// Remove all recorded memos, resetting the guard to empty.
    pub fn clear(&mut self) {
        self.seen.clear();
    }

    /// Return the number of unique memos currently tracked.
    pub fn len(&self) -> usize {
        self.seen.len()
    }

    /// Return `true` if no memos have been recorded yet.
    pub fn is_empty(&self) -> bool {
        self.seen.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------
    // Construction
    // -----------------------------------------------------------------

    #[test]
    fn new_guard_is_empty() {
        let guard = MemoCollisionGuard::new();
        assert!(guard.is_empty());
        assert_eq!(guard.len(), 0);
    }

    #[test]
    fn from_memos_populates_the_guard() {
        let guard = MemoCollisionGuard::from_memos(["a", "b", "c"]);
        assert_eq!(guard.len(), 3);
    }

    #[test]
    fn from_memos_deduplicates_duplicates() {
        let guard = MemoCollisionGuard::from_memos(["dup", "dup", "dup"]);
        assert_eq!(guard.len(), 1);
    }

    #[test]
    fn from_memos_accepts_empty_iterator() {
        let empty: [&str; 0] = [];
        let guard = MemoCollisionGuard::from_memos(empty);
        assert!(guard.is_empty());
    }

    // -----------------------------------------------------------------
    // note / collision detection
    // -----------------------------------------------------------------

    #[test]
    fn note_returns_true_for_first_occurrence() {
        let mut guard = MemoCollisionGuard::new();
        assert!(guard.note("memo-1"));
    }

    #[test]
    fn note_returns_false_on_collision() {
        let mut guard = MemoCollisionGuard::new();
        guard.note("memo-1");
        assert!(!guard.note("memo-1")); // collision
    }

    #[test]
    fn note_accepts_different_memos_after_collision() {
        let mut guard = MemoCollisionGuard::new();
        guard.note("collider");
        assert!(!guard.note("collider")); // collision
        assert!(guard.note("different")); // fresh
        assert!(guard.note("also-fresh"));
    }

    #[test]
    fn note_is_case_sensitive() {
        let mut guard = MemoCollisionGuard::new();
        assert!(guard.note("Memo"));
        assert!(guard.note("memo")); // different case → no collision
        assert!(!guard.note("Memo")); // exact repeat → collision
    }

    #[test]
    fn note_accepts_empty_string_once() {
        let mut guard = MemoCollisionGuard::new();
        assert!(guard.note(""));
        assert!(!guard.note("")); // second empty string is a collision
    }

    // -----------------------------------------------------------------
    // has_seen
    // -----------------------------------------------------------------

    #[test]
    fn has_seen_returns_false_for_unknown_memo() {
        let guard = MemoCollisionGuard::new();
        assert!(!guard.has_seen("anything"));
    }

    #[test]
    fn has_seen_returns_true_after_note() {
        let mut guard = MemoCollisionGuard::new();
        guard.note("recorded");
        assert!(guard.has_seen("recorded"));
    }

    #[test]
    fn has_seen_is_not_mutating() {
        let mut guard = MemoCollisionGuard::new();
        guard.note("present");
        // has_seen does not insert.
        let _ = guard.has_seen("absent");
        assert!(!guard.has_seen("absent"));
    }

    // -----------------------------------------------------------------
    // clear
    // -----------------------------------------------------------------

    #[test]
    fn clear_resets_all_state() {
        let mut guard = MemoCollisionGuard::from_memos(["a", "b", "c"]);
        assert_eq!(guard.len(), 3);
        guard.clear();
        assert!(guard.is_empty());
        assert_eq!(guard.len(), 0);
    }

    #[test]
    fn clear_allows_reinserting_previous_memos() {
        let mut guard = MemoCollisionGuard::new();
        guard.note("temp");
        guard.clear();
        assert!(guard.note("temp")); // accepted again after clear
    }

    // -----------------------------------------------------------------
    // len / is_empty
    // -----------------------------------------------------------------

    #[test]
    fn len_reflects_unique_count() {
        let mut guard = MemoCollisionGuard::new();
        assert_eq!(guard.len(), 0);
        guard.note("x");
        assert_eq!(guard.len(), 1);
        guard.note("x"); // collision — count unchanged
        assert_eq!(guard.len(), 1);
        guard.note("y");
        assert_eq!(guard.len(), 2);
    }

    #[test]
    fn is_empty_after_clear() {
        let mut guard = MemoCollisionGuard::from_memos(["stale"]);
        assert!(!guard.is_empty());
        guard.clear();
        assert!(guard.is_empty());
    }

    // -----------------------------------------------------------------
    // Trait implementations
    // -----------------------------------------------------------------

    #[test]
    fn default_is_equivalent_to_new() {
        assert_eq!(
            MemoCollisionGuard::default(),
            MemoCollisionGuard::new()
        );
    }

    #[test]
    fn clone_is_independent() {
        let mut original = MemoCollisionGuard::new();
        original.note("shared");
        let mut clone = original.clone();
        assert!(clone.has_seen("shared"));

        // Mutating the clone does not affect the original.
        clone.note("clone-only");
        assert!(clone.has_seen("clone-only"));
        assert!(!original.has_seen("clone-only"));
    }

    // -----------------------------------------------------------------
    // Edge cases
    // -----------------------------------------------------------------

    #[test]
    fn large_number_of_memos_does_not_panic() {
        let mut guard = MemoCollisionGuard::new();
        for i in 0..10_000 {
            assert!(guard.note(&format!("memo-{}", i)));
        }
        assert_eq!(guard.len(), 10_000);

        // Collision on the last one.
        assert!(!guard.note("memo-9999"));
    }

    #[test]
    fn unicode_memos_are_compared_as_bytes() {
        let mut guard = MemoCollisionGuard::new();
        // Cyrillic "Х" (U+0425) vs Latin "X" — different bytes.
        assert!(guard.note("ХМemo")); // Cyrillic Х
        assert!(guard.note("XMemo")); // Latin X
        assert!(!guard.note("ХМemo")); // repeat of Cyrillic — collision
    }

    #[test]
    fn distinct_memos_produce_distinct_hashes() {
        let mut guard = MemoCollisionGuard::new();
        assert!(guard.note("memo-a"));
        assert!(guard.note("memo-b"));
        assert!(guard.has_seen("memo-a"));
        assert!(guard.has_seen("memo-b"));
        assert_ne!(guard.has_seen("memo-a"), guard.has_seen("memo-b"));
    }
}
