use crate::{Channel, PaymentChannelTag, PaymentChannelTagClient};
use soroban_sdk::{symbol_short, Env, Symbol};

#[test]
fn untagged_payment_has_no_channel() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);

    assert_eq!(client.channel_of(&symbol_short!("MISSING")), None);
}

#[test]
fn maximum_length_symbol_is_a_valid_payment_id() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let payment = Symbol::new(&env, "ABCDEFGHIJKLMNOPQRSTUVWX12345678");

    client.tag_channel(&payment, &Channel::Api);

    assert_eq!(client.channel_of(&payment), Some(Channel::Api));
}

#[test]
fn single_character_symbol_is_a_valid_payment_id() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let payment = Symbol::new(&env, "P");

    client.tag_channel(&payment, &Channel::Web);

    assert_eq!(client.channel_of(&payment), Some(Channel::Web));
}

#[test]
fn tags_are_kept_for_each_payment_id_separately() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let first = symbol_short!("PAY1");
    let second = symbol_short!("PAY2");

    client.tag_channel(&first, &Channel::Web);
    client.tag_channel(&second, &Channel::Api);

    assert_eq!(client.channel_of(&first), Some(Channel::Web));
    assert_eq!(client.channel_of(&second), Some(Channel::Api));
}
