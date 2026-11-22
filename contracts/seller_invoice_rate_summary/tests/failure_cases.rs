//! Failure / degenerate-input tests for `seller-invoice-rate-summary`.
//!
//! The summary never traps — degenerate inputs simply report `0` or count
//! exactly what qualifies. These tests pin down empty lists, zero windows,
//! future-dated records, duplicate floods, and unsorted input.

mod common;

use common::{ledgers, setup};

#[test]
fn an_empty_list_always_counts_zero() {
    let (env, client) = setup();
    let records = ledgers(&env, &[]);

    assert_eq!(client.count_in_recent_window(&records, &100, &10), 0);
    assert_eq!(client.count_in_recent_window(&records, &100, &0), 0);
    assert_eq!(client.count_in_recent_window(&records, &100, &u32::MAX), 0);
}

#[test]
fn a_zero_window_counts_zero_even_for_the_current_ledger() {
    let (env, client) = setup();
    let records = ledgers(&env, &[100, 100, 100]);

    assert_eq!(client.count_in_recent_window(&records, &100, &0), 0);
    assert_eq!(client.summarize(&records, &100, &0).count, 0);
}

#[test]
fn future_dated_entries_are_ignored_not_counted() {
    let (env, client) = setup();
    let records = ledgers(&env, &[101, 150, 1_000]);

    // Everything is above current_ledger = 100: nothing counts, even with
    // an enormous window.
    assert_eq!(client.count_in_recent_window(&records, &100, &10_000), 0);
}

#[test]
fn a_mixed_list_ignores_only_its_future_entries() {
    let (env, client) = setup();
    let records = ledgers(&env, &[95, 100, 101, 105]);

    // 95 and 100 count; 101 and 105 are future-dated relative to 100.
    assert_eq!(client.count_in_recent_window(&records, &100, &1_000), 2);
    // Advance the clock: the future entries become present, and 95 falls
    // out of a 10-ledger window at the same time.
    assert_eq!(client.count_in_recent_window(&records, &105, &10), 3);
}

#[test]
fn duplicate_entries_count_separately_without_wrapping() {
    let (env, client) = setup();
    let entries = vec![100_u32; 1_000];
    let records = ledgers(&env, &entries);

    // One thousand invoices in a single ledger are one thousand invoices.
    assert_eq!(client.count_in_recent_window(&records, &100, &10), 1_000);

    // All of them are future-dated one ledger earlier.
    assert_eq!(client.count_in_recent_window(&records, &99, &10), 0);
}

#[test]
fn unsorted_input_produces_the_same_count_as_sorted_input() {
    let (env, client) = setup();
    let unsorted = ledgers(&env, &[100, 80, 95, 99]);
    let sorted = ledgers(&env, &[80, 95, 99, 100]);
    let reversed = ledgers(&env, &[100, 99, 95, 80]);

    let expected = 3; // 95, 99, 100 are inside 91..=100.
    assert_eq!(
        client.count_in_recent_window(&unsorted, &100, &10),
        expected
    );
    assert_eq!(client.count_in_recent_window(&sorted, &100, &10), expected);
    assert_eq!(
        client.count_in_recent_window(&reversed, &100, &10),
        expected
    );
}

#[test]
fn a_single_too_old_entry_counts_zero_without_panicking() {
    let (env, client) = setup();
    let records = ledgers(&env, &[1]);

    assert_eq!(client.count_in_recent_window(&records, &u32::MAX, &10), 0);
}

#[test]
fn zero_everywhere_is_zero_everywhere() {
    let (env, client) = setup();
    let records = ledgers(&env, &[0, 0, 0]);

    // current_ledger = 0, window = 0 → empty window, nothing counts.
    assert_eq!(client.count_in_recent_window(&records, &0, &0), 0);
    // current_ledger = 0, window = 1 → the three entries at ledger 0 count.
    assert_eq!(client.count_in_recent_window(&records, &0, &1), 3);
}
