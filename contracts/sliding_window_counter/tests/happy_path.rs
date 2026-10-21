//! Happy-path integration tests: recording events and counting them.

use sliding_window_counter::{SlidingWindowCounter, SlidingWindowCounterClient};
use soroban_sdk::Env;

fn setup() -> (Env, SlidingWindowCounterClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SlidingWindowCounter, ());
    let client = SlidingWindowCounterClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn recorded_events_are_counted_in_the_window() {
    let (_env, client) = setup();

    assert_eq!(client.record(&100), 1);
    assert_eq!(client.record(&101), 2);
    assert_eq!(client.record(&102), 3);

    assert_eq!(client.total(), 3);
    assert_eq!(client.count_in_window(&102, &3), 3);
}

#[test]
fn the_window_slides_forward_with_the_chain() {
    let (_env, client) = setup();
    client.record(&100);
    client.record(&101);
    client.record(&102);

    // A window of two ledgers ending at 102 covers ledgers 101 and 102.
    assert_eq!(client.count_in_window(&102, &2), 2);

    // Moving the window forward drops the oldest event.
    assert_eq!(client.count_in_window(&103, &2), 1);
    assert_eq!(client.count_in_window(&105, &2), 0);
}

#[test]
fn a_window_wider_than_the_history_counts_everything() {
    let (_env, client) = setup();
    client.record(&1);
    client.record(&2);

    assert_eq!(client.count_in_window(&2, &1_000), 2);
    assert_eq!(client.count_in_window(&2, &u32::MAX), 2);
}
