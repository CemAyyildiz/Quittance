//! Failure cases: a payer who exceeds the configured limit must be
//! reported as rate limited.

use payer_rate_limit::PayerRateLimiter;

#[test]
fn a_payer_at_exactly_max_attempts_is_rate_limited() {
    let mut limiter = PayerRateLimiter::new();
    for ledger in 100..103 {
        limiter.record_attempt("GPAYER", ledger);
    }

    assert!(limiter.is_rate_limited("GPAYER", 102, 10, 3));
}

#[test]
fn a_payer_past_max_attempts_stays_rate_limited() {
    let mut limiter = PayerRateLimiter::new();
    for ledger in 100..110 {
        limiter.record_attempt("GPAYER", ledger);
    }

    assert!(limiter.is_rate_limited("GPAYER", 109, 50, 3));
}

#[test]
fn attempts_outside_the_window_are_not_counted_against_the_limit() {
    let mut limiter = PayerRateLimiter::new();
    // Three old attempts, well outside a window of 5 ending at ledger 200.
    for ledger in 100..103 {
        limiter.record_attempt("GPAYER", ledger);
    }

    assert!(!limiter.is_rate_limited("GPAYER", 200, 5, 3));
}
