import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Download } from "lucide-react";
import { toast } from "sonner";
import { useScope, type NewPayment } from "@/lib/workspace";
import { pendingRent, sharesFor } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { downloadReceipt } from "@/lib/receipt";
import { fmtDate, meta } from "@/lib/seo";
import { LockedAmount, Money, PageHeaderLite, Panel, PayPalDialog, StatusBadge } from "@/components/hk/kit";
import { nextDue } from "./living.index";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/living/money")({
  head: () => meta("My money", "Deposit tracker, rent history, outstanding payments and settlement."),
  component: MyMoney,
});

function MyMoney() {
  const { data, property, myTenancy: t, viewer, actions, pick, mode } = useScope();
  const [pay, setPay] = useState<(NewPayment & { pendingId?: string; depositId?: string }) | null>(null);
  if (!t) return null;
  const room = data.rooms.find((r) => r.id === t.roomId)!;
  const dep = data.deposits.find((d) => d.tenancyId === t.id);
  const shares = sharesFor(data, t).filter((s) => !s.paid);
  const rentPending = pick(data.payments).filter((p) => p.category === "Rent" && p.status === "Pending" && p.payerId === viewer!.userId);
  const rentHistory = pick(data.payments).filter((p) => p.category === "Rent" && p.payerId === viewer!.userId).sort((a, b) => b.date.localeCompare(a.date));
  const refunds = pick(data.payments).filter((p) => (p.category === "Refund" || p.category === "Settlement") && p.payeeName === t.name);
  const settlement = data.settlements.find((s) => s.tenancyId === t.id);
  const steps = ["awaiting", "held", "refund_due", "returned"] as const;
  const stepIdx = dep ? steps.indexOf(dep.status) : -1;

  return (
    <div className="space-y-6">
      <PageHeaderLite title="My money" />
      <Panel title="Outstanding">
        {shares.length === 0 && rentPending.length === 0 ? <p className="flex items-center gap-2 text-sm text-success-foreground"><Check className="h-4 w-4" /> You're all settled.</p> : (
          <div className="divide-y">
            {rentPending.map((p) => (
              <Row key={p.id} title={p.description} sub="Rent · requested by landlord" amount={p.amount} onPay={() => setPay({ propertyId: p.propertyId, category: "Rent", description: p.description, amount: p.amount, payeeName: "Landlord", status: "Paid", pendingId: p.id })} />
            ))}
            {shares.map((s) => (
              <Row key={s.bill.id} title={`${s.bill.type} · ${s.bill.provider}`} sub={`${s.days} days × ${eur(s.perDay)} · ${fmtDate(s.bill.start)} – ${fmtDate(s.bill.end)}`} amount={s.amount} onPay={() => setPay({ propertyId: s.bill.propertyId, category: "Utility", description: `${s.bill.type} share ${s.bill.start.slice(5)}→${s.bill.end.slice(5)}`, amount: s.amount, payeeName: "Household", billId: s.bill.id, status: "Paid" })} />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Deposit tracker">
          <LockedAmount amount={dep?.amount ?? room.deposit} />
          <ol className="mt-5 space-y-3">
            {["Deposit requested", "Held by landlord", "Refund due after move-out", "Returned to you"].map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className={cn("grid h-5 w-5 place-items-center rounded-full border text-[10px]", i <= stepIdx ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>{i <= stepIdx ? <Check className="h-3 w-3" /> : i + 1}</span>
                <span className={i <= stepIdx ? "" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ol>
          {dep?.status === "awaiting" && <Button className="mt-5 w-full bg-paypal text-paypal-foreground hover:bg-paypal/90" onClick={() => setPay({ propertyId: dep.propertyId, category: "Deposit", description: `Deposit · ${room.name.split(" · ")[0]}`, amount: dep.amount, payeeName: "Landlord", status: "Paid", depositId: dep.id })}>Pay {eur(dep.amount)} deposit</Button>}
          <p className="mt-3 text-xs text-muted-foreground">Set by your landlord — it can't be changed in the app.</p>
        </Panel>
        <Panel title="Upcoming rent">
          <div className="font-display text-3xl num">{eur(room.rent)}</div>
          <p className="text-sm text-muted-foreground">Due {fmtDate(nextDue(property!.rentDay))} · {eur(room.rent / 30.4)} a day</p>
          {pendingRent(data, t) > 0 && <p className="mt-3 text-sm text-warning-foreground">{eur(pendingRent(data, t))} rent still pending.</p>}
        </Panel>
      </div>

      {settlement && (
        <Panel title="Final settlement">
          <div className="space-y-1.5">{settlement.items.map((i) => <div key={i.label} className="flex justify-between text-sm"><span className="text-muted-foreground">{i.label}</span><Money value={i.amount} signed /></div>)}</div>
          <div className="mt-3 flex items-center justify-between border-t pt-3"><span className="font-display text-lg">{settlement.total >= 0 ? "Owed to you" : "You owe"}</span><span className="font-display text-2xl num">{eur(Math.abs(settlement.total))}</span></div>
          <p className="mt-2 text-xs text-muted-foreground">Status: {settlement.status}. Your landlord approves and pays the settlement; you'll see it here.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => downloadReceipt({ title: `Settlement · ${t.name}`, ref: settlement.id.slice(0, 8).toUpperCase(), date: new Date().toISOString(), lines: settlement.items.map((i) => [i.label, eur(i.amount)] as [string, string]), total: { label: "Final balance", amount: settlement.total } })}><Download className="h-4 w-4" /> Statement</Button>
        </Panel>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Rent history">
          {rentHistory.map((p) => <div key={p.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{p.description}</span><span className="flex items-center gap-2"><span className="num">{eur(p.amount)}</span><StatusBadge status={p.status} /></span></div>)}
        </Panel>
        <Panel title="Refunds">
          {refunds.length === 0 ? <p className="text-sm text-muted-foreground">No refunds yet.</p> : refunds.map((p) => <div key={p.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{p.description}</span><span className="num">{eur(p.amount)}</span></div>)}
        </Panel>
      </div>

      {pay && (
        <PayPalDialog open onOpenChange={(o) => !o && setPay(null)} amount={pay.amount} payee={pay.payeeName} description={pay.description} demo={mode === "demo"}
          onResult={async (status, ref) => {
            try {
              const { pendingId, depositId, ...p } = pay;
              if (ref) p.description = `${p.description} · PayPal ${ref}`;
              if (status === "Failed") await actions.pay({ ...p, status });
              else if (pendingId && mode === "demo") await actions.setPaymentStatus(pendingId, "Paid");
              else if (depositId) await actions.payDeposit(depositId);
              else await actions.pay({ ...p, status });
              if (status === "Paid") toast.success("Payment recorded"); else toast.error("Payment failed — nothing was charged.");
            } catch (e) { toast.error((e as Error).message); }
          }} />
      )}
    </div>
  );
}

function Row({ title, sub, amount, onPay }: { title: string; sub: string; amount: number; onPay: () => void }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1"><div className="text-sm font-medium">{title}</div><div className="text-xs text-muted-foreground">{sub}</div></div>
      <span className="num">{eur(amount)}</span>
      <Button size="sm" onClick={onPay}>Pay</Button>
    </div>
  );
}
