import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { outstanding } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { isCurrent } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { Avatar, PageHeader, Panel, StatusBadge, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owners/tenants")({
  head: () => meta("Tenants", "Tenant directory with tenancies, deposits, balances and payment history."),
  component: Tenants,
});

function Tenants() {
  const { property, pick, data, actions } = useScope();
  const tenancies = pick(data.tenancies).sort((a, b) => Number(isCurrent(b)) - Number(isCurrent(a)) || b.start.localeCompare(a.start));
  const [sel, setSel] = useState(tenancies[0]?.id ?? null);
  const [q, setQ] = useState("");
  const [inv, setInv] = useState(false);
  const [f, setF] = useState({ email: "", roomId: "" });
  const t = tenancies.find((x) => x.id === sel);
  const room = data.rooms.find((r) => r.id === t?.roomId);
  const dep = data.deposits.find((d) => d.tenancyId === t?.id);
  const history = t ? data.payments.filter((p) => p.payerId === t.tenantId && p.propertyId === t.propertyId).sort((a, b) => b.date.localeCompare(a.date)) : [];

  const invite = async () => {
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast.error("Enter a valid email.");
    await actions.invite(property!.id, f.roomId || null, f.email);
    toast.success(`Invitation recorded — share code ${property!.inviteCode} with ${f.email}`);
    setInv(false);
    setF({ email: "", roomId: "" });
  };

  return (
    <>
      <PageHeader eyebrow={property!.name} title="Tenants" actions={<Button onClick={() => setInv(true)}><UserPlus className="h-4 w-4" /> Invite tenant</Button>} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div>
          <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search tenants" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="divide-y rounded-lg border bg-card">
            {tenancies.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).map((x) => (
              <button key={x.id} onClick={() => setSel(x.id)} className={cn("flex w-full items-center gap-3 p-3 text-left text-sm transition hover:bg-muted/50", sel === x.id && "bg-secondary/60")}>
                <Avatar name={x.name} />
                <div className="flex-1"><div className="font-medium">{x.name}</div><div className="text-xs text-muted-foreground">{data.rooms.find((r) => r.id === x.roomId)?.name.split(" · ")[0]}</div></div>
                {isCurrent(x) ? <Tag tone="ok">Current</Tag> : x.start > new Date().toISOString().slice(0, 10) ? <Tag>Upcoming</Tag> : <Tag>Former</Tag>}
              </button>
            ))}
          </div>
          {data.invitations.filter((i) => i.propertyId === property!.id).length > 0 && (
            <div className="mt-4"><div className="eyebrow mb-2">Invitations</div>{data.invitations.filter((i) => i.propertyId === property!.id).map((i) => <div key={i.id} className="flex items-center gap-2 py-1 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{i.email} <span className="ml-auto text-xs text-muted-foreground">{i.status}</span></div>)}</div>
          )}
        </div>
        {t && (
          <div className="space-y-6">
            <Panel>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={t.name} className="h-14 w-14 text-xl" />
                <div className="flex-1"><div className="font-display text-2xl">{t.name}</div><div className="text-sm text-muted-foreground">{t.email ?? "No email"} · {room?.name}</div></div>
                <div className="text-right"><div className="eyebrow">Outstanding</div><div className={cn("font-display text-2xl num", outstanding(data, t) > 0 && "text-terracotta")}>{eur(outstanding(data, t))}</div></div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 text-sm md:grid-cols-4">
                <div><div className="eyebrow">Tenancy</div><div className="mt-1">{fmtDate(t.start)} – {fmtDate(t.end)}</div></div>
                <div><div className="eyebrow">Monthly rent</div><div className="mt-1 num">{eur(room?.rent ?? 0)}</div></div>
                <div><div className="eyebrow">Deposit</div><div className="mt-1">{dep ? `${eur(dep.amount)} · ${dep.status.replace("_", " ")}` : "—"}</div></div>
                <div><div className="eyebrow">Status</div><div className="mt-1 capitalize">{t.status.replace("_", " ")}{t.proposedEnd ? ` (${fmtDate(t.proposedEnd)})` : ""}</div></div>
              </div>
            </Panel>
            <Panel title="Payment history">
              {history.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : (
                <table className="w-full text-sm"><tbody className="divide-y">{history.map((p) => (
                  <tr key={p.id}><td className="py-2 text-muted-foreground">{fmtDate(p.date)}</td><td className="py-2">{p.description}</td><td className="py-2 text-right num">{eur(p.amount)}</td><td className="py-2 text-right"><StatusBadge status={p.status} /></td></tr>
                ))}</tbody></table>
              )}
            </Panel>
            <Panel title="Move-in / move-out history">
              {data.audit.filter((a) => a.propertyId === t.propertyId && a.action.includes(t.name)).map((a) => <div key={a.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{a.action}</span><span className="text-muted-foreground">{fmtDate(a.at)}</span></div>)}
            </Panel>
          </div>
        )}
      </div>
      <Dialog open={inv} onOpenChange={setInv}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display font-normal">Invite a tenant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Room (optional)</Label><Select value={f.roomId} onValueChange={(v) => setF({ ...f, roomId: v })}><SelectTrigger><SelectValue placeholder="Any room" /></SelectTrigger><SelectContent>{pick(data.rooms).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
            <p className="text-xs text-muted-foreground">They'll apply with code <b className="font-mono">{property!.inviteCode}</b>; you approve the application.</p>
          </div>
          <DialogFooter><Button onClick={invite}>Record invitation</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
