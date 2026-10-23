use crate::{Channel, Error, PaymentChannelTag, PaymentChannelTagClient};
use soroban_sdk::{symbol_short, Env};

fn setup(env: &Env) -> (PaymentChannelTagClient<'_>, soroban_sdk::Symbol) {
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(env, &contract_id);
    (client, symbol_short!("PAY1"))
}

#[test]
fn rejects_a_second_tag_with_the_same_channel() {
    let env = Env::default();
    let (client, payment) = setup(&env);

    client.tag_channel(&payment, &Channel::Web);
    assert_eq!(
        client
            .try_tag_channel(&payment, &Channel::Web)
            .unwrap_err()
            .unwrap(),
        Error::AlreadyTagged
    );
    assert_eq!(client.channel_of(&payment), Some(Channel::Web));
}

#[test]
fn rejects_overwriting_with_a_different_channel() {
    let env = Env::default();
    let (client, payment) = setup(&env);

    client.tag_channel(&payment, &Channel::Web);
    assert_eq!(
        client
            .try_tag_channel(&payment, &Channel::App)
            .unwrap_err()
            .unwrap(),
        Error::AlreadyTagged
    );
    assert_eq!(client.channel_of(&payment), Some(Channel::Web));
}

#[test]
fn repeated_failures_never_change_the_stored_channel() {
    let env = Env::default();
    let (client, payment) = setup(&env);

    client.tag_channel(&payment, &Channel::Api);

    for channel in [Channel::Web, Channel::App, Channel::Api] {
        assert_eq!(
            client
                .try_tag_channel(&payment, &channel)
                .unwrap_err()
                .unwrap(),
            Error::AlreadyTagged
        );
        assert_eq!(client.channel_of(&payment), Some(Channel::Api));
    }
}
