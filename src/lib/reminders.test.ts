import { describe, expect, it } from "vitest";
import { demoSeed } from "./demo";
import { nextRentDue, remindersFor } from "./ledger";

const d = demoSeed();
const sarah = d.tenancies.find((t) => t.id === "t-sarah")!;
const max = d.tenancies.find((t) => t.id === "t-max")!;

describe("rent reminders", () => {
  it("rolls the due date to next month once the rent day has passed", () => {
    expect(nextRentDue(1, "2026-11-02")).toBe("2026-12-01");
    expect(nextRentDue(5, "2026-11-02")).toBe("2026-11-05");
  });
  it("reminds about rent only within 7 days of the due date", () => {
    expect(remindersFor(d, sarah, 1, "2026-11-20").some((r) => r.kind === "rent")).toBe(false);
    const r = remindersFor(d, sarah, 1, "2026-11-26").find((x) => x.kind === "rent");
    expect(r?.daysLeft).toBe(5);
  });
  it("never reminds a former tenant about upcoming rent", () => {
    expect(remindersFor(d, max, 1, "2026-11-26").some((r) => r.kind === "rent")).toBe(false);
  });
});
