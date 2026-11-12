import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, Sofa, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import type { Role } from "@/lib/model";
import { Loading } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Get set up · HouseKey" },
      { name: "description", content: "Choose your role and set up your property or tenancy." },
      { property: "og:title", content: "Get set up · HouseKey" },
      { property: "og:description", content: "Role-aware onboarding for landlords and tenants." },
    ],
  }),
  component: Start,
});

function Start() {
  const ws = useWorkspace();
  const { mode, loading, viewer, data, setRole, refresh } = ws;
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const [want, setWant] = useState<Role | null>(null);

  // claim a role chosen at sign-up
  useEffect(() => {
    if (mode !== "live" || !viewer || viewer.roles.length) return;
    const pending = localStorage.getItem("housekey-pending-role") as Role | null;
    if (pending) claim(pending);
  }, [mode, viewer?.userId]);

  const claim = async (r: Role) => {
    setClaiming(true);
    const { error } = await supabase.rpc("claim_role", { _role: r });
    setClaiming(false);
    localStorage.removeItem("housekey-pending-role");
    if (error) return toast.error(error.message);
    setRole(r);
    refresh();
  };

  useEffect(() => {
    if (mode === "none" && !loading) navigate({ to: "/auth" });
    if (mode === "demo") navigate({ to: viewer?.roles[0] === "landlord" ? "/owners" : "/living" });
  }, [mode, loading]);

  if (loading || claiming || !viewer) return <Loading />;

  const ownsSomething = data.properties.some((p) => p.ownerId === viewer.userId);
  const hasTenancy = data.tenancies.some((t) => t.tenantId === viewer.userId);
  const myApps = data.applications.filter((a) => a.applicantId === viewer.userId);
  const target = want ?? (viewer.roles.length === 1 ? viewer.roles[0]! : null);

  if (!viewer.roles.length || (want && !viewer.roles.includes(want))) {
    return (
      <Shell title="How will you use HouseKey?">
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => claim("tenant")} className="rounded-lg border bg-card p-6 text-left hover:border-mauve"><Sofa className="h-5 w-5 text-mauve" /><div className="mt-4 font-display text-xl">I rent a room</div><p className="mt-1 text-sm text-muted-foreground">HouseKey Living</p></button>
          <button onClick={() => claim("landlord")} className="rounded-lg border bg-card p-6 text-left hover:border-mauve"><Building2 className="h-5 w-5 text-mauve" /><div className="mt-4 font-display text-xl">I own or manage property</div><p className="mt-1 text-sm text-muted-foreground">HouseKey for Owners</p></button>
        </div>
      </Shell>
    );
  }

  if (!target) {
    return (
      <Shell title="Which side today?">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" variant="outline" onClick={() => { setRole("landlord"); navigate({ to: "/owners" }); }}>HouseKey for Owners</Button>
          <Button size="lg" variant="outline" onClick={() => { setRole("tenant"); navigate({ to: "/living" }); }}>HouseKey Living</Button>
        </div>
      </Shell>
    );
  }

  if (target === "landlord") {
    if (ownsSomething) { setRole("landlord"); navigate({ to: "/owners" }); return <Loading />; }
    return <Shell title="Add your first property"><CreateProperty onDone={() => { setRole("landlord"); navigate({ to: "/owners" }); }} /></Shell>;
  }

  if (hasTenancy) { setRole("tenant"); navigate({ to: "/living" }); return <Loading />; }
  return (
    <Shell title="Join your home">
      {myApps.length > 0 ? (
        <div className="space-y-3">
          {myApps.map((a) => <div key={a.id} className="rounded-md border bg-card p-4 text-sm">Application sent {new Date(a.createdAt).toLocaleDateString("en-IE")} · <b className="capitalize">{a.status}</b></div>)}
          <p className="text-sm text-muted-foreground">Your landlord will review it. Once approved, your home appears here automatically.</p>
          <Button variant="outline" onClick={refresh}>Check again</Button>
        </div>
      ) : (
        <Apply name={viewer.name} />
      )}
      <button onClick={() => setWant("landlord")} className="mt-8 text-sm text-muted-foreground underline">I'm also a landlord</button>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link to="/" className="font-display text-xl">HouseKey</Link>
      <h1 className="mt-12 font-display text-4xl">{title}</h1>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function CreateProperty({ onDone }: { onDone: (id: string) => void }) {
  const { actions } = useWorkspace();
  const [f, setF] = useState({ name: "", address: "", rentDay: "1" });
  const [rooms, setRooms] = useState([{ name: "Room 1", rent: "800", deposit: "500" }]);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.name.trim() || !f.address.trim()) return toast.error("Add a name and address.");
    if (rooms.some((r) => !r.name.trim() || !(Number(r.rent) > 0) || !(Number(r.deposit) >= 0))) return toast.error("Each room needs a name, rent and deposit.");
    setBusy(true);
    try {
      const id = await actions.addProperty({ name: f.name.trim(), address: f.address.trim(), rentDay: Number(f.rentDay) || 1, rooms: rooms.map((r) => ({ name: r.name, rent: Number(r.rent), deposit: Number(r.deposit) })) });
      toast.success(`${f.name} created`);
      onDone(id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div><Label>Property name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Maple House" /></div>
      <div><Label>Address</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="14 Maple Terrace, Dublin 6" /></div>
      <div className="w-32"><Label>Rent due day</Label><Input type="number" min="1" max="28" value={f.rentDay} onChange={(e) => setF({ ...f, rentDay: e.target.value })} /></div>
      <div>
        <div className="eyebrow mb-2">Rooms · rent and deposit per room</div>
        <div className="space-y-2">
          {rooms.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2">
              <Input value={r.name} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input type="number" value={r.rent} aria-label="Rent" onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, rent: e.target.value } : x)))} />
              <Input type="number" value={r.deposit} aria-label="Deposit" onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, deposit: e.target.value } : x)))} />
              <Button variant="ghost" size="icon" aria-label="Remove room" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRooms([...rooms, { name: `Room ${rooms.length + 1}`, rent: "800", deposit: "500" }])}><Plus className="h-4 w-4" /> Add room</Button>
      </div>
      <p className="text-xs text-muted-foreground">Deposits are locked once set — tenants always see and pay exactly this amount.</p>
      <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create property</Button>
    </div>
  );
}

export function Apply({ name: initial }: { name: string }) {
  const { actions, refresh } = useWorkspace();
  const [f, setF] = useState({ code: "", name: initial, message: "", moveIn: "" });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!f.code.trim() || !f.name.trim()) return toast.error("Enter the invite code from your landlord and your name.");
    setBusy(true);
    try {
      await actions.applyWithCode(f.code, f.name, f.message, f.moveIn || null);
      toast.success("Application sent to your landlord");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div><Label>Invite code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="MAPLE-7Q4K" className="font-mono uppercase" /></div>
      <div><Label>Your name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>Preferred move-in</Label><Input type="date" value={f.moveIn} onChange={(e) => setF({ ...f, moveIn: e.target.value })} /></div>
      <div><Label>A note for the landlord</Label><Textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="A little about you" /></div>
      <Button onClick={send} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Send application</Button>
    </div>
  );
}
