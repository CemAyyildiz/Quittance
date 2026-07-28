# Assets for the Quittance MVP

Quittance is designed around the Stellar testnet MVP and keeps the initial payment experience simple. The default path is native XLM, with optional support for USDC when the asset is issued on testnet and configured consistently for the invoice.

## XLM-first MVP

- XLM is the recommended default asset for the first version of Quittance.
- The MVP should work with native Stellar payments on testnet without requiring a mainnet setup.
- Invoices and payment links should clearly indicate that XLM is the expected asset when that is the chosen path.
- XLM is the simplest option for demos because it does not depend on a custom issuer account.

## USDC on testnet

- USDC can be supported for the MVP when it is issued on Stellar testnet.
- The expected asset should be identified by both its code and issuer account, for example: `USDC` with a valid testnet issuer account.
- The issuer account must be a testnet account and must be configured consistently for the invoice and the payment flow.
- The payment verification logic should treat USDC as a distinct asset from XLM and should verify the asset code plus issuer account, not only the amount.
- The same testnet asset/issuer pair should be used by the sender and the receiver to avoid ambiguity.

## Expectations for invoice setup

- If the invoice is meant for XLM, the payment instructions should refer to native XLM.
- If the invoice is meant for USDC, the invoice should state that the payment must use the configured testnet USDC issuer.
- The invoice should not assume a mainnet issuer address or a production-grade setup.
- For local demos and testnet validation, the chosen asset should be documented in the invoice or payment link so the payer knows what to send.

## Operational notes

- This documentation is for the MVP and testnet experience only.
- No mainnet configuration is required for the documented flow.
- The goal is to keep the asset model clear, predictable, and suitable for early testing and demos.
