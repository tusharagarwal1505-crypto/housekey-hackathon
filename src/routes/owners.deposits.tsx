import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { eur } from "@/lib/proration";
import { draftSettlement, settlementTotal } from "@/lib/ledger";
import type { Settlement, SettlementItem } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { Money, PageHeader, Panel, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/owners/deposits")({
  head: () => meta("Deposits", "Locked deposits, move-out requests, settlements and replacement handovers."),
  component: Deposits,
});

const label = { awaiting: "Awaiting payment", held: "Held", refund_due: "Refund due", returned: "Returned" } as const;

function Deposits() {
  const { property, pick, data, actions } = useScope();
  const deps = pick(data.deposits);
  const requests = pick(data.tenancies).filter((t) => t.status === "moveout_requested");
  const settlements = pick(data.settlements);
  const [edit, setEdit] = useState<Settlement | null>(null);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [line, setLine] = useState({ label: "", amount: "" });

  const openEdit = (s: Settlement) => { setEdit(s); setItems(s.items); };

  return (
    <>
      <PageHeader eyebrow={property!.name} title="Deposits & settlements" subtitle="Deposits are fixed per room. Tenants can't change them." />

      {requests.length > 0 && (
        <Panel className="mb-6 border-terracotta/50" title="Move-out requests">
          {requests.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 border-b py-3 last:border-0 sm:flex-row sm:items-center">
              <div className="flex-1"><b>{t.name}</b> wants to leave {data.rooms.find((r) => r.id === t.roomId)?.name.split(" · ")[0]} on <b>{fmtDate(t.proposedEnd)}</b>.
                <div className="text-xs text-muted-foreground">Approving calculates outstanding rent and bills and drafts a settlement: {eur(settlementTotal(draftSettlement(data, { ...t, end: t.proposedEnd })))}.</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => actions.decideMoveout(t.id, false).then(() => toast("Request declined"))}>Decline</Button>
                <Button onClick={() => actions.decideMoveout(t.id, true).then(() => toast.success("Move-out approved · settlement drafted"))}>Approve</Button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel title="Deposit ledger">
          <table className="w-full text-sm">
            <thead><tr className="text-left">{["Room", "Tenant", "Amount", "Status", ""].map((h) => <th key={h} className="eyebrow pb-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {deps.map((d) => {
                const t = data.tenancies.find((x) => x.id === d.tenancyId);
                return (
                  <tr key={d.id}>
                    <td className="py-2.5">{data.rooms.find((r) => r.id === d.roomId)?.name.split(" · ")[0]}</td>
                    <td className="py-2.5">{t?.name ?? "—"}</td>
                    <td className="py-2.5 num">{eur(d.amount)}</td>
                    <td className="py-2.5"><Tag tone={d.status === "held" ? "ok" : d.status === "returned" ? "muted" : "warn"}>{label[d.status]}</Tag></td>
                    <td className="py-2.5 text-right">
                      {d.status === "awaiting" && <Button size="sm" variant="ghost" onClick={async () => { await actions.pay({ propertyId: d.propertyId, category: "Deposit", description: `Deposit received · ${t?.name}`, amount: d.amount, payeeName: "Landlord", status: "Paid", payerId: t?.tenantId ?? null, payerName: t?.name ?? "Tenant" }); await actions.confirmDeposit(d.id); toast.success("Receipt recorded"); }}>Record receipt</Button>}
                      {d.status === "refund_due" && <Button size="sm" variant="ghost" onClick={() => actions.returnDeposit(d.id).then(() => toast.success("Deposit return recorded"))}>Mark returned</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0" />A replacement tenant paying a deposit, you returning the departing tenant's deposit, and your legal approval of the new tenancy are separate steps — each is recorded on its own.</div>
        </Panel>

        <Panel title="Settlements">
          {settlements.length === 0 ? <p className="text-sm text-muted-foreground">No settlements yet. They're drafted when you approve a move-out.</p> : settlements.map((s) => {
            const t = data.tenancies.find((x) => x.id === s.tenancyId);
            return (
              <div key={s.id} className="border-b py-3 last:border-0">
                <div className="flex items-center justify-between"><div><b>{t?.name}</b> <Tag tone={s.status === "paid" ? "ok" : s.status === "approved" ? "accent" : "warn"}>{s.status}</Tag></div><div className="font-display text-xl num">{eur(s.total)}</div></div>
                <div className="mt-2 space-y-1">{s.items.map((i) => <div key={i.label} className="flex justify-between text-xs"><span className="text-muted-foreground">{i.label}</span><Money value={i.amount} signed /></div>)}</div>
                {s.status !== "paid" && <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(s)}>Adjust</Button>{s.status === "draft" && <Button size="sm" onClick={() => actions.saveSettlement(s.id, s.items, "approved").then(() => toast.success("Settlement approved"))}>Approve</Button>}{s.status === "approved" && <Button size="sm" onClick={async () => { await actions.pay({ propertyId: s.propertyId, category: "Settlement", description: `Final settlement · ${t?.name}`, amount: s.total, payeeName: t?.name ?? "Tenant", status: "Paid" }); await actions.saveSettlement(s.id, s.items, "paid"); toast.success("Settlement payment recorded"); }}>Record payout</Button>}</div>}
              </div>
            );
          })}
        </Panel>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display font-normal">Adjust settlement</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {items.map((i, k) => <div key={k} className="flex justify-between text-sm"><span>{i.label}</span><span className="flex items-center gap-2"><Money value={i.amount} signed /><button className="text-xs text-muted-foreground underline" onClick={() => setItems(items.filter((_, j) => j !== k))}>remove</button></span></div>)}
            <div className="flex gap-2 pt-2"><Input placeholder="e.g. Approved repair: blind" value={line.label} onChange={(e) => setLine({ ...line, label: e.target.value })} /><Input className="w-28" type="number" placeholder="−50" value={line.amount} onChange={(e) => setLine({ ...line, amount: e.target.value })} /><Button variant="outline" onClick={() => { if (!line.label || !Number(line.amount)) return; setItems([...items, { label: line.label, amount: Number(line.amount) }]); setLine({ label: "", amount: "" }); }}>Add</Button></div>
            <p className="text-xs text-muted-foreground">Negative = owed by tenant. Every change is kept in the audit trail.</p>
            <div className="flex justify-between border-t pt-2 font-display text-lg"><span>Total</span><span className="num">{eur(settlementTotal(items))}</span></div>
          </div>
          <DialogFooter><Button onClick={async () => { await actions.saveSettlement(edit!.id, items, "draft"); setEdit(null); toast.success("Settlement updated"); }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
