import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Receipt, ScanLine } from "lucide-react";
import { useScope } from "@/lib/workspace";
import { billSplit } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { fmtDate, meta } from "@/lib/seo";
import { BillBreakdown, BillUploadDialog } from "@/components/hk/shared";
import { EmptyState, PageHeader, Panel, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owners/bills")({
  head: () => meta("Utility bills", "Household utility bills split by day-accurate occupancy."),
  component: Bills,
});

function Bills() {
  const { property, pick, data, actions } = useScope();
  const bills = pick(data.bills).sort((a, b) => b.start.localeCompare(a.start));
  const [sel, setSel] = useState<string | null>(bills[0]?.id ?? null);
  const [open, setOpen] = useState<false | "scan" | "manual">(false);
  const bill = bills.find((b) => b.id === sel) ?? bills[0];
  const disputes = pick(data.disputes);
  return (
    <>
      <PageHeader eyebrow={property!.name} title="Utility bills" actions={<><Button variant="outline" onClick={() => setOpen("manual")}><Plus className="h-4 w-4" /> Add manually</Button><Button onClick={() => setOpen("scan")}><ScanLine className="h-4 w-4" /> Scan a bill</Button></>} />
      {bills.length === 0 ? <EmptyState icon={<Receipt className="h-5 w-5" />} title="No bills yet" text="Scan or add your first utility bill." /> : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="divide-y rounded-lg border bg-card">
            {bills.map((b) => {
              const n = billSplit(data, b).lines.length;
              return (
                <button key={b.id} onClick={() => setSel(b.id)} className={cn("w-full p-4 text-left transition hover:bg-muted/50", bill?.id === b.id && "bg-secondary/60")}>
                  <div className="flex justify-between"><span className="font-medium">{b.type}</span><span className="num">{eur(b.total)}</span></div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.provider} · {fmtDate(b.start)} – {fmtDate(b.end)}</div>
                  <div className="mt-2 flex gap-1">{b.source === "AI scan" && <Tag tone="accent">AI scan</Tag>}<Tag>{n} residents</Tag>{disputes.some((d) => d.billId === b.id && d.status === "open") && <Tag tone="warn">Disputed</Tag>}</div>
                </button>
              );
            })}
          </div>
          {bill && (
            <div className="space-y-6">
              <Panel title={`${bill.type} · ${bill.provider}`} action={bill.reference && <span className="font-mono text-xs text-muted-foreground">{bill.reference}</span>}><BillBreakdown data={data} bill={bill} /></Panel>
              {disputes.filter((d) => d.billId === bill.id).map((d) => <Panel key={d.id} title="Dispute raised" className="border-terracotta/50"><p className="text-sm">“{d.reason}”</p><p className="mt-1 text-xs text-muted-foreground">{fmtDate(d.createdAt)} · {d.status}</p></Panel>)}
            </div>
          )}
        </div>
      )}
      <BillUploadDialog open={!!open} manual={open === "manual"} onOpenChange={(o) => !o && setOpen(false)} propertyId={property!.id} onSave={actions.addBill} />
    </>
  );
}
