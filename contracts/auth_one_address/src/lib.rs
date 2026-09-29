#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Minimal demo contract: a no-op method gated behind single-Address authorization.
///
/// This contract demonstrates the standard Soroban auth pattern:
/// call `user.require_auth()` before performing any contract logic.
/// The `noop` method does nothing beyond requiring the caller's authorization,
/// making it a clean reference for integrating auth into real contracts.
#[contract]
pub struct AuthOneAddress;

#[contractimpl]
impl AuthOneAddress {
    /// A no-op method that requires `user` to have authorized the invocation.
    ///
    /// # Authorization
    /// The caller must include a valid `SorobanAuthorizedInvocation` for `user`
    /// in the transaction envelope. Without it the call will fail with an
    /// `AuthorizationError`.
    ///
    /// # Usage (from dapp / wallet)
    /// ```
    /// // 1. Build a transaction that invokes noop(&user)
    /// // 2. Sign with the user's key via Freighter / wallet SDK
    /// // 3. Submit — the contract verifies require_auth on-chain
    /// ```
    pub fn noop(env: Env, user: Address) {
        // Require that `user` has authorized this contract call.
        // Panics with `AuthorizationError` if the transaction
        // envelope does not contain a valid signed authorization
        // tree rooted at `user`.
        user.require_auth();

        // No-op: this method intentionally performs no state changes.
        // Embed real logic here in derived contracts.
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, MockAuth, MockAuthInvoke},
        Env, IntoVal,
    };

    /// Helper: register the contract and return a typed client handle.
    fn setup(env: &Env) -> AuthOneAddressClient<'static> {
        let contract_id = env.register_contract(None, AuthOneAddress);
        AuthOneAddressClient::new(env, &contract_id)
    }

    /// Calling noop with mock auth should succeed.
    #[test]
    fn noop_with_valid_auth_succeeds() {
        let env = Env::default();
        let client = setup(&env);
        let user = Address::generate(&env);

        // mock_all_auths tells the test environment to auto-approve
        // every require_auth call, letting us focus on contract logic.
        env.mock_all_auths();

        client.noop(&user);
    }

    /// Calling noop *without* mock auth should panic with an auth error.
    #[test]
    #[should_panic(expected = "Error(Auth")]
    fn noop_without_auth_panics() {
        let env = Env::default();
        let client = setup(&env);
        let user = Address::generate(&env);

        // Do NOT call env.mock_all_auths() — the contract must reject the call.
        client.noop(&user);
    }

    /// Calling noop with an *unauthorized* caller should panic with an auth
    /// error: the signed authorization is rooted at `authorized`, which does
    /// not match the `user` argument, so `user.require_auth()` must reject it.
    #[test]
    #[should_panic(expected = "Error(Auth")]
    fn noop_with_unauthorized_caller_panics() {
        let env = Env::default();
        let contract_id = env.register_contract(None, AuthOneAddress);
        let client = AuthOneAddressClient::new(&env, &contract_id);
        let authorized = Address::generate(&env);
        let user = Address::generate(&env);

        // Sign an authorization root for `authorized`, then invoke `noop`
        // with a different `user`. The caller is unauthorized.
        client
            .mock_auths(&[MockAuth {
                address: &authorized,
                invoke: &MockAuthInvoke {
                    contract: &contract_id,
                    fn_name: "noop",
                    args: (&user,).into_val(&env),
                    sub_invokes: &[],
                },
            }])
            .noop(&user);
    }
}
