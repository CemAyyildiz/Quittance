//! Validation utilities for allowlist operations.

use soroban_sdk::{Address, Vec};

/// Validates that an allowlist does not contain duplicate addresses.
///
/// Note: This is an informational check. The contract will still function
/// correctly with duplicates, but they waste storage space.
#[allow(dead_code)]
pub(crate) fn has_duplicates(list: &Vec<Address>) -> bool {
    let len = list.len();
    for i in 0..len {
        if let Some(addr_i) = list.get(i) {
            for j in (i + 1)..len {
                if let Some(addr_j) = list.get(j) {
                    if addr_i == addr_j {
                        return true;
                    }
                }
            }
        }
    }
    false
}

/// Counts the number of addresses in an allowlist.
#[allow(dead_code)]
pub(crate) fn count_addresses(list: &Vec<Address>) -> u32 {
    list.len()
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn no_duplicates_in_unique_list() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let list = soroban_sdk::vec![&env, alice, bob];
        assert!(!has_duplicates(&list));
    }

    #[test]
    fn detects_duplicates() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let list = soroban_sdk::vec![&env, alice.clone(), bob, alice.clone()];
        assert!(has_duplicates(&list));
    }

    #[test]
    fn empty_list_has_no_duplicates() {
        let env = Env::default();
        let list: Vec<Address> = soroban_sdk::vec![&env];
        assert!(!has_duplicates(&list));
    }

    #[test]
    fn single_address_has_no_duplicates() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let list = soroban_sdk::vec![&env, alice];
        assert!(!has_duplicates(&list));
    }

    #[test]
    fn count_addresses_works() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        let empty: Vec<Address> = soroban_sdk::vec![&env];
        assert_eq!(count_addresses(&empty), 0);

        let list1 = soroban_sdk::vec![&env, alice.clone()];
        assert_eq!(count_addresses(&list1), 1);

        let list3 = soroban_sdk::vec![&env, alice, bob, charlie];
        assert_eq!(count_addresses(&list3), 3);
    }
}
