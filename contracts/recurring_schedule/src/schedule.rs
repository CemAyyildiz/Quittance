//! Schedule arithmetic for the next recurring due timestamp.

/// Failures from [`next_due`].
///
/// Discriminants are stable `u32` codes so an off-chain caller can match
/// the integer without depending on the Rust variant name.
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
#[repr(u32)]
pub enum ScheduleError {
    /// `interval_secs` was `0`. A recurring schedule needs a positive period.
    ZeroInterval = 1,
    /// The next due timestamp does not fit in `u64`.
    Overflow = 2,
}

impl ScheduleError {
    /// Stable English description of this error.
    #[must_use]
    pub fn message(self) -> &'static str {
        match self {
            ScheduleError::ZeroInterval => "Recurring interval must be greater than zero.",
            ScheduleError::Overflow => "Next due timestamp overflows u64.",
        }
    }
}

impl std::fmt::Display for ScheduleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.message())
    }
}

impl std::error::Error for ScheduleError {}

/// Next invoice due at or after the schedule rules below.
///
/// * `interval_secs == 0` returns [`ScheduleError::ZeroInterval`]. This is
///   checked before any comparison of `now` and `anchor`.
/// * `now < anchor` returns `anchor`. Nothing is due until the first
///   occurrence.
/// * `now == anchor` returns `anchor + interval_secs`. The anchor is the
///   occurrence that is happening at this instant, so the next invoice is
///   one full period later. The same rule applies when `now` lands on any
///   later `anchor + n * interval_secs`: the result is strictly greater
///   than `now`.
/// * `now > anchor` returns the smallest `anchor + n * interval_secs` that
///   is strictly greater than `now`.
/// * If that addition does not fit in `u64`, the function returns
///   [`ScheduleError::Overflow`].
///
/// # Examples
///
/// ```
/// use recurring_schedule::next_due;
///
/// let anchor = 1_700_000_000;
/// let day = 86_400;
///
/// assert_eq!(next_due(anchor, day, anchor - 1), Ok(anchor));
/// assert_eq!(next_due(anchor, day, anchor), Ok(anchor + day));
/// assert_eq!(next_due(anchor, day, anchor + 10), Ok(anchor + day));
/// ```
pub fn next_due(anchor: u64, interval_secs: u64, now: u64) -> Result<u64, ScheduleError> {
    if interval_secs == 0 {
        return Err(ScheduleError::ZeroInterval);
    }
    if now < anchor {
        return Ok(anchor);
    }

    // `elapsed = q * interval + r`, with `r < interval`.
    // The next strictly-later due is `anchor + (q + 1) * interval`,
    // which equals `now + (interval - r)` and `now + interval` when `r == 0`
    // (including `now == anchor`). The step is always in `1..=interval`.
    let elapsed = now - anchor;
    let remainder = elapsed % interval_secs;
    let step = if remainder == 0 {
        interval_secs
    } else {
        interval_secs - remainder
    };
    now.checked_add(step).ok_or(ScheduleError::Overflow)
}
