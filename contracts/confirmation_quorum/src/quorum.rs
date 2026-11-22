/// Return whether `confirmations` distinct observers satisfy a quorum of
/// `threshold` confirmations.
///
/// The comparison is inclusive: exactly `threshold` confirmations already form
/// a quorum. A threshold of `0` is trivially satisfied, so callers that need a
/// real confirmation must ask for at least `1`.
pub fn is_met(confirmations: u32, threshold: u32) -> bool {
    confirmations >= threshold
}

/// Return how many confirmations are still missing to satisfy a quorum of
/// `threshold` confirmations.
///
/// Returns `0` once the quorum is satisfied.
pub fn remaining(confirmations: u32, threshold: u32) -> u32 {
    threshold.saturating_sub(confirmations)
}
