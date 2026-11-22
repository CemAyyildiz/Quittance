//! Happy-path tests for `ledger-window-guard`.
//!
//! These cover the ordinary case: timestamps that are clearly inside or
//! clearly outside a well-formed window.

mod common;

use common::setup;
use ledger_window_guard::{in_window, window_len, Window};

#[test]
fn a_timestamp_strictly_inside_the_window_is_in_bounds() {
    let (_env, client) = setup();

    assert!(client.in_window(&150, &100, &200));
}

#[test]
fn timestamps_outside_the_window_are_rejected() {
    let (_env, client) = setup();

    assert!(!client.in_window(&99, &100, &200));
    assert!(!client.in_window(&201, &100, &200));
}

#[test]
fn both_bounds_are_inclusive() {
    let (_env, client) = setup();

    assert!(client.in_window(&100, &100, &200));
    assert!(client.in_window(&200, &100, &200));
}

#[test]
fn a_window_that_has_not_opened_yet_rejects_everything_before_it() {
    let (_env, client) = setup();

    // The window opens in the future: nothing is inside it yet.
    assert!(!client.in_window(&500, &1_000, &2_000));
    assert!(!client.in_window(&999, &1_000, &2_000));
}

#[test]
fn the_contract_and_the_free_function_agree() {
    let (_env, client) = setup();

    let samples: [(u64, u64, u64); 6] = [
        (150, 100, 200),
        (99, 100, 200),
        (201, 100, 200),
        (100, 100, 200),
        (200, 100, 200),
        (150, 200, 100), // inverted
    ];
    for (ts, start, end) in samples {
        assert_eq!(
            client.in_window(&ts, &start, &end),
            in_window(ts, start, end),
            "contract and free function disagree for ts={ts} window=[{start}, {end}]"
        );
    }
}

#[test]
fn the_window_value_type_matches_the_predicate() {
    let window = Window::new(100, 200);

    assert!(window.contains(150));
    assert!(window.contains(100));
    assert!(window.contains(200));
    assert!(!window.contains(99));
    assert!(!window.contains(201));
    assert_eq!(window.span(), Some(100));
    assert!(!window.is_inverted());
}

#[test]
fn window_len_reports_the_width_of_a_well_formed_window() {
    assert_eq!(window_len(100, 200), Some(100));
    assert_eq!(window_len(1_000_000, 1_000_300), Some(300));
}
