use crate::{Channel, PaymentChannelTag, PaymentChannelTagClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn every_channel_round_trips_through_storage() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);

    let web_payment = symbol_short!("WEBPAY");
    let app_payment = symbol_short!("APPPAY");
    let api_payment = symbol_short!("APIPAY");

    client.tag_channel(&web_payment, &Channel::Web);
    client.tag_channel(&app_payment, &Channel::App);
    client.tag_channel(&api_payment, &Channel::Api);

    assert_eq!(client.channel_of(&web_payment), Some(Channel::Web));
    assert_eq!(client.channel_of(&app_payment), Some(Channel::App));
    assert_eq!(client.channel_of(&api_payment), Some(Channel::Api));
}

#[test]
fn a_payment_cannot_move_between_channels() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let payment = symbol_short!("PAY1");

    client.tag_channel(&payment, &Channel::Web);

    for channel in [Channel::App, Channel::Api] {
        assert!(client.try_tag_channel(&payment, &channel).is_err());
        assert_eq!(client.channel_of(&payment), Some(Channel::Web));
    }
}

#[test]
fn write_once_is_scoped_to_a_single_payment() {
    let env = Env::default();
    let contract_id = env.register(PaymentChannelTag, ());
    let client = PaymentChannelTagClient::new(&env, &contract_id);
    let tagged = symbol_short!("TAGGED");
    let untagged = symbol_short!("UNTAGGED");

    client.tag_channel(&tagged, &Channel::App);
    assert!(client.try_tag_channel(&tagged, &Channel::Web).is_err());

    // A rejected tag on `tagged` must not affect another payment.
    client.tag_channel(&untagged, &Channel::Web);
    assert_eq!(client.channel_of(&untagged), Some(Channel::Web));
    assert_eq!(client.channel_of(&tagged), Some(Channel::App));
}
