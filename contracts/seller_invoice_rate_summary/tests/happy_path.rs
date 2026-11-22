//! Happy-path tests for `seller-invoice-rate-summary`.
//!
//! These cover the ordinary case: entries clearly inside or clearly outside
//! a well-formed window, and agreement between the contract and the free
//! function.

mod common;

use common::{ledgers, setup};
use seller_invoice_rate_summary::count_in_recent_window;

#[test]
fn entries_inside_the_window_are_counted() {
    let (env, client) = setup();
    let records = ledgers(&env, &[95, 98, 100]);

    // Window of 10 ending at 100 covers ledgers 91..=100.
    assert_eq!(client.count_in_recent_window(&records, &100, &10), 3);
}

#[test]
fn entries_outside_the_window_are_not_counted() {
    let (env, client) = setup();
    let records = ledgers(&env, &[80, 90]);

    assert_eq!(client.count_in_recent_window(&records, &100, &10), 0);
}

#[test]
fn a_mixed_list_counts_only_the_in_window_entries() {
    let (env, client) = setup();
    let records = ledgers(&env, &[80, 95, 100]);

    // 80 is outside (too old); 95 and 100 are inside.
    assert_eq!(client.count_in_recent_window(&records, &100, &10), 2);
}

#[test]
fn the_current_ledger_itself_counts() {
    let (env, client) = setup();
    let records = ledgers(&env, &[100]);

    assert_eq!(client.count_in_recent_window(&records, &100, &10), 1);
    assert_eq!(client.count_in_recent_window(&records, &100, &1), 1);
}

#[test]
fn a_fully_in_window_list_counts_to_its_full_length() {
    let (env, client) = setup();
    let entries: Vec<u32> = (81..=100).collect();
    let records = ledgers(&env, &entries);

    assert_eq!(client.count_in_recent_window(&records, &100, &20), 20);
}

#[test]
fn the_contract_and_the_free_function_agree() {
    let (env, client) = setup();
    let records = ledgers(&env, &[80, 91, 95, 100, 101]);

    for (current, window) in [(100_u32, 10_u32), (105, 20), (95, 1), (200, 500)] {
        assert_eq!(
            client.count_in_recent_window(&records, &current, &window),
            count_in_recent_window([80_u32, 91, 95, 100, 101], current, window),
            "disagreement at current={current}, window={window}"
        );
    }
}

#[test]
fn the_summarize_entry_point_reports_the_same_count_with_context() {
    let (env, client) = setup();
    let records = ledgers(&env, &[95, 98, 100, 120]);

    let summary = client.summarize(&records, &100, &10);
    assert_eq!(summary.count, 3);
    assert_eq!(summary.current_ledger, 100);
    assert_eq!(summary.window, 10);
    assert_eq!(summary.window_start(), 91);
    assert!(!summary.is_empty());
}
