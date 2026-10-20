//! Boundary and edge-case integration tests for the window arithmetic.

use sliding_window_counter::{SlidingWindowCounter, SlidingWindowCounterClient};
use soroban_sdk::Env;

fn setup() -> (Env, SlidingWindowCounterClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SlidingWindowCounter, ());
    let client = SlidingWindowCounterClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn a_zero_ledger_window_is_empty() {
    let (_env, client) = setup();
    client.record(&100);

    assert_eq!(client.count_in_window(&100, &0), 0);
    assert_eq!(client.count_in_window(&100, &1), 1);
}

#[test]
fn the_window_start_ledger_is_included() {
    let (_env, client) = setup();
    client.record(&91);
    client.record(&90);

    // A ten-ledger window ending at 100 covers ledgers 91..=100.
    assert_eq!(client.count_in_window(&100, &10), 1);
}

#[test]
fn the_ledger_before_the_window_start_is_excluded() {
    let (_env, client) = setup();
    client.record(&90);

    assert_eq!(client.count_in_window(&100, &10), 0);
    assert_eq!(client.count_in_window(&100, &11), 1);
}

#[test]
fn events_recorded_in_the_future_are_not_counted() {
    let (_env, client) = setup();
    client.record(&100);
    client.record(&500);

    assert_eq!(client.count_in_window(&100, &10), 1);
    assert_eq!(client.count_in_window(&500, &10), 1);
    assert_eq!(client.count_in_window(&500, &401), 2);
}

#[test]
fn extreme_ledgers_do_not_overflow() {
    let (_env, client) = setup();
    client.record(&0);
    client.record(&u32::MAX);

    assert_eq!(client.total(), 2);
    assert_eq!(client.count_in_window(&0, &u32::MAX), 1);
    assert_eq!(client.count_in_window(&u32::MAX, &u32::MAX), 1);
}
