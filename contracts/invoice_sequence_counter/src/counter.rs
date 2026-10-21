//! In-memory per-seller invoice sequence counter.

use std::collections::BTreeMap;

use crate::types::{SellerId, SequenceError, SequenceVerdict, FIRST_SEQUENCE};

/// Issues monotonically increasing per-seller invoice sequence numbers.
///
/// This is the off-chain equivalent of a Soroban contract that would
/// expose:
///
/// - `next_seq(seller: Address) -> u64`
/// - `is_valid_seq(seller: Address, candidate: u64) -> bool`
///
/// `seller` is a `&str` here (the account id or contract address
/// rendered as text). Empty sellers are rejected with
/// [`SequenceError::EmptySeller`] instead of trapping. Each seller has
/// an independent counter. The first issued number is [`FIRST_SEQUENCE`]
/// (`1`). Every later call to [`Self::next_seq`] returns the previous
/// value plus one.
///
/// [`Self::is_valid_seq`] does not advance the counter. It returns
/// `true` only when `candidate` is exactly the next number that
/// [`Self::next_seq`] would issue. A replay of an already issued number
/// is a collision. A skip, a zero, or a check after [`u64::MAX`] is
/// out of order. Use [`Self::classify`] when the caller needs that
/// distinction.
///
/// # Example
///
/// ```
/// use invoice_sequence_counter::InvoiceSequenceCounter;
///
/// let mut counter = InvoiceSequenceCounter::new();
/// assert_eq!(counter.next_seq("seller-a").unwrap(), 1);
/// assert!(counter.is_valid_seq("seller-a", 2).unwrap());
/// assert!(!counter.is_valid_seq("seller-a", 1).unwrap());
/// assert_eq!(counter.next_seq("seller-b").unwrap(), 1);
/// ```
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct InvoiceSequenceCounter {
    last_by_seller: BTreeMap<String, u64>,
}

impl InvoiceSequenceCounter {
    /// Create a counter with no issued sequences.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Issue the next sequence number for `seller`.
    ///
    /// The first call for a seller returns `1`. Each later call returns
    /// the previous value plus one and stores it.
    ///
    /// # Errors
    ///
    /// - [`SequenceError::EmptySeller`] when `seller` is `""`. The map
    ///   is left unchanged.
    /// - [`SequenceError::Saturated`] when the stored number is
    ///   [`u64::MAX`]. The stored number is left unchanged.
    pub fn next_seq(&mut self, seller: &str) -> Result<u64, SequenceError> {
        let seller = SellerId::parse(seller)?;
        let next = successor(self.last_by_seller.get(seller.as_str()).copied())?;
        self.last_by_seller.insert(seller.into_string(), next);
        Ok(next)
    }

    /// Return whether `candidate` is the only sequence `seller` may
    /// submit next.
    ///
    /// `true` only when `candidate == last + 1`, or when `candidate == 1`
    /// and this seller has no issued number. Does not mutate the counter.
    ///
    /// # Errors
    ///
    /// Returns [`SequenceError::EmptySeller`] when `seller` is `""`.
    pub fn is_valid_seq(&self, seller: &str, candidate: u64) -> Result<bool, SequenceError> {
        Ok(self.expected_seq(seller)? == Some(candidate))
    }

    /// Classify `candidate` as the next number, a collision, or out of order.
    ///
    /// # Errors
    ///
    /// Returns [`SequenceError::EmptySeller`] when `seller` is `""`.
    pub fn classify(&self, seller: &str, candidate: u64) -> Result<SequenceVerdict, SequenceError> {
        let seller = SellerId::parse(seller)?;
        let last = self.last_by_seller.get(seller.as_str()).copied();
        Ok(verdict(last, candidate))
    }

    /// The number [`Self::next_seq`] would issue, if one still fits in a `u64`.
    ///
    /// `Ok(None)` means the seller is saturated at [`u64::MAX`].
    ///
    /// # Errors
    ///
    /// Returns [`SequenceError::EmptySeller`] when `seller` is `""`.
    pub fn expected_seq(&self, seller: &str) -> Result<Option<u64>, SequenceError> {
        let seller = SellerId::parse(seller)?;
        Ok(match self.last_by_seller.get(seller.as_str()).copied() {
            None => Some(FIRST_SEQUENCE),
            Some(last) => last.checked_add(1),
        })
    }

    /// Last number issued for `seller`, if any.
    ///
    /// # Errors
    ///
    /// Returns [`SequenceError::EmptySeller`] when `seller` is `""`.
    pub fn last_issued(&self, seller: &str) -> Result<Option<u64>, SequenceError> {
        let seller = SellerId::parse(seller)?;
        Ok(self.last_by_seller.get(seller.as_str()).copied())
    }
}

fn successor(last: Option<u64>) -> Result<u64, SequenceError> {
    match last {
        None => Ok(FIRST_SEQUENCE),
        Some(last) => last.checked_add(1).ok_or(SequenceError::Saturated),
    }
}

fn verdict(last: Option<u64>, candidate: u64) -> SequenceVerdict {
    match last {
        None => {
            if candidate == FIRST_SEQUENCE {
                SequenceVerdict::Accept
            } else {
                SequenceVerdict::OutOfOrder
            }
        }
        Some(last) => {
            if candidate == 0 {
                SequenceVerdict::OutOfOrder
            } else if candidate <= last {
                SequenceVerdict::Collision
            } else if last.checked_add(1) == Some(candidate) {
                SequenceVerdict::Accept
            } else {
                SequenceVerdict::OutOfOrder
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saturated_seller_does_not_wrap_or_accept_another_number() {
        let mut counter = InvoiceSequenceCounter::new();
        counter.last_by_seller.insert("seller".to_owned(), u64::MAX);

        assert_eq!(counter.next_seq("seller"), Err(SequenceError::Saturated));
        assert_eq!(counter.last_issued("seller").unwrap(), Some(u64::MAX));
        assert_eq!(counter.expected_seq("seller").unwrap(), None);
        assert!(!counter.is_valid_seq("seller", u64::MAX).unwrap());
        assert!(!counter.is_valid_seq("seller", 1).unwrap());
        assert_eq!(
            counter.classify("seller", u64::MAX).unwrap(),
            SequenceVerdict::Collision
        );
        assert_eq!(
            counter.classify("seller", 0).unwrap(),
            SequenceVerdict::OutOfOrder
        );

        assert_eq!(counter.next_seq("other").unwrap(), FIRST_SEQUENCE);
    }
}
