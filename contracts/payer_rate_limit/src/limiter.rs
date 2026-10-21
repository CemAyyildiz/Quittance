//! The payer rate limiter.

use crate::types::AttemptLog;

/// Tracks payment attempts per payer and answers whether a payer has made
/// too many attempts within a trailing ledger window.
#[derive(Debug, Default)]
pub struct PayerRateLimiter {
    attempts: AttemptLog,
}

impl PayerRateLimiter {
    /// Creates an empty rate limiter.
    pub fn new() -> Self {
        Self::default()
    }

    /// Records a payment attempt for `payer` at `ledger`, returning the
    /// total number of attempts recorded for that payer so far (including
    /// this one, and including attempts outside any particular window).
    pub fn record_attempt(&mut self, payer: &str, ledger: u32) -> u32 {
        let log = self.attempts.entry(payer.to_string()).or_default();
        log.push(ledger);
        log.len() as u32
    }

    /// Returns `true` when `payer` has already recorded `max_attempts` or
    /// more attempts within the trailing `window` ledgers ending at (and
    /// including) `ledger`.
    ///
    /// A `window` of `0` only counts attempts recorded exactly at
    /// `ledger`. A payer with no recorded attempts is never rate limited,
    /// regardless of `max_attempts`.
    pub fn is_rate_limited(&self, payer: &str, ledger: u32, window: u32, max_attempts: u32) -> bool {
        self.attempts_in_window(payer, ledger, window) >= max_attempts
    }

    /// Counts the attempts recorded for `payer` within the trailing
    /// `window` ledgers ending at (and including) `ledger`.
    pub fn attempts_in_window(&self, payer: &str, ledger: u32, window: u32) -> u32 {
        let Some(log) = self.attempts.get(payer) else {
            return 0;
        };
        let window_start = ledger.saturating_sub(window.saturating_sub(1));
        log.iter()
            .filter(|&&recorded| recorded >= window_start && recorded <= ledger)
            .count() as u32
    }
}
