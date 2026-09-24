# Freighter Wallet Guide

## Overview

[Freighter](https://freighter.app/) is a non-custodial browser extension wallet for the Stellar network, developed by the Stellar Development Foundation. It stores your keys locally in the browser and signs transactions without exposing your secret key to any website.

In Quittance, Freighter serves as the user's wallet identity. You use it to create invoices (as a seller) and to pay invoices (as a payer). The application never sees or stores your private keys; all signing happens inside the extension.

## Installation

Install Freighter from the official sources:

- [Chrome Web Store](https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/freighter/)
- [Freighter official website](https://freighter.app/)

Refer to the [official Freighter documentation](https://docs.freighter.app/) for detailed setup instructions.

## Connecting

1. Install the Freighter extension for your browser.
2. Create a new wallet (or import an existing one using your recovery phrase).
3. Unlock Freighter by entering your password.
4. Open Quittance and click the connect button. Freighter will prompt you to approve the connection.
5. Once approved, your Stellar public key is shared with Quittance and you are ready to use the application.

## Identity

Your connected Freighter wallet is your identity in Quittance:

- **Creating invoices** — When you create an invoice, your wallet's public key is recorded as the seller. The invoice directs the payer to send the payment to this account.
- **Paying invoices** — When you pay an invoice, the wallet you use to sign the payment transaction identifies you as the payer.

The same wallet can be used for both roles. You can also switch between multiple wallets by disconnecting and reconnecting a different account.

## Troubleshooting

### Wallet not detected

Ensure Freighter is installed and unlocked. If the extension is installed but not detected, try refreshing the page. Check that the extension is enabled in your browser's extension manager.

### Wallet locked

Freighter must be unlocked before Quittance can read your public key or sign transactions. Open the extension and enter your password.

### Wrong network selected

Freighter connects to the Stellar network (testnet or mainnet). Make sure the network selected in Freighter matches the network configured in Quittance. The application will indicate which network it expects.

### Permission request dismissed

If you accidentally dismiss the Freighter connection prompt, click the connect button again in Quittance to trigger a new request.
