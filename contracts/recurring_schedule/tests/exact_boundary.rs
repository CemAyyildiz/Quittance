//! `now` sitting exactly on a due instant, including the anchor.

use recurring_schedule::next_due;

#[test]
fn now_equal_to_anchor_returns_the_following_occurrence() {
    let anchor = 1_700_000_000;
    let day = 86_400;
    // The anchor itself is the occurrence already reached at `now`.
    assert_eq!(next_due(anchor, day, anchor), Ok(anchor + day));
}

#[test]
fn now_exactly_on_a_later_due_skips_to_the_next_one() {
    let anchor = 1_000_u64;
    let interval = 250_u64;
    let now = anchor + 4 * interval;
    assert_eq!(next_due(anchor, interval, now), Ok(now + interval));
    assert_ne!(next_due(anchor, interval, now).unwrap(), now);
}

#[test]
fn landing_on_the_third_due_does_not_repeat_it() {
    assert_eq!(next_due(0, 30, 90), Ok(120));
}
