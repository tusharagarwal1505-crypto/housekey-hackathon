import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Building2, Camera, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { propertyStats } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { isCurrent } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { Metric, PageHeader, Panel, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/owners/properties/$id")({
  head: () => meta("Property", "Property details, rooms, occupancy history and expenses."),
  component: PropertyPage,
});

function PropertyPage() {
  const { id } = Route.useParams();
  const { data, actions, mode } = useWorkspace();
  const p = data.properties.find((x) => x.id === id);
  const [edit, setEdit] = useState<{ name: string; address: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  if (!p) return <p className="text-muted-foreground">Property not found.</p>;
  const s = propertyStats(data, p.id);
  const rooms = data.rooms.filter((r) => r.propertyId === p.id);
  const history = data.tenancies.filter((t) => t.propertyId === p.id).sort((a, b) => b.start.localeCompare(a.start));
  const expenses = data.expenses.filter((e) => e.propertyId === p.id);

  const upload = async (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error("Choose an image.");
    setUploading(true);
    try {
      let url: string;
      if (mode === "demo") {
        url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
      } else {
        const path = `${p.id}/${Date.now()}-${f.name.replace(/[^\w.]/g, "")}`;
        const { error } = await supabase.storage.from("property-photos").upload(path, f);
        if (error) throw error;
        const { data: signed, error: sErr } = await supabase.storage.from("property-photos").createSignedUrl(path, 60 * 60 * 24 * 365); if (sErr) throw sErr; url = signed.signedUrl;
      }
      await actions.updateProperty(p.id, { photoUrl: url });
      toast.success("Photo updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Link to="/owners/properties" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Properties</Link>
      <PageHeader eyebrow="Property" title={p.name} subtitle={p.address} actions={<Button variant="outline" onClick={() => setEdit({ name: p.name, address: p.address })}>Edit details</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg border bg-secondary">
          {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Building2 className="h-10 w-10 text-mauve/50" /></div>}
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button size="sm" variant="secondary" className="absolute bottom-3 right-3" onClick={() => file.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Photo</Button>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
            <Metric label="Rooms" value={String(s.rooms)} />
            <Metric label="Occupancy" value={`${s.occupancyRate}%`} />
            <Metric label="Monthly rent roll" value={eur(rooms.reduce((a, r) => a + r.rent, 0))} />
            <Metric label="Deposits held" value={eur(s.deposits)} />
          </div>
          {edit && (
            <Panel title="Edit details">
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
                <div><Label>Address</Label><Input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
                <div className="flex gap-2"><Button onClick={async () => { await actions.updateProperty(p.id, edit); setEdit(null); toast.success("Saved"); }}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
              </div>
            </Panel>
          )}
          <Panel title="Tenant invite code">
            <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3"><span className="font-mono text-lg">{p.inviteCode}</span><Button size="icon" variant="ghost" aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(p.inviteCode); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button></div>
            <p className="mt-2 text-xs text-muted-foreground">Prospective tenants use this code to apply. You approve every application.</p>
          </Panel>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Rooms" action={<Link to="/owners/rooms" className="text-xs underline">Manage</Link>}>
          {rooms.map((r) => {
            const t = history.find((x) => x.roomId === r.id && isCurrent(x));
            return <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0"><span>{r.name}</span><span className="flex items-center gap-3"><span className="num">{eur(r.rent)}</span>{t ? <span className="text-muted-foreground">{t.name}</span> : <Tag tone="warn">Vacant</Tag>}</span></div>;
          })}
        </Panel>
        <Panel title="Occupancy history">
          {history.map((t) => <div key={t.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{t.name} · {data.rooms.find((r) => r.id === t.roomId)?.name.split(" · ")[0]}</span><span className="text-muted-foreground">{fmtDate(t.start)} – {t.end ? fmtDate(t.end) : "ongoing"}</span></div>)}
        </Panel>
        <Panel title="Property expenses" action={<Link to="/owners/reports" className="text-xs underline">Record expense</Link>}>
          {expenses.length === 0 ? <p className="text-sm text-muted-foreground">No expenses recorded.</p> : expenses.map((e) => <div key={e.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{e.description} <span className="text-muted-foreground">· {e.category}</span></span><span className="num">{eur(e.amount)}</span></div>)}
        </Panel>
      </div>
    </>
  );
}
