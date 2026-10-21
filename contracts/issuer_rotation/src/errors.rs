use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotCurrentIssuer = 3,
    AlreadyRotated = 4,
    SameIssuer = 5,
}
