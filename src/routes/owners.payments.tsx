import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { eur } from "@/lib/proration";
import { downloadReceipt } from "@/lib/receipt";
import { isCurrent, type TxStatus } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { EmptyState, PageHeader, StatusBadge } from "@/components/hk/kit";
import { OwnerReminders } from "@/components/hk/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/owners/payments")({
  head: () => meta("Rent & payments", "The full payment ledger: rent, deposits, utilities and settlements."),
  component: Payments,
});

export function receiptFor(p: { description: string; reference: string; date: string; payerName: string; payeeName: string; category: string; method: string; status: string; amount: number }) {
  return downloadReceipt({ title: p.description, ref: p.reference, date: p.date, lines: [["From", p.payerName], ["To", p.payeeName], ["Category", p.category], ["Method", p.method], ["Status", p.status]], total: { label: "Amount", amount: p.amount } });
}

function Payments() {
  const { property, pick, data, actions } = useScope();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | TxStatus>("all");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ tenancyId: "", month: new Date().toISOString().slice(0, 7) });
  const rows = useMemo(() => pick(data.payments).filter((p) => (status === "all" || p.status === status) && (cat === "all" || p.category === cat) && `${p.description} ${p.payerName} ${p.reference}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date)), [data.payments, q, status, cat]);
  const total = rows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.amount, 0);

  const charge = async () => {
    const t = data.tenancies.find((x) => x.id === f.tenancyId);
    const room = data.rooms.find((r) => r.id === t?.roomId);
    if (!t || !room) return toast.error("Choose a tenant.");
    const m = new Date(f.month + "-01").toLocaleString("en-IE", { month: "short" });
    await actions.pay({ propertyId: property!.id, category: "Rent", description: `${m} rent · ${room.name.split(" · ")[0]}`, amount: room.rent, payeeName: "Landlord", status: "Pending", payerId: t.tenantId, payerName: t.name });
    toast.success(`Rent request created for ${t.name}`);
    setOpen(false);
  };

  return (
    <>
      <PageHeader eyebrow={property!.name} title="Rent & payments" subtitle={`${rows.length} transactions · ${eur(total)} paid in view`} actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Request rent</Button>} />
      <OwnerReminders />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, description, reference" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{["all", "Pending", "Paid", "Failed", "Refunded"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>)}</SelectContent></Select>
        <Select value={cat} onValueChange={setCat}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{["all", "Rent", "Deposit", "Utility", "Settlement", "Refund", "Expense"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All types" : s}</SelectItem>)}</SelectContent></Select>
      </div>
      {rows.length === 0 ? <EmptyState icon={<Search className="h-5 w-5" />} title="Nothing matches" text="Try clearing the filters." /> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/40 text-left"><tr>{["Date", "Description", "From → To", "Reference", "Amount", "Status", ""].map((h) => <th key={h} className="eyebrow px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.date)}</td>
                  <td className="px-4 py-3"><div>{p.description}</div><div className="text-xs text-muted-foreground">{p.category} · {p.method}</div></td>
                  <td className="px-4 py-3">{p.payerName} → {p.payeeName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.reference}</td>
                  <td className="px-4 py-3 num">{eur(p.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "Pending" && <Button size="sm" variant="ghost" onClick={() => actions.setPaymentStatus(p.id, "Paid").then(() => toast.success("Marked paid"))}>Mark paid</Button>}
                    {p.status === "Paid" && <Button size="icon" variant="ghost" aria-label="Receipt" onClick={() => receiptFor(p)}><Download className="h-4 w-4" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display font-normal">Request rent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tenant</Label><Select value={f.tenancyId} onValueChange={(v) => setF({ ...f, tenancyId: v })}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{pick(data.tenancies).filter((t) => isCurrent(t)).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Month</Label><Input type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={charge}>Create request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
