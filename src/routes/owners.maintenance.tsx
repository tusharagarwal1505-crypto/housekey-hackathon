import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { eur } from "@/lib/proration";
import type { Maintenance } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { PageHeader } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/owners/maintenance")({
  head: () => meta("Maintenance", "Track maintenance requests, status and costs."),
  component: MaintenancePage,
});

const cols: { key: Maintenance["status"]; label: string }[] = [{ key: "open", label: "Open" }, { key: "in_progress", label: "In progress" }, { key: "done", label: "Done" }];

function MaintenancePage() {
  const { property, pick, data, actions } = useScope();
  const items = pick(data.maintenance);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", details: "", roomId: "" });
  const total = items.reduce((s, m) => s + (m.cost ?? 0), 0);
  const add = async () => {
    if (!f.title.trim()) return toast.error("Add a title.");
    await actions.addMaintenance({ propertyId: property!.id, roomId: f.roomId || null, title: f.title, details: f.details || null });
    setOpen(false);
    setF({ title: "", details: "", roomId: "" });
    toast.success("Request logged");
  };
  return (
    <>
      <PageHeader eyebrow={property!.name} title="Maintenance" subtitle={`${eur(total)} logged in costs`} actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Log request</Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c) => (
          <div key={c.key} className="rounded-lg border bg-muted/30 p-3">
            <div className="eyebrow mb-3 px-1">{c.label} · {items.filter((m) => m.status === c.key).length}</div>
            <div className="space-y-2">
              {items.filter((m) => m.status === c.key).map((m) => (
                <div key={m.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.roomId ? data.rooms.find((r) => r.id === m.roomId)?.name.split(" · ")[0] : "Whole house"} · {fmtDate(m.createdAt)}</div>
                  {m.details && <p className="mt-1 text-xs">{m.details}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <Input className="h-8 w-24" type="number" placeholder="Cost €" defaultValue={m.cost ?? ""} onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== m.cost) actions.updateMaintenance(m.id, { cost: v }); }} />
                    <Select value={m.status} onValueChange={(v) => actions.updateMaintenance(m.id, { status: v as Maintenance["status"] })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{cols.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display font-normal">Log a maintenance request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><Label>Room</Label><Select value={f.roomId} onValueChange={(v) => setF({ ...f, roomId: v })}><SelectTrigger><SelectValue placeholder="Whole house" /></SelectTrigger><SelectContent>{pick(data.rooms).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Details</Label><Textarea value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={add}>Log request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
