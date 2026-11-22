//! Edge and boundary tests for `seller-invoice-rate-summary`.
//!
//! These pin the exact window boundary (age `== window` is excluded), the
//! degenerate windows (`0`, `1`, `u32::MAX`), and the extremes of the
//! ledger range.

mod common;

use common::{ledgers, setup};
use seller_invoice_rate_summary::{window_start, RateSummary};

#[test]
fn an_entry_exactly_window_ledgers_old_is_excluded() {
    let (env, client) = setup();
    let records = ledgers(&env, &[90]);

    // Age == 10 with window 10 → outside.
    assert_eq!(client.count_in_recent_window(&records, &100, &10), 0);
    // One ledger wider → age 10 < 11 → inside.
    assert_eq!(client.count_in_recent_window(&records, &100, &11), 1);
}

#[test]
fn one_ledger_newer_than_the_boundary_is_included() {
    let (env, client) = setup();
    let records = ledgers(&env, &[91]);

    // Ledger 91 is 9 ledgers old at 100: the first ledger inside a
    // 10-ledger window (91..=100).
    assert_eq!(client.count_in_recent_window(&records, &100, &10), 1);
    assert_eq!(client.count_in_recent_window(&records, &91, &10), 1);
    // The same entry is outside for a 9-ledger window at 100 (92..=100).
    assert_eq!(client.count_in_recent_window(&records, &100, &9), 0);
}

#[test]
fn a_window_of_one_counts_only_the_current_ledger() {
    let (env, client) = setup();
    let records = ledgers(&env, &[99, 100]);

    assert_eq!(client.count_in_recent_window(&records, &100, &1), 1);

    let only_current = ledgers(&env, &[100]);
    assert_eq!(client.count_in_recent_window(&only_current, &100, &1), 1);

    let only_previous = ledgers(&env, &[99]);
    assert_eq!(client.count_in_recent_window(&only_previous, &100, &1), 0);
}

#[test]
fn a_window_of_zero_counts_nothing() {
    let (env, client) = setup();
    let records = ledgers(&env, &[100, 99, 91]);

    assert_eq!(client.count_in_recent_window(&records, &100, &0), 0);
}

#[test]
fn current_ledger_zero_counts_ledger_zero_and_ignores_the_future() {
    let (env, client) = setup();
    let records = ledgers(&env, &[0, 1, 5]);

    // Only ledger 0 is not future-dated relative to current_ledger = 0.
    assert_eq!(client.count_in_recent_window(&records, &0, &5), 1);
    // And with an empty window, even that is out.
    assert_eq!(client.count_in_recent_window(&records, &0, &0), 0);
}

#[test]
fn a_window_of_u32_max_counts_every_non_future_entry() {
    let (env, client) = setup();
    let records = ledgers(&env, &[0, 50, 100, 101]);

    // current = 100: entries 0, 50, 100 are not future-dated; 101 is.
    assert_eq!(client.count_in_recent_window(&records, &100, &u32::MAX), 3);
}

#[test]
fn u32_max_ledgers_do_not_overflow() {
    let (env, client) = setup();
    let records = ledgers(&env, &[u32::MAX, u32::MAX - 10, u32::MAX - 11]);

    // Window of 10 at u32::MAX covers (MAX - 9)..=MAX: only the newest
    // entry is inside; the other two sit exactly on / below the boundary.
    assert_eq!(client.count_in_recent_window(&records, &u32::MAX, &10), 1);
    // Widen the window by one: the age-10 entry joins.
    assert_eq!(client.count_in_recent_window(&records, &u32::MAX, &11), 2);
}

#[test]
fn window_start_saturates_at_ledger_zero() {
    assert_eq!(window_start(5, 100), 0);
    assert_eq!(window_start(0, u32::MAX), 0);
    assert_eq!(window_start(100, 10), 91);
    assert_eq!(window_start(100, 1), 100);
    // window == 0 degenerates to the current ledger.
    assert_eq!(window_start(100, 0), 100);
}

#[test]
fn the_summary_snapshot_reports_boundary_context() {
    let (env, client) = setup();
    let empty = ledgers(&env, &[]);

    let summary = client.summarize(&empty, &100, &10);
    assert_eq!(summary.count, 0);
    assert_eq!(summary.window_start(), 91);
    assert!(summary.is_empty());

    // A window reaching before ledger 0 saturates its start at 0.
    let saturated = RateSummary::new(7, 5, 100);
    assert_eq!(saturated.window_start(), 0);
    assert!(!saturated.is_empty());

    // An empty window starts at the current ledger.
    let degenerate = RateSummary::new(0, 100, 0);
    assert_eq!(degenerate.window_start(), 100);
}
