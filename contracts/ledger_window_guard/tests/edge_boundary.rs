//! Edge and boundary tests for `ledger-window-guard`.
//!
//! These cover exact bounds, degenerate windows, and the extremes of the
//! `u64` timestamp range.

mod common;

use common::setup;
use ledger_window_guard::{in_window, window_len, Window};

#[test]
fn a_single_instant_window_contains_only_that_instant() {
    let (_env, client) = setup();

    assert!(client.in_window(&1_000, &1_000, &1_000));
    assert!(!client.in_window(&999, &1_000, &1_000));
    assert!(!client.in_window(&1_001, &1_000, &1_000));
}

#[test]
fn a_single_instant_window_has_zero_width_but_is_not_empty() {
    let (_env, client) = setup();

    assert_eq!(window_len(1_000, 1_000), Some(0));
    // Zero width, yet the one instant inside it still matches.
    assert!(client.in_window(&1_000, &1_000, &1_000));
}

#[test]
fn a_zero_window_at_epoch_contains_only_ledger_zero() {
    let (_env, client) = setup();

    assert!(client.in_window(&0, &0, &0));
    assert!(!client.in_window(&1, &0, &0));
}

#[test]
fn the_zero_timestamp_is_a_valid_lower_bound() {
    let (_env, client) = setup();

    assert!(client.in_window(&0, &0, &100));
    assert!(!client.in_window(&0, &1, &100));
}

#[test]
fn the_full_u64_range_contains_every_timestamp() {
    let (_env, client) = setup();

    assert!(client.in_window(&0, &0, &u64::MAX));
    assert!(client.in_window(&u64::MAX, &0, &u64::MAX));
    assert!(client.in_window(&123_456_789, &0, &u64::MAX));
}

#[test]
fn u64_max_timestamps_do_not_overflow() {
    let (_env, client) = setup();

    assert!(client.in_window(&u64::MAX, &u64::MAX, &u64::MAX));
    assert!(!client.in_window(&(u64::MAX - 1), &u64::MAX, &u64::MAX));
    assert!(client.in_window(&u64::MAX, &(u64::MAX - 1), &u64::MAX));
}

#[test]
fn a_window_ending_at_u64_max_accepts_everything_up_to_it() {
    let (_env, client) = setup();

    assert!(client.in_window(&u64::MAX, &100, &u64::MAX));
    assert!(client.in_window(&(u64::MAX - 1), &100, &u64::MAX));
    assert!(!client.in_window(&99, &100, &u64::MAX));
}

#[test]
fn window_len_extremes_do_not_overflow() {
    // The widest possible window: end - start == u64::MAX, no wrap.
    assert_eq!(window_len(0, u64::MAX), Some(u64::MAX));
    assert_eq!(window_len(u64::MAX, u64::MAX), Some(0));
}

#[test]
fn the_window_value_type_tracks_boundary_construction() {
    let single = Window::new(1_000, 1_000);
    assert!(single.contains(1_000));
    assert_eq!(single.span(), Some(0));
    assert!(!single.is_inverted());

    let inverted = Window::new(200, 100);
    assert!(!inverted.contains(150));
    assert_eq!(inverted.span(), None);
    assert!(inverted.is_inverted());
}

#[test]
fn a_window_of_one_ledger_worth_of_seconds_is_exact() {
    let (_env, client) = setup();

    // A 1-second window [t, t + 1] covers exactly two integer timestamps.
    assert!(client.in_window(&1_000, &1_000, &1_001));
    assert!(client.in_window(&1_001, &1_000, &1_001));
    assert!(!client.in_window(&1_002, &1_000, &1_001));
    assert_eq!(window_len(1_000, 1_001), Some(1));
    // Cross-check the free function on the same boundary.
    assert!(in_window(1_001, 1_000, 1_001));
    assert!(!in_window(1_002, 1_000, 1_001));
}
