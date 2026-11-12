import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://api-m.sandbox.paypal.com";

async function token() {
  const id = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("PayPal sandbox is not configured");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed [${res.status}]`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function call(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", "PayPal-Request-Id": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) { console.error("PayPal error", res.status, json); throw new Error(`PayPal request failed [${res.status}]`); }
  return json as any;
}

export const createPayPalOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ amount: z.number().positive().max(100000), description: z.string().max(120) }).parse(d))
  .handler(async ({ data }) => {
    const order = await call("/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [{ description: data.description, amount: { currency_code: "EUR", value: data.amount.toFixed(2) } }],
    });
    return { id: order.id as string };
  });

export const capturePayPalOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ orderId: z.string().regex(/^[A-Z0-9]{5,40}$/) }).parse(d))
  .handler(async ({ data }) => {
    const r = await call(`/v2/checkout/orders/${data.orderId}/capture`, {});
    const cap = r.purchase_units?.[0]?.payments?.captures?.[0];
    return { status: r.status as string, captureId: (cap?.id ?? "") as string, amount: Number(cap?.amount?.value ?? 0) };
  });

export const refundPayPalCapture = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ captureId: z.string().regex(/^[A-Z0-9]{5,40}$/) }).parse(d))
  .handler(async ({ data }) => {
    const r = await call(`/v2/payments/captures/${data.captureId}/refund`, {});
    return { status: r.status as string };
  });
