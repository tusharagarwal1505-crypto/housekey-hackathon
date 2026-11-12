import { describe, expect, it } from "vitest";
import { prorateRent, settlementTotal, splitBill, type Occupancy } from "./proration";

const occ: Occupancy[] = [
  { tenantId: "sarah", roomId: "r1", start: "2026-09-01", end: null },
  { tenantId: "emma", roomId: "r2", start: "2026-09-01", end: null },
  { tenantId: "priya", roomId: "r3", start: "2026-09-01", end: null },
  { tenantId: "max", roomId: "r4", start: "2025-09-01", end: "2026-10-31" },
  { tenantId: "jake", roomId: "r4", start: "2026-11-01", end: null },
];

describe("bill proration", () => {
  const s = splitBill(183, "2026-10-01", "2026-11-30", occ);
  it("€183 over 61 days is €3/day", () => {
    expect(s.days).toBe(61);
    expect(s.dailyCost).toBeCloseTo(3);
  });
  it("Max pays €23.25 for 31 days", () => {
    expect(s.lines.find((l) => l.tenantId === "max")).toMatchObject({ days: 31, amount: 23.25 });
  });
  it("Jake pays €22.50 for 30 days", () => {
    expect(s.lines.find((l) => l.tenantId === "jake")).toMatchObject({ days: 30, amount: 22.5 });
  });
  it("shares add up to the bill total", () => {
    expect(s.lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(183, 2);
  });
});

describe("rent proration", () => {
  it("€800 room, A out 17 Nov, B in 18 Nov", () => {
    const r = prorateRent(800, 2026, 11, [
      { tenantId: "a", roomId: "r", start: "2026-01-01", end: "2026-11-17" },
      { tenantId: "b", roomId: "r", start: "2026-11-18", end: null },
    ]);
    expect(r.lines.find((l) => l.tenantId === "a")).toMatchObject({ days: 17, amount: 453.33 });
    expect(r.lines.find((l) => l.tenantId === "b")).toMatchObject({ days: 13, amount: 346.67 });
  });
});

describe("move-out settlement", () => {
  it("Max is owed €514.75", () => {
    expect(
      settlementTotal([
        { label: "Deposit", amount: 500 },
        { label: "Electricity", amount: -23.25 },
        { label: "Internet", amount: -12 },
        { label: "Rent adjustment", amount: 50 },
      ]),
    ).toBe(514.75);
  });
});
