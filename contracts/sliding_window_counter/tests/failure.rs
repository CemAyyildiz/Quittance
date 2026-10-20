//! Failure-mode integration tests.
//!
//! The counter API is total: it has no fallible entry points, so there is no
//! error variant to match. This suite pins that contract instead: the
//! counter must never panic and must always answer with a well-defined
//! number, even for degenerate inputs.

use sliding_window_counter::{SlidingWindowCounter, SlidingWindowCounterClient};
use soroban_sdk::Env;

fn setup() -> (Env, SlidingWindowCounterClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SlidingWindowCounter, ());
    let client = SlidingWindowCounterClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn querying_an_empty_counter_returns_zero() {
    let (_env, client) = setup();

    assert_eq!(client.total(), 0);
    assert_eq!(client.count_in_window(&0, &0), 0);
    assert_eq!(client.count_in_window(&1_000, &10), 0);
}

#[test]
fn pruning_an_empty_counter_is_a_no_op() {
    let (_env, client) = setup();

    assert_eq!(client.prune(&100, &10), 0);
    assert_eq!(client.total(), 0);
}

#[test]
fn clearing_an_empty_counter_is_a_no_op() {
    let (_env, client) = setup();

    assert_eq!(client.clear(), 0);
    assert_eq!(client.total(), 0);
}

#[test]
fn recording_the_same_ledger_many_times_still_counts_every_event() {
    let (_env, client) = setup();

    for expected in 1..=5_u32 {
        assert_eq!(client.record(&42), expected);
    }

    assert_eq!(client.total(), 5);
    assert_eq!(client.count_in_window(&42, &1), 5);
}

#[test]
fn a_window_that_reaches_before_the_first_ledger_is_saturated() {
    let (_env, client) = setup();
    client.record(&3);

    // The window would start below ledger 0, so it saturates at 0.
    assert_eq!(client.count_in_window(&3, &1_000), 1);
    assert_eq!(client.count_in_window(&0, &1_000), 0);
}

#[test]
fn pruning_never_removes_future_events() {
    let (_env, client) = setup();
    client.record(&100);
    client.record(&500);

    assert_eq!(client.prune(&200, &10), 1);
    assert_eq!(client.total(), 1);
    assert_eq!(client.count_in_window(&500, &10), 1);
}
