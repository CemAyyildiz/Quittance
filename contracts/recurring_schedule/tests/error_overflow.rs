//! Zero intervals and additions that do not fit in `u64`.

use recurring_schedule::{next_due, ScheduleError};

#[test]
fn zero_interval_is_rejected() {
    assert_eq!(next_due(0, 0, 0), Err(ScheduleError::ZeroInterval));
}

#[test]
fn zero_interval_is_rejected_before_the_anchor_check() {
    assert_eq!(next_due(100, 0, 50), Err(ScheduleError::ZeroInterval));
    assert_eq!(
        next_due(u64::MAX, 0, u64::MAX),
        Err(ScheduleError::ZeroInterval)
    );
}

#[test]
fn exact_anchor_near_the_top_overflows() {
    assert_eq!(
        next_due(u64::MAX, 1, u64::MAX),
        Err(ScheduleError::Overflow)
    );
}

#[test]
fn step_between_ticks_overflows() {
    // `now` is one second after the anchor, and the next due is two seconds
    // after the anchor, which is past `u64::MAX`.
    assert_eq!(
        next_due(u64::MAX - 1, 2, u64::MAX),
        Err(ScheduleError::Overflow)
    );
}

#[test]
fn error_codes_and_messages_are_stable() {
    assert_eq!(ScheduleError::ZeroInterval as u32, 1);
    assert_eq!(ScheduleError::Overflow as u32, 2);
    assert!(!ScheduleError::ZeroInterval.message().is_empty());
    assert!(!ScheduleError::Overflow.message().is_empty());
    assert_ne!(
        ScheduleError::ZeroInterval.message(),
        ScheduleError::Overflow.message()
    );
}
