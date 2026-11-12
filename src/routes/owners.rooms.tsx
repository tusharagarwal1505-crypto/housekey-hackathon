import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Lock } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { eur } from "@/lib/proration";
import { isCurrent } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { PageHeader, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/owners/rooms")({
  head: () => meta("Rooms", "Room-by-room rent, deposits, availability and current tenants."),
  component: Rooms,
});

function Rooms() {
  const { property, pick, data, actions } = useScope();
  const rooms = pick(data.rooms);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", rent: "800", deposit: "500" });
  const [editing, setEditing] = useState<{ id: string; rent: string; weight: string } | null>(null);

  const add = async () => {
    if (!f.name.trim() || !(Number(f.rent) > 0)) return toast.error("Name and rent required.");
    await actions.addRoom({ propertyId: property!.id, name: f.name, rent: Number(f.rent), deposit: Number(f.deposit) });
    toast.success("Room added");
    setOpen(false);
    setF({ name: "", rent: "800", deposit: "500" });
  };

  return (
    <>
      <PageHeader eyebrow={property!.name} title="Rooms" actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add room</Button>} />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/40 text-left"><tr>{["Room", "Rent", "Deposit", "Split weight", "Status", "Current tenant", "Start", "Expected end", "Listed", ""].map((h) => <th key={h} className="eyebrow px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rooms.map((r) => {
              const t = data.tenancies.find((x) => x.roomId === r.id && isCurrent(x));
              const isEd = editing?.id === r.id;
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 num">{isEd ? <Input className="h-8 w-24" type="number" value={editing.rent} onChange={(e) => setEditing({ ...editing, rent: e.target.value })} /> : eur(r.rent)}</td>
                  <td className="px-4 py-3 num"><span className="inline-flex items-center gap-1">{eur(r.deposit)} <Lock className="h-3 w-3 text-muted-foreground" /></span></td>
                  <td className="px-4 py-3 num">{isEd ? <Input className="h-8 w-20" type="number" step="0.1" value={editing.weight} onChange={(e) => setEditing({ ...editing, weight: e.target.value })} /> : `×${r.weight}`}</td>
                  <td className="px-4 py-3">{t ? (t.status === "moveout_requested" ? <Tag tone="warn">Move-out requested</Tag> : <Tag tone="ok">Occupied</Tag>) : <Tag tone="warn">Vacant</Tag>}</td>
                  <td className="px-4 py-3">{t?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(t?.start)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(t?.proposedEnd ?? t?.end)}</td>
                  <td className="px-4 py-3"><Switch checked={r.available} onCheckedChange={(v) => actions.updateRoom(r.id, { available: v })} aria-label="Listed as available" /></td>
                  <td className="px-4 py-3 text-right">
                    {isEd ? <Button size="sm" onClick={async () => { await actions.updateRoom(r.id, { rent: Number(editing.rent), weight: Number(editing.weight) || 1 }); setEditing(null); toast.success("Room updated"); }}>Save</Button> : <Button size="sm" variant="ghost" onClick={() => setEditing({ id: r.id, rent: String(r.rent), weight: String(r.weight) })}>Edit</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Deposits are fixed once a room is created so replacement tenants always pay the same verified amount. Split weight lets bigger rooms carry a larger share of utility bills (×1 = equal split).</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display font-normal">Add a room</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Room 5 · Box room" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monthly rent (€)</Label><Input type="number" value={f.rent} onChange={(e) => setF({ ...f, rent: e.target.value })} /></div>
              <div><Label>Deposit (€)</Label><Input type="number" value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={add}>Add room</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
