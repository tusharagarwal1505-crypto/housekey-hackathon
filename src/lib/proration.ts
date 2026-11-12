// Day-accurate proration engine. Dates are ISO "YYYY-MM-DD", ranges inclusive.

export type Occupancy = {
  tenantId: string;
  roomId: string;
  start: string;
  end: string | null; // null = ongoing
  weight?: number; // per-person weight (room-based allocation), default 1
};

export type ShareLine = {
  tenantId: string;
  days: number;
  amount: number; // euros, rounded to cents
  exact: number;
};

const DAY = 86400000;
export const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const toISO = (t: number) => new Date(t).toISOString().slice(0, 10);
export const daysBetween = (start: string, end: string) =>
  Math.round((toUTC(end) - toUTC(start)) / DAY) + 1;

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = toUTC(start); t <= toUTC(end); t += DAY) out.push(toISO(t));
  return out;
}

export function occupantsOn(day: string, occ: Occupancy[]) {
  const t = toUTC(day);
  return occ.filter((o) => toUTC(o.start) <= t && (o.end === null || toUTC(o.end) >= t));
}

/** Round to cents so lines add up exactly to the total (largest remainder). */
function roundToTotal(exacts: number[], total: number): number[] {
  const totalCents = Math.round(total * 100);
  const cents = exacts.map((e) => Math.floor(e * 100 + 1e-9));
  let rem = totalCents - cents.reduce((a, b) => a + b, 0);
  const order = exacts
    .map((e, i) => ({ i, frac: e * 100 - Math.floor(e * 100 + 1e-9) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; rem > 0 && k < order.length; k++, rem--) cents[order[k].i]++;
  return cents.map((c) => c / 100);
}

export type BillSplit = {
  days: number;
  dailyCost: number;
  lines: ShareLine[];
  daily: { day: string; occupants: string[]; perPerson: number }[];
};

/** Each day's cost is divided among whoever occupies the house that day, weighted. */
export function splitBill(total: number, start: string, end: string, occ: Occupancy[]): BillSplit {
  const days = eachDay(start, end);
  const dailyCost = total / days.length;
  const acc = new Map<string, { days: number; exact: number }>();
  const daily: BillSplit["daily"] = [];
  for (const day of days) {
    const present = occupantsOn(day, occ);
    const wSum = present.reduce((s, o) => s + (o.weight ?? 1), 0);
    if (wSum === 0) {
      daily.push({ day, occupants: [], perPerson: 0 });
      continue;
    }
    for (const o of present) {
      const cur = acc.get(o.tenantId) ?? { days: 0, exact: 0 };
      cur.days++;
      cur.exact += (dailyCost * (o.weight ?? 1)) / wSum;
      acc.set(o.tenantId, cur);
    }
    daily.push({ day, occupants: present.map((p) => p.tenantId), perPerson: dailyCost / wSum });
  }
  const ids = [...acc.keys()];
  const exacts = ids.map((id) => acc.get(id)!.exact);
  const covered = exacts.reduce((a, b) => a + b, 0);
  const rounded = roundToTotal(exacts, covered);
  return {
    days: days.length,
    dailyCost,
    daily,
    lines: ids.map((id, i) => ({ tenantId: id, days: acc.get(id)!.days, exact: exacts[i], amount: rounded[i] })),
  };
}

export const daysInMonth = (year: number, month1: number) => new Date(Date.UTC(year, month1, 0)).getUTCDate();

/** Room rent for one calendar month, split by occupied days at a daily rate. */
export function prorateRent(monthlyRent: number, year: number, month1: number, occ: Occupancy[]) {
  const dim = daysInMonth(year, month1);
  const mm = String(month1).padStart(2, "0");
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(dim).padStart(2, "0")}`;
  const dailyRate = monthlyRent / dim;
  const lines = occ
    .map((o) => {
      const s = Math.max(toUTC(o.start), toUTC(start));
      const e = Math.min(o.end ? toUTC(o.end) : toUTC(end), toUTC(end));
      const days = e >= s ? Math.round((e - s) / DAY) + 1 : 0;
      return { tenantId: o.tenantId, days, exact: days * dailyRate, amount: Math.round(days * dailyRate * 100) / 100 };
    })
    .filter((l) => l.days > 0);
  return { daysInMonth: dim, dailyRate, lines };
}

export type SettlementItem = { label: string; amount: number }; // + owed to tenant, - owed by tenant
export const settlementTotal = (items: SettlementItem[]) =>
  Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100;

export const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
