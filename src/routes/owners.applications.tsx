import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, Info } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import type { Application } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { Avatar, EmptyState, PageHeader, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/owners/applications")({
  head: () => meta("Applications", "Review and approve tenant applications."),
  component: Applications,
});

function Applications() {
  const { property, pick, data, actions } = useScope();
  const apps = pick(data.applications).sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
  const [approving, setApproving] = useState<Application | null>(null);
  const [f, setF] = useState({ roomId: "", start: "", end: "" });

  const open = (a: Application) => {
    setApproving(a);
    setF({ roomId: a.roomId ?? "", start: a.moveIn ?? "", end: "" });
  };
  const approve = async () => {
    if (!approving || !f.roomId || !f.start) return toast.error("Choose a room and start date.");
    try {
      await actions.decideApplication(approving, true, f.roomId, f.start, f.end || null);
      toast.success(`${approving.name} approved — deposit request created`);
      setApproving(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader eyebrow={property!.name} title="Applications" subtitle={`Applicants use code ${property!.inviteCode}.`} />
      {apps.length === 0 ? <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No applications yet" text={`Share your invite code ${property!.inviteCode} with prospective tenants.`} /> : (
        <div className="divide-y rounded-lg border bg-card">
          {apps.map((a) => (
            <div key={a.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <Avatar name={a.name} className="h-11 w-11" />
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-medium">{a.name}</span><Tag tone={a.status === "pending" ? "warn" : a.status === "approved" ? "ok" : "muted"}>{a.status}</Tag></div>
                <div className="text-sm text-muted-foreground">{a.email ?? ""} · Move-in {fmtDate(a.moveIn)} · Applied {fmtDate(a.createdAt)}</div>
                {a.message && <p className="mt-2 max-w-xl text-sm">“{a.message}”</p>}
              </div>
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={async () => { await actions.decideApplication(a, false); toast("Application declined"); }}>Decline</Button>
                  <Button onClick={() => open(a)}>Approve</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display font-normal">Approve {approving?.name}</DialogTitle><DialogDescription>Creates their tenancy record and a deposit request for the room's fixed amount.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Room</Label><Select value={f.roomId} onValueChange={(v) => setF({ ...f, roomId: v })}><SelectTrigger><SelectValue placeholder="Choose a room" /></SelectTrigger><SelectContent>{pick(data.rooms).map((r) => <SelectItem key={r.id} value={r.id}>{r.name} · €{r.rent}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Tenancy start</Label><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div><div><Label>Expected end</Label><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div></div>
            <div className="flex gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0" />Approval here records your decision in HouseKey. Sign the tenancy agreement and register it with the RTB as usual.</div>
          </div>
          <DialogFooter><Button onClick={approve}>Approve application</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
