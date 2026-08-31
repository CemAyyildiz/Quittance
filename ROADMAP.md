# Quittance — Ship Roadmap

Canonical plan: **[PLAN.md](./PLAN.md)** (product, architecture, DoD, phases, commits).

This file is the short execution checklist. Do not diverge from PLAN.md decisions.

## Locked (see PLAN.md §4)

- Freighter = identity (create + pay)
- Email = optional send (mailto now); never a login gate
- Google not required for create/pay
- MVP in-memory + Horizon verify for demo
- Postgres / SMTP / Gmail API = after online demo

## Commit order

```
A1 favicon/footer
A2 invoice/proof copy
A3 wallet-only create/pay
A4 optional email + mailto send
A5 customer fields = client data
B1 dashboard scoped to wallet
B2 Horizon verify on MVP
B3 remove simulate + broken sync UI
B4 seller/payer metadata in memory
B5 invoice detail + AssetLogo fixes
C1 Download Proof primary CTA
C2 README align
D1–D3 deploy configs + evidence docs
D4–D5 deploy + testnet pack
```

Ask before each git commit. One commit = one PLAN.md row.

## Level 4 follow-ups (after D5)

1. Public API URL in `EVIDENCE.md`
2. Soroban contract deploy address on testnet (or written waiver)
3. 10+ Freighter wallet interaction hashes
4. Demo video + screenshots (UI / mobile / analytics)
5. Feedback summary from `/feedback`
