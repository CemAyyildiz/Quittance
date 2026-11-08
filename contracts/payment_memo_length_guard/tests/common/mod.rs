use payment_memo_length_guard::{PaymentMemoLengthGuard, PaymentMemoLengthGuardClient};
use soroban_sdk::Env;

pub fn setup() -> (Env, PaymentMemoLengthGuardClient<'static>) {
    let env = Env::default();
    let id = env.register(PaymentMemoLengthGuard, ());
    let client = PaymentMemoLengthGuardClient::new(&env, &id);
    (env, client)
}
