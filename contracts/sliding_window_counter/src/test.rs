//! Unit tests for the counter's contract surface.

use crate::{SlidingWindowCounter, SlidingWindowCounterClient};
use soroban_sdk::Env;

fn setup() -> (Env, SlidingWindowCounterClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SlidingWindowCounter, ());
    let client = SlidingWindowCounterClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn a_fresh_counter_is_empty() {
    let (_env, client) = setup();

    assert_eq!(client.total(), 0);
    assert_eq!(client.count_in_window(&100, &10), 0);
}

#[test]
fn recording_returns_the_running_total() {
    let (_env, client) = setup();

    assert_eq!(client.record(&100), 1);
    assert_eq!(client.record(&101), 2);
    assert_eq!(client.total(), 2);
}

#[test]
fn events_age_out_of_the_window() {
    let (_env, client) = setup();
    client.record(&100);
    client.record(&101);

    assert_eq!(client.count_in_window(&101, &2), 2);
    assert_eq!(client.count_in_window(&101, &1), 1);
    assert_eq!(client.count_in_window(&110, &10), 1);
}

#[test]
fn pruning_drops_old_events_only() {
    let (_env, client) = setup();
    client.record(&100);
    client.record(&105);
    client.record(&120);

    // A five-ledger window ending at 110 covers ledgers 106..=110, so the
    // events at 100 and 105 are pruned while the future event at 120 stays.
    assert_eq!(client.prune(&110, &5), 1);
    assert_eq!(client.total(), 1);
    assert_eq!(client.count_in_window(&120, &50), 1);
}

#[test]
fn clearing_removes_everything() {
    let (_env, client) = setup();
    client.record(&100);
    client.record(&101);

    assert_eq!(client.clear(), 2);
    assert_eq!(client.total(), 0);
    assert_eq!(client.count_in_window(&101, &10), 0);
}
