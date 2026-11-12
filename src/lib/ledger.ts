// Everything financial is derived here from the shared Data model, using the one proration engine.
import { prorateRent, settlementTotal, splitBill, toUTC, type Occupancy } from "./proration";
import type { Bill, Data, SettlementItem, Tenancy } from "./model";
import { isCurrent, today } from "./model";

export function occupancies(d: Data, propertyId: string): Occupancy[] {
  return d.tenancies
    .filter((t) => t.propertyId === propertyId)
    .map((t) => ({ tenantId: t.id, roomId: t.roomId, start: t.start, end: t.status === "ended" ? t.end : t.end && t.end < today() ? t.end : t.proposedEnd ?? null, weight: d.rooms.find((r) => r.id === t.roomId)?.weight ?? 1 }));
}

/** Occupancy for bills: a tenancy counts until its actual or approved end date. */
function billOcc(d: Data, propertyId: string): Occupancy[] {
  return d.tenancies
    .filter((t) => t.propertyId === propertyId)
    .map((t) => ({ tenantId: t.id, roomId: t.roomId, start: t.start, end: t.status === "ended" || t.proposedEnd ? (t.proposedEnd ?? t.end) : null, weight: d.rooms.find((r) => r.id === t.roomId)?.weight ?? 1 }));
}

export function billSplit(d: Data, b: Bill) {
  return splitBill(b.total, b.start, b.end, billOcc(d, b.propertyId));
}

export function sharePaid(d: Data, b: Bill, t: Tenancy) {
  return d.payments.some((p) => p.billId === b.id && p.status === "Paid" && t.tenantId && p.payerId === t.tenantId);
}

export type ShareRow = { bill: Bill; tenancy: Tenancy; days: number; amount: number; perDay: number; paid: boolean };
export function sharesFor(d: Data, tenancy: Tenancy): ShareRow[] {
  return d.bills
    .filter((b) => b.propertyId === tenancy.propertyId)
    .flatMap((b) => {
      const l = billSplit(d, b).lines.find((x) => x.tenantId === tenancy.id);
      return l ? [{ bill: b, tenancy, days: l.days, amount: l.amount, perDay: l.exact / l.days, paid: sharePaid(d, b, tenancy) }] : [];
    });
}

export function unpaidUtilities(d: Data, tenancy: Tenancy) {
  return round(sharesFor(d, tenancy).filter((s) => !s.paid).reduce((a, s) => a + s.amount, 0));
}

export const round = (n: number) => Math.round(n * 100) / 100;

export function pendingRent(d: Data, tenancy: Tenancy) {
  return round(d.payments.filter((p) => p.category === "Rent" && p.status === "Pending" && p.payerId === tenancy.tenantId && p.propertyId === tenancy.propertyId).reduce((a, p) => a + p.amount, 0));
}

export function outstanding(d: Data, tenancy: Tenancy) {
  return round(unpaidUtilities(d, tenancy) + pendingRent(d, tenancy));
}

/** Draft settlement: deposit back, minus unpaid shares and rent, plus credit for unused days of a fully-paid final month. */
export function draftSettlement(d: Data, t: Tenancy): SettlementItem[] {
  const room = d.rooms.find((r) => r.id === t.roomId);
  const dep = d.deposits.find((x) => x.tenancyId === t.id && x.status !== "returned");
  const items: SettlementItem[] = [];
  if (dep) items.push({ label: "Deposit refund", amount: dep.amount });
  for (const s of sharesFor(d, t).filter((s) => !s.paid)) items.push({ label: `${s.bill.type} ${s.bill.start.slice(5)}→${s.bill.end.slice(5)} (${s.days} days)`, amount: -s.amount });
  const pr = pendingRent(d, t);
  if (pr) items.push({ label: "Outstanding rent", amount: -pr });
  const end = t.proposedEnd ?? t.end;
  if (room && end) {
    const [y, m] = end.split("-").map(Number) as [number, number];
    const monthPaid = d.payments.some((p) => p.category === "Rent" && p.status === "Paid" && p.payerId === t.tenantId && p.date.slice(0, 7) === end.slice(0, 7));
    if (monthPaid) {
      const r = prorateRent(room.rent, y, m, [{ tenantId: t.id, roomId: room.id, start: t.start, end }]);
      const owed = r.lines[0]?.amount ?? room.rent;
      if (room.rent - owed > 0.009) items.push({ label: `Rent credit (${r.daysInMonth - (r.lines[0]?.days ?? 0)} unused days)`, amount: round(room.rent - owed) });
    }
  }
  return items;
}

export { settlementTotal };

export function propertyStats(d: Data, propertyId?: string) {
  const props = propertyId ? d.properties.filter((p) => p.id === propertyId) : d.properties;
  const ids = new Set(props.map((p) => p.id));
  const rooms = d.rooms.filter((r) => ids.has(r.propertyId));
  const current = d.tenancies.filter((t) => ids.has(t.propertyId) && isCurrent(t));
  const occupied = rooms.filter((r) => current.some((t) => t.roomId === r.id));
  const month = today().slice(0, 7);
  const rentThisMonth = d.payments.filter((p) => ids.has(p.propertyId) && p.category === "Rent" && p.date.slice(0, 7) === month);
  const expected = occupied.reduce((s, r) => s + r.rent, 0);
  const collected = rentThisMonth.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const deposits = d.deposits.filter((x) => ids.has(x.propertyId) && (x.status === "held" || x.status === "refund_due")).reduce((s, x) => s + x.amount, 0);
  return {
    properties: props.length,
    rooms: rooms.length,
    occupied: occupied.length,
    vacant: rooms.length - occupied.length,
    occupancyRate: rooms.length ? Math.round((occupied.length / rooms.length) * 100) : 0,
    expected,
    collected,
    outstandingRent: Math.max(0, expected - collected),
    deposits,
  };
}

export function monthlyIncome(d: Data, months = 6) {
  const out: { m: string; collected: number; pending: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = dt.toISOString().slice(0, 7);
    const rows = d.payments.filter((p) => p.category === "Rent" && p.date.slice(0, 7) === key);
    out.push({
      m: dt.toLocaleString("en-IE", { month: "short" }),
      collected: rows.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0),
      pending: rows.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0),
    });
  }
  return out;
}

export function daysUntil(iso: string) {
  return Math.round((toUTC(iso) - toUTC(today())) / 86400000);
}

export function snapshot(d: Data, scope: { role: string; tenancyId?: string; propertyId?: string }) {
  const pid = scope.propertyId;
  const f = <T extends { propertyId: string }>(xs: T[]) => (pid ? xs.filter((x) => x.propertyId === pid) : xs);
  const tenancies = f(d.tenancies);
  return JSON.stringify({
    today: today(),
    viewerRole: scope.role,
    viewerTenancy: scope.tenancyId,
    properties: pid ? d.properties.filter((p) => p.id === pid) : d.properties,
    rooms: f(d.rooms),
    tenancies,
    bills: f(d.bills).map((b) => ({ ...b, shares: billSplit(d, b).lines.map((l) => ({ ...l, name: d.tenancies.find((t) => t.id === l.tenantId)?.name })) })),
    outstandingByTenant: tenancies.map((t) => ({ name: t.name, utilities: unpaidUtilities(d, t), rent: pendingRent(d, t) })),
    payments: f(d.payments),
    deposits: f(d.deposits),
    settlements: f(d.settlements),
    ...(scope.role === "landlord" ? { maintenance: f(d.maintenance), expenses: f(d.expenses), applications: f(d.applications), stats: propertyStats(d, pid) } : {}),
  });
}

export type Reminder = { kind: "rent" | "utility" | "pending"; label: string; amount: number; due: string | null; daysLeft: number | null };

/** Next rent due date on or after `on` for a property's rent day. */
export function nextRentDue(rentDay: number, on: string) {
  const [y, m, dd] = on.split("-").map(Number);
  const due = new Date(Date.UTC(y, m - 1 + (dd > rentDay ? 1 : 0), rentDay));
  return due.toISOString().slice(0, 10);
}

/** What a tenant should be reminded about: rent due within `windowDays` (unless already paid that month), unpaid bill shares, pending rent. */
export function remindersFor(d: Data, t: Tenancy, rentDay: number, on: string, windowDays = 7): Reminder[] {
  const out: Reminder[] = [];
  const days = (iso: string) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(+on.slice(0, 4), +on.slice(5, 7) - 1, +on.slice(8, 10))) / 864e5);
  if (t.status !== "ended" && (!t.end || t.end >= on)) {
    const due = nextRentDue(rentDay, on);
    const month = due.slice(0, 7);
    const room = d.rooms.find((r) => r.id === t.roomId);
    const paid = d.payments.some((p) => p.category === "Rent" && p.payerId === t.tenantId && p.propertyId === t.propertyId && p.status !== "Failed" && p.date.slice(0, 7) === month);
    const left = days(due);
    if (room && !paid && left <= windowDays) out.push({ kind: "rent", label: `Rent for ${new Date(due).toLocaleString("en-IE", { month: "long" })}`, amount: room.rent, due, daysLeft: left });
  }
  const pr = pendingRent(d, t);
  if (pr > 0) out.push({ kind: "pending", label: "Rent awaiting payment", amount: pr, due: null, daysLeft: null });
  for (const s of sharesFor(d, t).filter((x) => !x.paid)) out.push({ kind: "utility", label: `${s.bill.type} share`, amount: s.amount, due: null, daysLeft: null });
  return out;
}
