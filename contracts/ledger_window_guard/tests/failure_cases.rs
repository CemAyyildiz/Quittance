//! Failure-case tests for `ledger-window-guard`.
//!
//! The guard has no error return — a rejected timestamp is simply `false` —
//! so these tests pin down every rejection path: inverted (malformed)
//! windows, timestamps just outside the bounds, and malformed widths.
//! Everything here must return cleanly without overflowing or panicking.

mod common;

use common::setup;
use ledger_window_guard::{in_window, window_len, Window};

#[test]
fn an_inverted_window_makes_every_timestamp_fail() {
    let (_env, client) = setup();

    // start > end: no timestamp can ever be inside.
    assert!(!client.in_window(&0, &200, &100));
    assert!(!client.in_window(&150, &200, &100)); // between the bounds
    assert!(!client.in_window(&250, &200, &100));
    assert!(!client.in_window(&u64::MAX, &u64::MAX, &0));
}

#[test]
fn an_inverted_window_reports_no_width_instead_of_underflowing() {
    // A naive `end - start` would wrap (release) or panic (debug) here.
    assert_eq!(window_len(200, 100), None);
    assert_eq!(window_len(1, 0), None);
    assert_eq!(window_len(u64::MAX, 0), None);
}

#[test]
fn a_timestamp_one_before_the_start_is_rejected() {
    let (_env, client) = setup();

    assert!(!client.in_window(&999, &1_000, &2_000));
}

#[test]
fn a_timestamp_one_after_the_end_is_rejected() {
    let (_env, client) = setup();

    assert!(!client.in_window(&2_001, &1_000, &2_000));
}

#[test]
fn a_timestamp_in_an_inverted_window_between_the_bounds_is_rejected() {
    // Even though 150 is numerically "between" 200 and 100, an inverted
    // window is malformed and matches nothing.
    assert!(!in_window(150, 200, 100));
}

#[test]
fn an_inverted_window_value_type_never_contains_anything() {
    let window = Window::new(200, 100);

    assert!(!window.contains(150));
    assert!(!window.contains(100));
    assert!(!window.contains(200));
    assert!(!window.contains(0));
    assert!(!window.contains(u64::MAX));
    assert_eq!(window.span(), None);
    assert!(window.is_inverted());
}

#[test]
fn an_almost_inverted_window_is_still_empty_for_the_gap() {
    let (_env, client) = setup();

    // start = 101, end = 100 — off by one, still empty.
    assert!(!client.in_window(&100, &101, &100));
    assert!(!client.in_window(&101, &101, &100));
    assert_eq!(window_len(101, 100), None);
}

#[test]
fn rejection_is_total_and_deterministic() {
    let (_env, client) = setup();

    // A rejected query is a plain `false`, never a panic or an error trap.
    for ts in [0_u64, 1, 99, 100, 150, 200, 201, u64::MAX] {
        assert!(!client.in_window(&ts, &200, &100));
        assert!(!client.in_window(&ts, &101, &100));
    }
}
