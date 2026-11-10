use crate::types::{DisputeOutcomeError, Outcome};

pub fn ensure_unresolved(existing: Option<Outcome>) -> Result<(), DisputeOutcomeError> {
    if existing.is_some() {
        Err(DisputeOutcomeError::AlreadyResolved)
    } else {
        Ok(())
    }
}

pub fn payer_share_bps(outcome: Outcome) -> u32 {
    match outcome {
        Outcome::FavorPayer => 10_000,
        Outcome::FavorSeller => 0,
        Outcome::Split => 5_000,
    }
}
