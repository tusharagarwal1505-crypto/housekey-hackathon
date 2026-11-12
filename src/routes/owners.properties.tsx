import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { useScope } from "@/lib/workspace";
import { propertyStats } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { meta } from "@/lib/seo";
import { PageHeader } from "@/components/hk/kit";
import { CreateProperty } from "./start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/owners/properties")({
  head: () => meta("Properties", "All the properties you manage on HouseKey."),
  component: Properties,
});

function Properties() {
  const loc = useLocation();
  const { data, viewer, setPropertyId } = useScope();
  const [open, setOpen] = useState(false);
  if (loc.pathname.replace(/\/$/, "") !== "/owners/properties") return <Outlet />;
  const mine = data.properties.filter((p) => p.ownerId === viewer!.userId);
  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Properties" actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add property</Button>} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mine.map((p) => {
          const s = propertyStats(data, p.id);
          return (
            <Link key={p.id} to="/owners/properties/$id" params={{ id: p.id }} onClick={() => setPropertyId(p.id)} className="group overflow-hidden rounded-lg border bg-card transition hover:border-mauve">
              <div className="aspect-[16/9] bg-secondary">
                {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Building2 className="h-8 w-8 text-mauve/50" /></div>}
              </div>
              <div className="p-5">
                <div className="font-display text-xl">{p.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{p.address}</div>
                <div className="mt-4 grid grid-cols-3 border-t pt-3 text-sm">
                  <div><div className="eyebrow">Rooms</div><div className="mt-1 num">{s.rooms}</div></div>
                  <div><div className="eyebrow">Occupied</div><div className="mt-1 num">{s.occupancyRate}%</div></div>
                  <div><div className="eyebrow">Monthly</div><div className="mt-1 num">{eur(s.expected)}</div></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="font-display font-normal">New property</DialogTitle></DialogHeader><CreateProperty onDone={(id) => { setPropertyId(id); setOpen(false); }} /></DialogContent>
      </Dialog>
    </>
  );
}
