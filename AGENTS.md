<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Two apps (/owners landlord, /living tenant) read one Data model via src/lib/workspace.tsx: demo mode uses local seed data (src/lib/demo.ts), live mode loads Lovable Cloud tables under RLS; every write goes through workspace actions so both modes behave the same. All money math lives in src/lib/proration.ts + src/lib/ledger.ts.
- Roles live in user_roles (landlord/tenant, self-claimed via claim_role RPC, never admin); property access is decided by is_owner/is_active_tenant/was_tenant SQL helpers.
- AI calls run only in server functions (src/lib/ai.functions.ts → ai.server.ts) through the Lovable AI gateway; the assistant gets a ledger snapshot and never writes records.
- tsconfig relaxes noUncheckedIndexedAccess/exactOptionalPropertyTypes/noImplicitReturns to keep UI code readable.
- Household features (chat, chores, house rules, documents, reminders) live in src/components/hk/features.tsx and are shared by both apps; documents use the private `documents` bucket with paths prefixed by property id so storage access follows is_member.
- PayPal sandbox: orders are created and captured in server functions (src/lib/paypal.functions.ts) with PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET; the ledger records the capture ID in the payment description.
