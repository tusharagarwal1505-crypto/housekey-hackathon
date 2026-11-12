import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useScope } from "@/lib/workspace";
import { outstanding, daysUntil } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { isCurrent, today } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { Avatar, Panel, StatusBadge } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { TenantReminders } from "@/components/hk/features";

export const Route = createFileRoute("/living/")({
  head: () => meta("Home", "Your room, rent, deposit and what you owe — at a glance."),
  component: Home,
});

export function nextDue(rentDay: number) {
  const d = new Date();
  const due = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (d.getUTCDate() > rentDay ? 1 : 0), rentDay));
  return due.toISOString().slice(0, 10);
}

function Home() {
  const { data, property, myTenancy, viewer, pick } = useScope();
  const t = myTenancy;
  if (!t) return <p className="mt-6 text-muted-foreground">No tenancy found.</p>;
  const room = data.rooms.find((r) => r.id === t.roomId)!;
  const dep = data.deposits.find((d) => d.tenancyId === t.id);
  const owed = outstanding(data, t);
  const mates = pick(data.tenancies).filter((x) => isCurrent(x) && x.id !== t.id);
  const mine = pick(data.payments).filter((p) => p.payerId === viewer!.userId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const due = nextDue(property!.rentDay);
  const former = t.status === "ended" || (t.end && t.end < today());
  const dates = [
    { label: "Moved in", date: t.start },
    ...(t.proposedEnd ? [{ label: t.status === "moveout_requested" ? "Move-out requested" : "Moving out", date: t.proposedEnd }] : []),
    ...(t.end && !t.proposedEnd ? [{ label: "Tenancy ends", date: t.end }] : []),
    ...(!former ? [{ label: "Next rent due", date: due }] : []),
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground sm:p-8">
        <h1 className="font-display text-3xl sm:text-4xl">Hi {viewer!.name.split(" ")[0]},</h1>
        <p className="mt-2 text-primary-foreground/70">{former ? `You lived in ${room.name} until ${fmtDate(t.end)}. Your records stay here.` : `Welcome home to ${room.name}.`}</p>
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div><div className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/50">You owe</div><div className="mt-1 font-display text-3xl text-terracotta num">{eur(owed)}</div></div>
          <div><div className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/50">Monthly rent</div><div className="mt-1 font-display text-2xl num">{eur(room.rent)}</div></div>
          <div><div className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/50">Deposit</div><div className="mt-1 font-display text-2xl num">{eur(dep?.amount ?? room.deposit)}</div><div className="text-xs text-primary-foreground/60">{dep ? { awaiting: "awaiting payment", held: "held by landlord", refund_due: "refund due", returned: "returned" }[dep.status] : ""}</div></div>
          <div><div className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/50">Next payment</div><div className="mt-1 font-display text-2xl">{former ? "—" : fmtDate(due).replace(/ \d{4}$/, "")}</div></div>
        </div>
        {owed > 0 && <Button asChild className="mt-6 bg-terracotta text-terracotta-foreground hover:bg-terracotta/90"><Link to="/living/money">Settle up <ArrowRight className="h-4 w-4" /></Link></Button>}
      </section>
      {!former && <TenantReminders />}

      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <Panel title="Recent transactions" action={<Link to="/living/activity" className="text-xs underline">All</Link>}>
          {mine.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : mine.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b py-2.5 text-sm last:border-0">
              <div><div>{p.description}</div><div className="text-xs text-muted-foreground">{fmtDate(p.date)}</div></div>
              <div className="flex items-center gap-2"><span className="num">{eur(p.amount)}</span><StatusBadge status={p.status} /></div>
            </div>
          ))}
        </Panel>
        <div className="space-y-6">
          <Panel title="Important dates">
            {dates.map((d) => <div key={d.label} className="flex items-center justify-between border-b py-2 text-sm last:border-0"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-mauve" />{d.label}</span><span className="text-muted-foreground">{fmtDate(d.date)}{daysUntil(d.date) > 0 ? ` · in ${daysUntil(d.date)}d` : ""}</span></div>)}
          </Panel>
          <Panel title="Housemates" action={<Link to="/living/housemates" className="text-xs underline">View</Link>}>
            <div className="flex -space-x-2">{mates.map((m) => <Avatar key={m.id} name={m.name} className="h-10 w-10 border-2 border-card" />)}</div>
            <p className="mt-2 text-sm text-muted-foreground">{mates.map((m) => m.name).join(", ") || "Just you for now."}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
