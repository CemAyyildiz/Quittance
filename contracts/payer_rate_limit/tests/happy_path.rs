//! Happy-path cases: recording attempts and checking rate-limit status.

use payer_rate_limit::PayerRateLimiter;

#[test]
fn record_attempt_returns_the_running_count() {
    let mut limiter = PayerRateLimiter::new();
    assert_eq!(limiter.record_attempt("GPAYER", 100), 1);
    assert_eq!(limiter.record_attempt("GPAYER", 101), 2);
    assert_eq!(limiter.record_attempt("GPAYER", 102), 3);
}

#[test]
fn a_payer_under_the_max_is_not_rate_limited() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER", 100);
    limiter.record_attempt("GPAYER", 101);

    assert!(!limiter.is_rate_limited("GPAYER", 101, 10, 5));
}

#[test]
fn separate_payers_have_independent_attempt_logs() {
    let mut limiter = PayerRateLimiter::new();
    limiter.record_attempt("GPAYER_A", 100);
    limiter.record_attempt("GPAYER_A", 101);
    limiter.record_attempt("GPAYER_A", 102);

    assert!(limiter.is_rate_limited("GPAYER_A", 102, 10, 3));
    assert!(!limiter.is_rate_limited("GPAYER_B", 102, 10, 3));
}
