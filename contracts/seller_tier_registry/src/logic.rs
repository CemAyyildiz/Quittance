//! Tier ranking helpers for `seller-tier-registry`.

use crate::types::Tier;

#[must_use]
pub const fn tier_rank(tier: Tier) -> u32 {
    match tier {
        Tier::Bronze => 1,
        Tier::Silver => 2,
        Tier::Gold => 3,
    }
}
