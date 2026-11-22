use soroban_sdk::{Address, Vec};

use crate::errors::Error;
use crate::types::MAX_OBSERVERS;

/// Validate a candidate observer set.
///
/// A quorum needs at least one observer, cannot hold more than `MAX_OBSERVERS`
/// observers, and cannot list the same address twice: a duplicated observer
/// would otherwise be able to count as two independent confirmations.
pub fn validate(observers: &Vec<Address>) -> Result<(), Error> {
    if observers.is_empty() {
        return Err(Error::EmptyObserverSet);
    }
    if observers.len() > MAX_OBSERVERS {
        return Err(Error::TooManyObservers);
    }
    if has_duplicates(observers) {
        return Err(Error::DuplicateObserver);
    }
    Ok(())
}

/// Return whether `observer` is a member of `observers`.
pub fn contains(observers: &Vec<Address>, observer: &Address) -> bool {
    observers.contains(observer)
}

/// Return whether the observer set lists an address more than once.
fn has_duplicates(observers: &Vec<Address>) -> bool {
    let len = observers.len();
    for i in 0..len {
        for j in (i + 1)..len {
            if observers.get_unchecked(i) == observers.get_unchecked(j) {
                return true;
            }
        }
    }
    false
}
