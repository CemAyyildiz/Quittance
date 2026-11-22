//! Scenario tests for `ledger-window-guard`.
//!
//! These exercise the guard the way Quittance-style subsystems would use
//! it: retry grace windows, hourly timestamp buckets, and a window that is
//! re-evaluated as ledger time advances.

mod common;

use common::setup;
use ledger_window_guard::{in_window, Window};

#[test]
fn a_payment_retry_grace_window_accepts_only_attempts_inside_it() {
    let (_env, client) = setup();

    // An invoice created at t = 1_000_000 opens a 300-second retry window.
    let opened_at = 1_000_000_u64;
    let grace = 300_u64;
    let (start, end) = (opened_at, opened_at + grace);

    // First attempt immediately, a late attempt at the last allowed second,
    // and a too-late attempt one second after the window closes.
    assert!(client.in_window(&1_000_010, &start, &end));
    assert!(client.in_window(&1_000_300, &start, &end));
    assert!(!client.in_window(&1_000_301, &start, &end));

    // Attempts from before the invoice existed are outside as well.
    assert!(!client.in_window(&999_999, &start, &end));
}

#[test]
fn hourly_timestamp_buckets_partition_a_day_without_gaps_or_overlap() {
    let (_env, client) = setup();

    // Hour 14: [14 * 3600, 14 * 3600 + 3599].
    let start = 14 * 3_600_u64;
    let end = start + 3_599;

    // The last second of hour 13 is outside hour 14.
    assert!(!client.in_window(&(start - 1), &start, &end));
    // First and last second of hour 14 are inside.
    assert!(client.in_window(&start, &start, &end));
    assert!(client.in_window(&end, &start, &end));
    // The first second of hour 15 is outside hour 14.
    assert!(!client.in_window(&(end + 1), &start, &end));
}

#[test]
fn a_moving_window_is_re_evaluated_as_ledger_time_advances() {
    let (_env, client) = setup();

    // A 100-second window anchored at t0 slides forward with "now".
    let window = Window::new(1_000, 1_100);

    assert!(window.contains(1_050));

    // Time advances past the window: the same timestamp falls out.
    let later = Window::new(1_101, 1_200);
    assert!(!later.contains(1_050));

    // The contract agrees with the value type at every step.
    assert!(client.in_window(&1_050, &1_000, &1_100));
    assert!(!client.in_window(&1_050, &1_101, &1_200));
}

#[test]
fn overlapping_retry_windows_are_evaluated_independently() {
    let (_env, client) = setup();

    // Two invoices, two overlapping grace windows.
    let invoice_a = (1_000_u64, 1_300_u64);
    let invoice_b = (1_150_u64, 1_450_u64);

    let t = 1_200_u64;
    assert!(client.in_window(&t, &invoice_a.0, &invoice_a.1));
    assert!(client.in_window(&t, &invoice_b.0, &invoice_b.1));

    let late = 1_400_u64;
    assert!(!client.in_window(&late, &invoice_a.0, &invoice_a.1));
    assert!(client.in_window(&late, &invoice_b.0, &invoice_b.1));

    // Cross-check against the free function.
    assert!(!in_window(late, invoice_a.0, invoice_a.1));
}
