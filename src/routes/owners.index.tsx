import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight } from "lucide-react";
import { useScope } from "@/lib/workspace";
import { daysUntil, monthlyIncome, outstanding, propertyStats } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { isCurrent } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { Metric, PageHeader, Panel, StatusBadge, Tag } from "@/components/hk/kit";

export const Route = createFileRoute("/owners/")({
  head: () => meta("Owner overview", "Occupancy, income, arrears and deposits across your properties."),
  component: Overview,
});

function Overview() {
  const { data, viewer, property } = useScope();
  const mine = data.properties.filter((p) => p.ownerId === viewer!.userId).map((p) => p.id);
  const scoped = { ...data, properties: data.properties.filter((p) => mine.includes(p.id)) };
  const s = propertyStats(scoped);
  const income = monthlyIncome({ ...data, payments: data.payments.filter((p) => mine.includes(p.propertyId)) });
  const tenancies = data.tenancies.filter((t) => mine.includes(t.propertyId));
  const expiring = tenancies.filter((t) => isCurrent(t) && t.end && daysUntil(t.end) <= 120).sort((a, b) => a.end!.localeCompare(b.end!));
  const apps = data.applications.filter((a) => mine.includes(a.propertyId) && a.status === "pending");
  const arrears = tenancies.filter((t) => t.status !== "ended" || t.end).map((t) => ({ t, owed: outstanding(data, t) })).filter((x) => x.owed > 0);
  const recent = data.payments.filter((p) => mine.includes(p.propertyId)).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <>
      <PageHeader eyebrow={new Date().toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })} title={`Good afternoon, ${viewer!.name.split(" ")[0]}`} subtitle={`${s.properties} ${s.properties === 1 ? "property" : "properties"} · ${property?.address}`} />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Properties" value={String(s.properties)} hint={`${s.rooms} rooms`} />
        <Metric label="Occupancy" value={`${s.occupancyRate}%`} hint={`${s.occupied} occupied · ${s.vacant} vacant`} />
        <Metric label="Expected this month" value={eur(s.expected)} />
        <Metric label="Collected" value={eur(s.collected)} hint={`${s.expected ? Math.round((s.collected / s.expected) * 100) : 0}% of expected`} />
        <Metric label="Outstanding rent" value={eur(s.outstandingRent)} accent={s.outstandingRent > 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Rental income" action={<span className="eyebrow">Last 6 months</span>}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={income}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-mauve)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-mauve)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={52} tickFormatter={(v) => `€${v / 1000}k`} />
                <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--color-primary)" strokeWidth={2} fill="url(#inc)" />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="var(--color-terracotta)" strokeDasharray="4 4" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Deposits held">
          <div className="font-display text-4xl num">{eur(s.deposits)}</div>
          <p className="mt-1 text-sm text-muted-foreground">Across {data.deposits.filter((d) => mine.includes(d.propertyId) && (d.status === "held" || d.status === "refund_due")).length} tenancies</p>
          <div className="mt-6 space-y-2 text-sm">
            {(["held", "refund_due", "awaiting"] as const).map((st) => (
              <div key={st} className="flex justify-between border-b pb-2 last:border-0"><span className="text-muted-foreground">{{ held: "Held", refund_due: "Refund due", awaiting: "Awaiting payment" }[st]}</span><span className="num">{data.deposits.filter((d) => mine.includes(d.propertyId) && d.status === st).length}</span></div>
            ))}
          </div>
          <Link to="/owners/deposits" className="mt-4 inline-flex items-center gap-1 text-sm underline">Manage deposits <ArrowUpRight className="h-3 w-3" /></Link>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Occupancy">
          <div className="space-y-2">
            {data.rooms.filter((r) => mine.includes(r.propertyId)).map((r) => {
              const t = tenancies.find((x) => x.roomId === r.id && isCurrent(x));
              return (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{r.name.split(" · ")[0]}</span>
                  {t ? <span className="text-muted-foreground">{t.name}</span> : <Tag tone="warn">Vacant</Tag>}
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Upcoming expirations">
          {expiring.length === 0 ? <p className="text-sm text-muted-foreground">No tenancies ending in the next 4 months.</p> : expiring.map((t) => (
            <div key={t.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{t.name}</span><span className="text-muted-foreground">{fmtDate(t.end)} · {daysUntil(t.end!)}d</span></div>
          ))}
        </Panel>
        <Panel title="Pending applications" action={<Link to="/owners/applications" className="text-xs underline">Review</Link>}>
          {apps.length === 0 ? <p className="text-sm text-muted-foreground">No applications waiting.</p> : apps.map((a) => (
            <div key={a.id} className="border-b py-2 text-sm last:border-0"><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground">Move-in {fmtDate(a.moveIn)}</div></div>
          ))}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Outstanding payments">
          {arrears.length === 0 ? <p className="text-sm text-muted-foreground">Everyone is up to date.</p> : arrears.map(({ t, owed }) => (
            <div key={t.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{t.name}{t.status === "ended" && <span className="text-muted-foreground"> · former</span>}</span><span className="num text-terracotta">{eur(owed)}</span></div>
          ))}
        </Panel>
        <Panel title="Recent activity" action={<Link to="/owners/payments" className="text-xs underline">All payments</Link>}>
          {recent.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
              <div><div>{p.description}</div><div className="text-xs text-muted-foreground">{p.payerName} · {fmtDate(p.date)}</div></div>
              <div className="flex items-center gap-2"><span className="num">{eur(p.amount)}</span><StatusBadge status={p.status} /></div>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
