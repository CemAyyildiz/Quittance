use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::storage;

/// Sets the allowlist for a given invoice.
///
/// An empty vector clears the allowlist, allowing all payers.
/// A non-empty vector restricts payment to only the addresses in the list.
pub(crate) fn set_allowlist(env: &Env, invoice_id: &Symbol, payers: &Vec<Address>) {
    storage::set_allowlist(env, invoice_id, payers);
}

/// Checks if a payer is allowed to pay a specific invoice.
///
/// Returns `true` if:
/// - No allowlist has been set for this invoice (default allow all)
/// - The payer is in the allowlist
///
/// Returns `false` if:
/// - An allowlist exists but the payer is not in it
pub(crate) fn is_allowed(env: &Env, invoice_id: &Symbol, payer: &Address) -> bool {
    match storage::get_allowlist(env, invoice_id) {
        None => {
            // No allowlist set, allow everyone
            true
        }
        Some(allowlist) => {
            // Allowlist exists, check if payer is in it
            is_address_in_list(&allowlist, payer)
        }
    }
}

/// Helper function to check if an address is in a vector of addresses.
fn is_address_in_list(list: &Vec<Address>, addr: &Address) -> bool {
    for i in 0..list.len() {
        if let Some(item) = list.get(i) {
            if &item == addr {
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn is_address_in_list_finds_address() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        let list = soroban_sdk::vec![&env, alice.clone(), bob.clone()];

        assert!(is_address_in_list(&list, &alice));
        assert!(is_address_in_list(&list, &bob));
        assert!(!is_address_in_list(&list, &charlie));
    }

    #[test]
    fn is_address_in_list_empty_list() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let list: Vec<Address> = soroban_sdk::vec![&env];

        assert!(!is_address_in_list(&list, &alice));
    }
}
