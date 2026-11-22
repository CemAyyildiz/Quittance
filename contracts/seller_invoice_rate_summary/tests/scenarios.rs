//! Scenario tests for `seller-invoice-rate-summary`.
//!
//! These exercise the summary the way a rolling rate report would use it:
//! a window that slides ledger by ledger, independent per-seller reports,
//! and order-independence of the final snapshot.

mod common;

use common::{ledgers, setup};

#[test]
fn the_count_rises_and_then_decays_as_the_ledger_advances() {
    let (env, client) = setup();

    // Ten invoices created at ledgers 10..=19, watched with a 10-ledger
    // rolling window as the chain advances from ledger 10 to 39.
    let entries: Vec<u32> = (10..20).collect();
    let records = ledgers(&env, &entries);

    // The window first swallows the burst one ledger at a time (counts
    // 1..=10), then the burst ages out the far end (counts 9..=0), and the
    // report stays at 0 once every entry has left the window.
    let expected: [u32; 30] = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, // current 10..=19: rising
        9, 8, 7, 6, 5, 4, 3, 2, 1, 0, // current 20..=29: decaying
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // current 30..=39: empty
    ];
    for (i, current) in (10..40).enumerate() {
        assert_eq!(
            client.count_in_recent_window(&records, &current, &10),
            expected[i],
            "at current_ledger={current}"
        );
    }
}

#[test]
fn two_sellers_lists_are_summarized_independently() {
    let (env, client) = setup();

    // Seller A invoices steadily and recently…
    let alice = ledgers(&env, &[98, 99, 100]);
    // …seller B last invoiced long ago.
    let bob = ledgers(&env, &[10, 20, 30]);

    // Same window, same current ledger, two completely different reports.
    assert_eq!(client.count_in_recent_window(&alice, &100, &10), 3);
    assert_eq!(client.count_in_recent_window(&bob, &100, &10), 0);

    // Widening B's window to cover all of history surfaces B's invoices…
    assert_eq!(client.count_in_recent_window(&bob, &100, &200), 3);
    // …while A's report is unchanged: the lists never interact.
    assert_eq!(client.count_in_recent_window(&alice, &100, &200), 3);
}

#[test]
fn the_summary_is_order_independent() {
    let (env, client) = setup();
    let sorted = ledgers(&env, &[80, 91, 95, 100, 120]);
    let shuffled = ledgers(&env, &[100, 120, 80, 95, 91]);
    let reversed = ledgers(&env, &[120, 100, 95, 91, 80]);

    assert_eq!(
        client.summarize(&sorted, &100, &10),
        client.summarize(&shuffled, &100, &10)
    );
    assert_eq!(
        client.summarize(&sorted, &100, &10),
        client.summarize(&reversed, &100, &10)
    );
    assert_eq!(client.summarize(&shuffled, &100, &10).count, 3);
}

#[test]
fn a_venue_report_of_a_bursty_day_tells_the_whole_story() {
    let (env, client) = setup();

    // A bursty day: a morning cluster, a quiet gap, an evening cluster.
    let morning = [5_u32, 6, 7, 8];
    let gap = [15_u32, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    let evening = [40_u32, 41, 42];
    let mut all: Vec<u32> = Vec::new();
    all.extend_from_slice(&morning);
    all.extend_from_slice(&gap);
    all.extend_from_slice(&evening);
    let records = ledgers(&env, &all);

    // Mid-morning (ledger 9, window 10): only the morning cluster so far.
    assert_eq!(client.count_in_recent_window(&records, &9, &10), 4);
    // Mid-afternoon (ledger 26, window 10 → 17..=26): the quiet gap's tail.
    assert_eq!(client.count_in_recent_window(&records, &26, &10), 9);
    // Evening (ledger 42, window 10 → 33..=42): just the evening cluster.
    assert_eq!(client.count_in_recent_window(&records, &42, &10), 3);
    // End of day (ledger 60, window 10): everything has aged out.
    assert_eq!(client.count_in_recent_window(&records, &60, &10), 0);
    // But the whole day, seen in one wide window, holds all 18 invoices.
    assert_eq!(client.count_in_recent_window(&records, &60, &100), 18);
}
