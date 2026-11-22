use crate::{Channel, PaymentChannelTag, PaymentChannelTagClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn tags_an_untagged_payment() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let payment = symbol_short!("PAY1");

    assert_eq!(client.channel_of(&payment), None);

    client.tag_channel(&payment, &Channel::Web);

    assert_eq!(client.channel_of(&payment), Some(Channel::Web));
}

#[test]
fn stored_channel_is_stable_across_reads() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let payment = symbol_short!("PAY1");

    client.tag_channel(&payment, &Channel::App);

    assert_eq!(client.channel_of(&payment), Some(Channel::App));
    assert_eq!(client.channel_of(&payment), Some(Channel::App));
    assert_eq!(client.channel_of(&payment), Some(Channel::App));
}

#[test]
fn tags_a_payment_id_that_was_never_seen_before() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let payment = symbol_short!("NEWPAY");

    // The tag store does not require a prior payment record.
    client.tag_channel(&payment, &Channel::Api);

    assert_eq!(client.channel_of(&payment), Some(Channel::Api));
}
