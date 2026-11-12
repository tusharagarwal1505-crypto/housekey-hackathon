# HouseKey — build plan

A working fintech prototype for shared housing. It opens on the Maple House (Dublin) demo, and you can explore it without signing up. The brand uses forest green (#174B3A) on warm off-white (#F8F8F5).

## Phase 1 (this build): the full demo, end to end
1. **Landing page at /**: the tagline, the core message, "Explore demo" and "Sign up" buttons.
2. **App shell**: a sidebar with Overview, My House, Transactions, Bills & Expenses, Housemates, AI Assistant and Settings, plus a profile menu and a notification centre. On mobile the sidebar becomes a bottom bar.
3. **Overview**: balance, deposit, rent and bills cards; recent activity; an occupancy timeline; quick actions; a monthly spending chart.
4. **My House**: house details, rooms, the locked €500 deposit, and rent proration (€800/month with daily rates and occupied days).
5. **Deposit handover**: a 9-step timeline and the original deposit next to the new payment. The amount is locked. A simulated PayPal checkout records status, reference and timestamp, and you can download a receipt (PDF).
6. **Bills & Expenses**: upload a bill or add one by hand. The proration engine splits each day's cost across whoever lived there that day. Includes room weights, manual adjustments with an audit log, and a breakdown table.
7. **AI bill scanning**: upload a PDF, JPG or PNG. AI reads the provider, amount, dates, type, currency and reference, and flags anything uncertain on a review screen before the bill is saved.
8. **Move-out settlement**: Max's amounts owed and amounts due, ending in a €514.75 total. Includes a PayPal payout (simulated) and a receipt.
9. **Transactions**: a searchable, filterable ledger with Pending, Paid, Failed and Refunded statuses.
10. **Housemates**: current tenants, vacant rooms, departures and invites. Roommate discovery with swipe cards and AI compatibility scores that never use sensitive attributes.
11. **HouseKey Assistant**: a chat that answers using only the real ledger. It can draft payment reminders, and it never changes records.
12. **Onboarding**: sign up and log in, create a house (with every field the brief lists), join by code or link, and invite housemates.
13. **Guided demo stepper**: a small floating guide that walks through the brief's 15-step scenario.

## Approach
- Lovable Cloud stores accounts, households, occupancies, bills, transactions and invites. The demo household is seeded with sample data.
- Lovable AI reads bills, scores compatibility and runs the assistant.
- PayPal runs as a realistic simulated checkout, ready to be swapped for real credentials later. Copy makes clear that a payment does not transfer a lease.

## Technical details
- A pure TypeScript proration engine (daily occupancy x weights, with cent rounding that adds up exactly) plus unit tests for: 183/61 days giving Max €23.25 and Jake €22.50; €800 rent split on 17/18 Nov; and the €514.75 settlement.
- Tables include households, members, rooms, occupancies, bills, bill_shares, transactions, adjustments_audit, invites and roommate_profiles, with RLS scoped to household membership. The demo is readable by anyone signed out (read-only), and changes require signing in.
- Server functions handle AI (Gemini, with structured output for bill extraction).
- Fonts: Inter Tight for headings and Inter for body text. Charts use Recharts; receipts use jsPDF.
