//! Pure approval-counting logic for `multi-sig-approval-counter`.

use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::storage;
use crate::types::{ActionRecord, ApprovalError};

/// Validate that `required` is non-zero and matches any existing threshold.
pub fn validate_threshold(existing_required: Option<u32>, required: u32) -> Result<u32, ApprovalError> {
    if required == 0 {
        return Err(ApprovalError::InvalidThreshold);
    }
    if let Some(locked) = existing_required {
        if locked != required {
            return Err(ApprovalError::ThresholdMismatch);
        }
        return Ok(locked);
    }
    Ok(required)
}

/// Check whether `count` distinct approvals satisfy `required`.
#[must_use]
pub const fn threshold_met(count: u32, required: u32) -> bool {
    required > 0 && count >= required
}

/// Record an approval with strict threshold validation.
pub(crate) fn record_approval_checked(
    env: &Env,
    action_id: &Symbol,
    approver: &Address,
    required: u32,
) -> Result<bool, ApprovalError> {
    let existing = storage::get_action(env, action_id);
    let locked_required = validate_threshold(existing.as_ref().map(|r| r.required), required)?;

    let mut record = existing.unwrap_or_else(|| ActionRecord {
        required: locked_required,
        approvers: Vec::new(env),
        approved: false,
    });

    if !record.approvers.iter().any(|a| a == *approver) {
        record.approvers.push_back(approver.clone());
    }

    if threshold_met(record.approvers.len(), record.required) {
        record.approved = true;
    }

    let is_now_approved = record.approved;
    storage::set_action(env, action_id, &record);
    Ok(is_now_approved)
}

/// Record an approval for `approve(action_id, approver, required) -> bool`.
pub(crate) fn record_approval(
    env: &Env,
    action_id: &Symbol,
    approver: &Address,
    required: u32,
) -> bool {
    let existing = storage::get_action(env, action_id);
    let effective_required = match existing.as_ref() {
        Some(rec) => rec.required,
        None => {
            if required == 0 {
                return false;
            }
            required
        }
    };

    let mut record = existing.unwrap_or_else(|| ActionRecord {
        required: effective_required,
        approvers: Vec::new(env),
        approved: false,
    });

    if !record.approvers.iter().any(|a| a == *approver) {
        record.approvers.push_back(approver.clone());
    }

    if threshold_met(record.approvers.len(), record.required) {
        record.approved = true;
    }

    let is_now_approved = record.approved;
    storage::set_action(env, action_id, &record);
    is_now_approved
}
