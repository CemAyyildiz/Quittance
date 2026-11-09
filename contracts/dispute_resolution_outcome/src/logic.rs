//! Resolution logic and share helpers for `dispute-resolution-outcome`.

use soroban_sdk::{Env, Symbol};

use crate::storage;
use crate::types::{Error, Outcome};

/// Write `outcome` for `dispute_id` if and only if no outcome is stored yet.
pub(crate) fn resolve_once(env: &Env, dispute_id: &Symbol, outcome: Outcome) -> Result<(), Error> {
    if storage::get_outcome(env, dispute_id).is_some() {
        return Err(Error::AlreadyResolved);
    }
    storage::set_outcome(env, dispute_id, outcome);
    Ok(())
}

/// Return the `(payer_bps, seller_bps)` split in basis points (`10_000 == 100%`)
/// for a given [`Outcome`].
#[must_use]
pub const fn payout_shares_bps(outcome: Outcome) -> (u32, u32) {
    match outcome {
        Outcome::FavorPayer => (10_000, 0),
        Outcome::FavorSeller => (0, 10_000),
        Outcome::Split => (5_000, 5_000),
    }
}
