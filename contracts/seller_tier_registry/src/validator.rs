use crate::types::Tier;

pub const BRONZE_DISCOUNT_BPS: u32 = 0;
pub const SILVER_DISCOUNT_BPS: u32 = 100;
pub const GOLD_DISCOUNT_BPS: u32 = 250;

pub fn tier_rank(tier: Tier) -> u32 {
    match tier {
        Tier::Bronze => 1,
        Tier::Silver => 2,
        Tier::Gold => 3,
    }
}

pub fn tier_fee_discount_bps(tier: Tier) -> u32 {
    match tier {
        Tier::Bronze => BRONZE_DISCOUNT_BPS,
        Tier::Silver => SILVER_DISCOUNT_BPS,
        Tier::Gold => GOLD_DISCOUNT_BPS,
    }
}

pub fn meets_minimum_tier(actual: Tier, minimum: Tier) -> bool {
    tier_rank(actual) >= tier_rank(minimum)
}
