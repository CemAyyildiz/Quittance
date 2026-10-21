//! Happy path: a positive interval and a `now` that is not sitting on a due.

use recurring_schedule::next_due;

#[test]
fn returns_anchor_when_the_schedule_has_not_started() {
    assert_eq!(next_due(1_000, 100, 900), Ok(1_000));
}

#[test]
fn returns_the_upcoming_due_inside_an_interval() {
    assert_eq!(next_due(1_000, 100, 1_050), Ok(1_100));
}

#[test]
fn walks_forward_across_several_whole_periods() {
    let day = 86_400_u64;
    let anchor = 1_700_000_000;
    let now = anchor + 2 * day + 10;
    assert_eq!(next_due(anchor, day, now), Ok(anchor + 3 * day));
}
