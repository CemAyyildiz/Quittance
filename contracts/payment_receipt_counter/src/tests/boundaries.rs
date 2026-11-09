use crate::{checked_increment, Error};

#[test]
fn checked_increment_handles_u32_max_boundary() {
    assert_eq!(checked_increment(u32::MAX - 1), Ok(u32::MAX));
    assert_eq!(checked_increment(u32::MAX), Err(Error::CounterOverflow));
}
