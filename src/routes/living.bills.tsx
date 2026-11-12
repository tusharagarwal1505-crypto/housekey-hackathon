import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Flag, Receipt, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { sharesFor } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { fmtDate, meta } from "@/lib/seo";
import { BillBreakdown, BillUploadDialog } from "@/components/hk/shared";
import { EmptyState, PageHeaderLite, Panel, PayPalDialog, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/living/bills")({
  head: () => meta("Bills", "Your share of each household bill, and exactly how it was worked out."),
  component: Bills,
});

function Bills() {
  const { data, myTenancy: t, actions, property } = useScope();
  const shares = t ? sharesFor(data, t).sort((a, b) => b.bill.start.localeCompare(a.bill.start)) : [];
  const [sel, setSel] = useState<string | null>(shares[0]?.bill.id ?? null);
  const [paying, setPaying] = useState(false);
  const [dispute, setDispute] = useState("");
  const [dOpen, setDOpen] = useState(false);
  const [up, setUp] = useState(false);
  if (!t) return null;
  const cur = shares.find((s) => s.bill.id === sel) ?? shares[0];
  const now = shares.filter((s) => !s.paid);
  const past = shares.filter((s) => s.paid);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between"><PageHeaderLite title="Bills" subtitle="You only pay for the days you lived here." /><Button variant="outline" size="sm" onClick={() => setUp(true)}><ScanLine className="h-4 w-4" /> Add a bill</Button></div>
      {shares.length === 0 ? <EmptyState icon={<Receipt className="h-5 w-5" />} title="No bills for your dates" text="When a household bill covers days you lived here, your share appears." /> : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            {[["To pay", now], ["Previous", past]].map(([label, list]) => (list as typeof shares).length > 0 && (
              <div key={label as string}>
                <div className="eyebrow mb-2">{label as string}</div>
                <div className="divide-y rounded-lg border bg-card">
                  {(list as typeof shares).map((s) => (
                    <button key={s.bill.id} onClick={() => setSel(s.bill.id)} className={cn("w-full p-3 text-left transition hover:bg-muted/50", cur?.bill.id === s.bill.id && "bg-secondary/60")}>
                      <div className="flex justify-between text-sm"><span className="font-medium">{s.bill.type}</span><span className="num">{eur(s.amount)}</span></div>
                      <div className="text-xs text-muted-foreground">{fmtDate(s.bill.start)} – {fmtDate(s.bill.end)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {cur && (
            <div className="space-y-6">
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><div className="eyebrow">{cur.bill.provider}</div><div className="mt-1 font-display text-2xl">{cur.bill.type}</div><div className="text-sm text-muted-foreground">{fmtDate(cur.bill.start)} – {fmtDate(cur.bill.end)}</div></div>
                  <div className="text-right"><div className="eyebrow">Your share</div><div className="font-display text-3xl num">{eur(cur.amount)}</div><div className="text-xs text-muted-foreground">{cur.days} days × {eur(cur.perDay)}</div></div>
                </div>
                <div className="mt-4 flex gap-2">
                  {cur.paid ? <Tag tone="ok">Paid</Tag> : <Button onClick={() => setPaying(true)}>Pay my share</Button>}
                  <Button variant="ghost" onClick={() => setDOpen(true)}><Flag className="h-4 w-4" /> Dispute</Button>
                </div>
              </Panel>
              <Panel title="How it was calculated"><BillBreakdown data={data} bill={cur.bill} highlight={t.id} /></Panel>
            </div>
          )}
        </div>
      )}
      {cur && <PayPalDialog open={paying} onOpenChange={setPaying} amount={cur.amount} payee="Household" description={`${cur.bill.type} share`} onResult={async (status, ref) => { await actions.pay({ propertyId: cur.bill.propertyId, category: "Utility", description: `${cur.bill.type} share ${cur.bill.start.slice(5)}→${cur.bill.end.slice(5)}${ref ? ` · PayPal ${ref}` : ""}`, amount: cur.amount, payeeName: "Household", billId: cur.bill.id, status }); status === "Paid" ? toast.success("Share paid") : toast.error("Payment failed"); }} />}
      <Dialog open={dOpen} onOpenChange={setDOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display font-normal">Raise a dispute</DialogTitle></DialogHeader>
          <Textarea value={dispute} onChange={(e) => setDispute(e.target.value)} placeholder="e.g. I was away 10–20 Oct — should the dates change?" />
          <DialogFooter><Button onClick={async () => { if (!dispute.trim() || !cur) return; await actions.raiseDispute(cur.bill.id, cur.bill.propertyId, dispute.trim()); setDOpen(false); setDispute(""); toast.success("Dispute sent to your landlord and housemates"); }}>Send</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BillUploadDialog open={up} onOpenChange={setUp} propertyId={property!.id} onSave={actions.addBill} />
    </div>
  );
}
