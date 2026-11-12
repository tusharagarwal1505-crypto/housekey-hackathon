# Real PayPal sandbox: landlord gets paid, tenant pays

## What I need from you
From developer.paypal.com (Sandbox) -> Apps & Credentials:

1. **Landlord (Business sandbox account)**: make a REST app linked to it, then copy:
   - **Client ID**: public, fine to share.
   - **Secret**: enter it only in the secure form I'll open. Never paste it into chat.
2. **Tenant (Personal sandbox account)**: you don't need to give me anything. Keep its sandbox email and password. You'll sign in with them in the PayPal popup when you pay as a tenant.

Optional: the landlord's sandbox business email, so payments clearly go to that account.

## What changes
- Tenant "Pay" buttons (rent, deposit, bill shares) open real PayPal sandbox checkout. The money lands in the landlord's sandbox account.
- Payments are confirmed on the server using the Secret. The app records a payment as Paid only after PayPal confirms it, with the PayPal transaction ID saved on it.
- The owner app's Payments page shows the PayPal reference. Landlords can refund a payment from there.
- "Quick test payment" stays available in demo mode only.
- Wording stays clear that this is test money and not a lease transfer or legal approval.

## Technical details
- Client ID goes in as the public setting the checkout buttons use. The Secret is a server-only secret (PAYPAL_CLIENT_SECRET).
- Server functions handle create order, capture and refund through api-m.sandbox.paypal.com with OAuth client credentials. Each call sends a PayPal-Request-Id.
- The ledger stores the captured amount and capture ID. The amount comes from the ledger, never from the browser.
- Optional webhook at /api/public/paypal/webhook, with signature verification.
