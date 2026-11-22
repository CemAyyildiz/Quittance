use soroban_sdk::Env;

use crate::storage;

pub(crate) fn require(env: &Env) {
    storage::admin(env).require_auth();
}
