import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { useScope } from "@/lib/workspace";
import { eur } from "@/lib/proration";
import { fmtDate, meta } from "@/lib/seo";
import { PageHeaderLite, StatusBadge } from "@/components/hk/kit";
import { receiptFor } from "./owners.payments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/living/activity")({
  head: () => meta("Activity", "Everything that happened in your household ledger."),
  component: () => {
    const { data, pick, viewer } = useScope();
    const [tab, setTab] = useState<"mine" | "house">("mine");
    const pays = pick(data.payments).filter((p) => (tab === "mine" ? p.payerId === viewer!.userId : true)).sort((a, b) => b.date.localeCompare(a.date));
    const log = pick(data.audit.filter((a): a is typeof a & { propertyId: string } => !!a.propertyId));
    return (
      <div className="space-y-6">
        <PageHeaderLite title="Activity" />
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">{(["mine", "house"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn("flex-1 rounded px-3 py-1.5", tab === t && "bg-card shadow-sm")}>{t === "mine" ? "My payments" : "Household ledger"}</button>)}</div>
        <div className="divide-y rounded-lg border bg-card">
          {pays.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="flex-1"><div>{p.description}</div><div className="text-xs text-muted-foreground">{p.payerName} → {p.payeeName} · {fmtDate(p.date)} · <span className="font-mono">{p.reference}</span></div></div>
              <span className="num">{eur(p.amount)}</span><StatusBadge status={p.status} />
              {p.status === "Paid" && p.payerId === viewer!.userId && <Button size="icon" variant="ghost" aria-label="Receipt" onClick={() => receiptFor(p)}><Download className="h-4 w-4" /></Button>}
            </div>
          ))}
        </div>
        {tab === "house" && (
          <div><div className="eyebrow mb-2">Audit trail</div>{log.map((a) => <div key={a.id} className="flex justify-between border-b py-2 text-xs"><span>{a.action}</span><span className="text-muted-foreground">{a.actor} · {fmtDate(a.at)}</span></div>)}</div>
        )}
      </div>
    );
  },
});
