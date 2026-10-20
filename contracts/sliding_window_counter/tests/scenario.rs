//! Scenario tests: a burst of events aging out of a sliding window.

use sliding_window_counter::{SlidingWindowCounter, SlidingWindowCounterClient};
use soroban_sdk::Env;

fn setup() -> (Env, SlidingWindowCounterClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SlidingWindowCounter, ());
    let client = SlidingWindowCounterClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn a_burst_of_events_ages_out_one_ledger_at_a_time() {
    let (_env, client) = setup();
    for ledger in 100..105_u32 {
        client.record(&ledger);
    }

    // A ten-ledger window still sees the whole burst.
    assert_eq!(client.count_in_window(&104, &10), 5);

    // Pruning with a ten-ledger window keeps everything that is still fresh.
    assert_eq!(client.prune(&104, &10), 5);
    assert_eq!(client.total(), 5);
}

#[test]
fn a_tight_window_only_sees_the_most_recent_events() {
    let (_env, client) = setup();
    for ledger in 100..105_u32 {
        client.record(&ledger);
    }

    assert_eq!(client.count_in_window(&104, &2), 2);
    assert_eq!(client.count_in_window(&104, &3), 3);
    assert_eq!(client.count_in_window(&104, &5), 5);
}

#[test]
fn pruning_bounds_the_stored_history() {
    let (_env, client) = setup();
    for ledger in 100..110_u32 {
        client.record(&ledger);
    }
    assert_eq!(client.total(), 10);

    // Keep only the last three ledgers.
    assert_eq!(client.prune(&109, &3), 3);
    assert_eq!(client.total(), 3);
    assert_eq!(client.count_in_window(&109, &3), 3);
}

#[test]
fn a_second_burst_starts_from_a_clean_window() {
    let (_env, client) = setup();
    client.record(&100);
    client.record(&101);
    assert_eq!(client.count_in_window(&101, &10), 2);

    client.clear();
    assert_eq!(client.total(), 0);
    assert_eq!(client.count_in_window(&101, &10), 0);

    client.record(&200);
    assert_eq!(client.count_in_window(&200, &10), 1);
}
