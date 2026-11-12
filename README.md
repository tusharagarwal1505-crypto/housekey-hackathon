# HouseKey

HouseKey is an AI-assisted rental and property-management workspace for landlords and tenants. It brings tenancy information, properties, rooms, bills, deposits, maintenance, documents, activity, and messages into one application.

## Features

- Separate landlord and tenant workspaces
- Property, room, tenant, tenancy, bill, deposit, maintenance, document, and payment workflows
- Supabase authentication and persistence
- AI assistants for property and living workflows
- PayPal payment and payout flows for rental transactions
- Receipt generation and proration utilities
- Responsive TanStack Start + React interface

## Run locally

Requirements: Node.js 20+ and npm (or Bun).

```bash
git clone https://github.com/tusharagarwal1505-crypto/housekey-hackathon.git
cd housekey-hackathon
cp .env.example .env
npm install
npm run dev
```

Open the local URL printed by Vite. Production checks:

```bash
npm run lint
npm test
npm run build
```

## Environment variables

Copy `.env.example` to `.env` and provide credentials for the services you enable. Never commit `.env` or provider secrets. The public Supabase client variables are used by the browser; server-side AI and payment credentials must remain private.

## PayPal integration

HouseKey uses the PayPal server functions in `src/lib/paypal.functions.ts` to create and capture payment orders and support landlord/tenant payment flows. The application records payment state and connects it to the relevant rental ledger/receipt workflow. Configure PayPal sandbox credentials for local testing and use production credentials only in a protected deployment environment.

## AI usage

AI functionality is implemented in `src/lib/ai.functions.ts`, `src/lib/ai.server.ts`, and the assistant routes. It provides contextual help for rental operations such as property questions, tenant/living assistance, and workflow guidance. Requests are handled server-side through the AI SDK/OpenAI integration; users should review generated suggestions before relying on them for financial, legal, or tenancy decisions.

## Technology and integrations

- TypeScript, React 19, TanStack Start, TanStack Router, Vite
- Tailwind CSS and Radix UI components
- Supabase Auth and Postgres-backed data
- Drizzle ORM/migrations
- AI SDK with OpenAI provider
- PayPal payment APIs
- Vitest, Testing Library, ESLint, and Prettier
- jsPDF for receipt/document output

No APIMatic, Postman/Astro, or Render integration is claimed here because those integrations are not present in the submitted source/configuration. Add their official setup and usage details if they are introduced later.

## License

HouseKey is released under the [MIT License](./LICENSE).
