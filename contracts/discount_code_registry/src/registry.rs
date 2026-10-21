//! In-memory ledger of discount codes.

use std::collections::btree_map::Entry;
use std::collections::BTreeMap;

use crate::code::validate_code;
use crate::error::DiscountError;

/// Read-only view of one registered code.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CodeSnapshot {
    /// Inclusive expiry. A redemption at this exact value is still valid.
    pub expires_at: u32,
    /// Maximum number of successful redemptions.
    pub max_uses: u32,
    /// Successful redemptions recorded so far.
    pub uses: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct CodeRecord {
    expires_at: u32,
    max_uses: u32,
    uses: u32,
}

impl CodeRecord {
    fn snapshot(&self) -> CodeSnapshot {
        CodeSnapshot {
            expires_at: self.expires_at,
            max_uses: self.max_uses,
            uses: self.uses,
        }
    }
}

/// Admin-owned discount code ledger.
///
/// Only `admin` may register codes. Anyone who can call [`Self::redeem`] may
/// consume a use while the code is unexpired and under its cap. This type is
/// an off-chain primitive: it does not depend on `soroban-sdk` and it does
/// not talk to the network.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscountRegistry {
    admin: String,
    codes: BTreeMap<String, CodeRecord>,
}

impl DiscountRegistry {
    /// Creates a registry owned by `admin`.
    ///
    /// # Errors
    ///
    /// Returns [`DiscountError::EmptyAdmin`] when `admin` is empty.
    ///
    /// # Examples
    ///
    /// ```
    /// use discount_code_registry::DiscountRegistry;
    ///
    /// let mut registry = DiscountRegistry::new("GADMIN").unwrap();
    /// registry.register_code("GADMIN", "SAVE10", 100, 1).unwrap();
    /// assert!(matches!(registry.redeem("SAVE10", 100), Ok(true)));
    /// ```
    pub fn new(admin: impl Into<String>) -> Result<Self, DiscountError> {
        let admin = admin.into();
        if admin.is_empty() {
            return Err(DiscountError::EmptyAdmin);
        }
        Ok(Self {
            admin,
            codes: BTreeMap::new(),
        })
    }

    /// Address allowed to register codes.
    pub fn admin(&self) -> &str {
        &self.admin
    }

    /// Registers `code` with an inclusive expiry and a usage cap.
    ///
    /// `caller` must equal the admin stored at construction. The code must be
    /// non-empty, at most 32 characters, and drawn from `[A-Z0-9]`.
    /// `max_uses` must be at least 1. A second registration of the same code
    /// is rejected even when the new expiry or cap differs.
    ///
    /// Authorization is checked before the code is validated, so a non-admin
    /// learns nothing about whether the code is well-formed or already stored.
    ///
    /// # Errors
    ///
    /// - [`DiscountError::Unauthorized`] when `caller` is not the admin.
    /// - [`DiscountError::EmptyCode`], [`DiscountError::CodeTooLong`], or
    ///   [`DiscountError::InvalidCharset`] when `code` fails validation.
    /// - [`DiscountError::InvalidMaxUses`] when `max_uses` is `0`.
    /// - [`DiscountError::AlreadyExists`] when `code` is already registered.
    pub fn register_code(
        &mut self,
        caller: &str,
        code: &str,
        expires_at: u32,
        max_uses: u32,
    ) -> Result<(), DiscountError> {
        if caller != self.admin {
            return Err(DiscountError::Unauthorized);
        }
        validate_code(code)?;
        if max_uses == 0 {
            return Err(DiscountError::InvalidMaxUses);
        }
        match self.codes.entry(code.to_string()) {
            Entry::Occupied(_) => Err(DiscountError::AlreadyExists),
            Entry::Vacant(slot) => {
                slot.insert(CodeRecord {
                    expires_at,
                    max_uses,
                    uses: 0,
                });
                Ok(())
            }
        }
    }

    /// Redeems `code` at time `now` and increments its use counter.
    ///
    /// Succeeds when the code is stored, `now <= expires_at`, and
    /// `uses < max_uses`. The counter is incremented only after both checks
    /// pass. Expiry is evaluated before the cap, so a code that is both
    /// expired and exhausted returns [`DiscountError::Expired`].
    ///
    /// `now` and `expires_at` share a unit chosen by the caller (unix seconds
    /// or a ledger close time). This function does not read a clock.
    ///
    /// On success the result is `Ok(true)`. Unknown, expired, and exhausted
    /// codes are errors, not `Ok(false)`. Redeem does not re-check the
    /// charset: a string that was never registered returns
    /// [`DiscountError::NotFound`].
    ///
    /// # Errors
    ///
    /// - [`DiscountError::NotFound`] when `code` is not in the ledger.
    /// - [`DiscountError::Expired`] when `now > expires_at`.
    /// - [`DiscountError::Exhausted`] when `uses >= max_uses`.
    pub fn redeem(&mut self, code: &str, now: u32) -> Result<bool, DiscountError> {
        let Some(entry) = self.codes.get_mut(code) else {
            return Err(DiscountError::NotFound);
        };
        if now > entry.expires_at {
            return Err(DiscountError::Expired);
        }
        if entry.uses >= entry.max_uses {
            return Err(DiscountError::Exhausted);
        }
        entry.uses += 1;
        Ok(true)
    }

    /// Returns the ledger row for `code`.
    ///
    /// # Errors
    ///
    /// Returns [`DiscountError::NotFound`] when `code` is not registered.
    pub fn get(&self, code: &str) -> Result<CodeSnapshot, DiscountError> {
        self.codes
            .get(code)
            .map(CodeRecord::snapshot)
            .ok_or(DiscountError::NotFound)
    }
}
