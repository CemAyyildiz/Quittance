//! Boundary cases around window edges and degenerate parameters.

use payer_rate_limit::PayerRateLimiter;

#[test]
fn an_attempt_exactly_at_the_window_start_is_included() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER", 90);

    // window=11 ending at ledger=100 covers [90, 100] inclusive.
    assert_eq!(limiter.attempts_in_window("GPAYER", 100, 11), 1);
}

#[test]
fn an_attempt_one_ledger_before_the_window_start_is_excluded() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER", 89);

    // window=11 ending at ledger=100 covers [90, 100] inclusive; 89 is out.
    assert_eq!(limiter.attempts_in_window("GPAYER", 100, 11), 0);
}

#[test]
fn a_zero_window_counts_only_the_current_ledger() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER", 99);
    limiter.record_attempt("GPAYER", 100);

    assert_eq!(limiter.attempts_in_window("GPAYER", 100, 0), 1);
}

#[test]
fn a_zero_max_attempts_rate_limits_a_payer_with_no_history() {
    let limiter = PayerRateLimiter::new();
    assert!(limiter.is_rate_limited("GPAYER", 100, 10, 0));
}

#[test]
fn a_window_larger_than_the_current_ledger_does_not_underflow() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER", 0);

    assert_eq!(limiter.attempts_in_window("GPAYER", 0, 1_000), 1);
}
