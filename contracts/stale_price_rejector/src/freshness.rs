/// Return whether a timestamp is not in the future and is within the age limit.
pub const fn is_fresh(price_at: u64, now: u64, max_age_secs: u64) -> bool {
    price_at <= now && now - price_at <= max_age_secs
}
