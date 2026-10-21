//! Additional scenario specific to this concept: the window slides forward
//! as the ledger advances, so a previously rate-limited payer becomes
//! unblocked again once their earlier attempts age out.

use payer_rate_limit::PayerRateLimiter;

#[test]
fn a_rate_limited_payer_recovers_once_old_attempts_leave_the_window() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER", 100);
    limiter.record_attempt("GPAYER", 101);
    limiter.record_attempt("GPAYER", 102);

    // window=5 ending at ledger=102 covers [98, 102]: all 3 attempts count.
    assert!(limiter.is_rate_limited("GPAYER", 102, 5, 3));

    // Ten ledgers later, window=5 covers [107, 111]: none of the old
    // attempts are in range anymore.
    assert!(!limiter.is_rate_limited("GPAYER", 111, 5, 3));
}

#[test]
fn record_attempt_keeps_incrementing_the_lifetime_count_after_the_window_recovers() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER", 100);
    limiter.record_attempt("GPAYER", 101);

    // A new attempt, long after the first two aged out of a small window,
    // still extends the lifetime log.
    assert_eq!(limiter.record_attempt("GPAYER", 200), 3);
    assert_eq!(limiter.attempts_in_window("GPAYER", 200, 5), 1);
}
