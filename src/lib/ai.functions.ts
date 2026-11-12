import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type BillExtraction = {
  provider: string | null;
  billType: "Electricity" | "Gas" | "Internet" | "Water" | "Other" | null;
  total: number | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
  reference: string | null;
  uncertain: string[];
  notes: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const extractBill = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ base64: z.string().max(8_000_000), mediaType: z.string(), fileName: z.string() }).parse,
  )
  .handler(async ({ data }): Promise<Result<BillExtraction>> => {
    const { runAI, parseJSON } = await import("./ai.server");
    try {
      const text = await runAI(
        `You read utility bills for a shared-housing finance app. Return ONLY a JSON object with keys:
provider (string|null), billType ("Electricity"|"Gas"|"Internet"|"Water"|"Other"|null), total (number|null, amount due incl. VAT),
currency (ISO code|null), startDate (YYYY-MM-DD|null), endDate (YYYY-MM-DD|null), reference (account or invoice number|null),
uncertain (array of field names you are not confident about or could not find), notes (one short sentence).
Never guess: if a value is not clearly visible, use null and add the field to "uncertain".`,
        [
          {
            role: "user",
            content: [
              { type: "text", text: `Extract the bill details from ${data.fileName}.` },
              { type: "file", data: data.base64, mediaType: data.mediaType },
            ],
          },
        ],
      );
      return { ok: true, data: parseJSON<BillExtraction>(text) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ledger: z.string().max(60_000),
      me: z.string(),
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30),
    }).parse,
  )
  .handler(async ({ data }): Promise<Result<string>> => {
    const { runAI } = await import("./ai.server");
    try {
      const text = await runAI(
        `You are HouseKey Assistant. The person asking is ${data.me}.
Answer ONLY from the household ledger JSON below. Explain calculations simply, with euro amounts and the days involved.
If information is missing from the ledger, say so — never invent payments, amounts or dates.
You cannot change records; if asked to, explain the user must confirm the change in the app.
When asked for a reminder, write a short, warm, polite message. Use markdown sparingly (short lists ok).
Bills are split per day among whoever lived in the house that day. Rent for part-months is charged per night at monthly rent ÷ days in month. A payment between tenants never transfers a lease or replaces landlord approval.

LEDGER:
${data.ledger}`,
        data.messages,
      );
      return { ok: true, data: text };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

export type Compat = { score: number; matches: string[]; conflicts: string[]; explanation: string };

export const scoreCompatibility = createServerFn({ method: "POST" })
  .inputValidator(z.object({ household: z.string().max(4000), candidate: z.string().max(4000) }).parse)
  .handler(async ({ data }): Promise<Result<Compat>> => {
    const { runAI, parseJSON } = await import("./ai.server");
    try {
      const text = await runAI(
        `Score roommate compatibility from lifestyle answers only (budget, move-in date, sleep, cleanliness, schedule, guests, smoking, lifestyle).
Never use or infer age, gender, ethnicity, religion, nationality, sexuality, health or other sensitive attributes.
Return ONLY JSON: {"score": 0-100 integer, "matches": [short strings], "conflicts": [short strings], "explanation": "2 sentences"}`,
        [{ role: "user", content: `Household preferences:\n${data.household}\n\nCandidate:\n${data.candidate}` }],
      );
      return { ok: true, data: parseJSON<Compat>(text) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });
