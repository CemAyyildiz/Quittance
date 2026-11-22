use soroban_sdk::contracterror;

/// Errors returned by the confirmation quorum contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    /// The quorum was already configured; the observer set is immutable.
    AlreadyInitialized = 1,
    /// The quorum was not configured yet.
    NotInitialized = 2,
    /// The observer set was empty; a quorum needs at least one observer.
    EmptyObserverSet = 3,
    /// The observer set exceeded the maximum supported size.
    TooManyObservers = 4,
    /// The observer set contained the same address more than once.
    DuplicateObserver = 5,
    /// The caller is not part of the configured observer set.
    NotObserver = 6,
    /// The observer already confirmed this payment reference.
    AlreadyConfirmed = 7,
}
