import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Bell, LogOut, RefreshCw, Repeat } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { demoPersonas } from "@/lib/demo";
import { useWorkspace } from "@/lib/workspace";
import type { Role } from "@/lib/model";
import { Avatar, Loading } from "./kit";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Renders the app only for a viewer with the right role and a property; otherwise shows the next step inline. */
export function Gate({ need, children }: { need: Role; children: ReactNode }) {
  const { mode, loading, viewer, role, setRole, propertyId } = useWorkspace();
  const ok = !!viewer?.roles.includes(need);
  useEffect(() => { if (ok && role !== need) setRole(need); }, [ok, role, need]);
  if (loading || (mode === "live" && !viewer)) return <Loading />;
  if (mode === "none" || !viewer)
    return (
      <Center title="Sign in to continue" text="Use your HouseKey account, or explore the Maple House demo.">
        <Button asChild><Link to="/auth">Sign in</Link></Button>
        <Button variant="outline" asChild><Link to="/demo">Try the demo</Link></Button>
      </Center>
    );
  if (!viewer.roles.includes(need))
    return (
      <Center title={need === "landlord" ? "This is the owners' app" : "This is the tenants' app"} text={`Your account doesn't have ${need === "landlord" ? "landlord" : "tenant"} access.`}>
        <Button asChild><Link to={need === "landlord" ? "/living" : "/owners"}>Go to my app</Link></Button>
        <Button variant="outline" asChild><Link to="/start">Set up {need} access</Link></Button>
      </Center>
    );
  if (role !== need) return <Loading />;
  if (!propertyId)
    return (
      <Center title={need === "landlord" ? "Add your first property" : "You're not in a home yet"} text={need === "landlord" ? "Create a property and its rooms to get started." : "Apply with your landlord's invite code."}>
        <Button asChild><Link to="/start">Continue setup</Link></Button>
      </Center>
    );
  return <>{children}</>;
}

function Center({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>
      <div className="mt-6 flex gap-2">{children}</div>
    </div>
  );
}

export function NotificationBell({ dark }: { dark?: boolean }) {
  const { data, actions } = useWorkspace();
  const unread = data.notifications.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(o) => !o && unread && actions.readNotifications()}>
      <PopoverTrigger asChild>
        <button aria-label="Notifications" className={cn("relative grid h-9 w-9 place-items-center rounded-md border", dark ? "border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" : "bg-card hover:bg-muted")}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-terracotta px-1 text-[10px] text-terracotta-foreground">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 font-display">Notifications</div>
        <div className="max-h-80 overflow-auto">
          {data.notifications.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing new.</p>}
          {data.notifications.map((n) => (
            <div key={n.id} className={cn("border-b px-4 py-3 text-sm last:border-0", !n.read && "bg-secondary/50")}>
              <div>{n.body}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{new Date(n.at).toLocaleString("en-IE")}</div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AccountMenu({ dark }: { dark?: boolean }) {
  const { viewer, mode, role, setRole, data, propertyId, setPropertyId, startDemo, exitDemo, resetDemo } = useWorkspace();
  const navigate = useNavigate();
  const qc = useQueryClient();
  if (!viewer) return null;
  const props = role === "landlord" ? data.properties.filter((p) => p.ownerId === viewer.userId) : data.properties.filter((p) => data.tenancies.some((t) => t.propertyId === p.id && t.tenantId === viewer.userId));
  const signOut = async () => {
    if (mode === "demo") {
      exitDemo();
      return navigate({ to: "/demo", replace: true });
    }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("flex items-center gap-2 rounded-md p-1 pr-2 text-left text-sm", dark ? "text-sidebar-foreground hover:bg-sidebar-accent" : "hover:bg-muted")}>
          <Avatar name={viewer.name} />
          <span className="hidden max-w-[120px] truncate sm:block">{viewer.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal"><div className="font-medium">{viewer.name}</div><div className="text-xs text-muted-foreground">{mode === "demo" ? "Demo account" : viewer.email}</div></DropdownMenuLabel>
        {props.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="eyebrow">Property</DropdownMenuLabel>
            {props.map((p) => <DropdownMenuItem key={p.id} onClick={() => setPropertyId(p.id)}>{p.id === propertyId ? "● " : ""}{p.name}</DropdownMenuItem>)}
          </>
        )}
        {viewer.roles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { const r = role === "landlord" ? "tenant" : "landlord"; setRole(r); navigate({ to: r === "landlord" ? "/owners" : "/living" }); }}><Repeat className="h-4 w-4" /> Switch to {role === "landlord" ? "HouseKey Living" : "HouseKey for Owners"}</DropdownMenuItem>
          </>
        )}
        {mode === "demo" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="eyebrow">Demo · switch account</DropdownMenuLabel>
            {demoPersonas.filter((p) => p.userId !== viewer.userId).map((p) => (
              <DropdownMenuItem key={p.userId} onClick={() => { startDemo(p.userId); navigate({ to: p.roles[0] === "landlord" ? "/owners" : "/living" }); }}>{p.name} <span className="ml-auto text-xs text-muted-foreground">{p.roles[0] === "landlord" ? "Owner" : "Tenant"}</span></DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={resetDemo}><RefreshCw className="h-4 w-4" /> Reset demo data</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" /> {mode === "demo" ? "Leave demo" : "Sign out"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Always-visible Owner / Tenant toggle. In demo it swaps to the matching demo person. */
export function RoleSwitch({ dark }: { dark?: boolean }) {
  const { viewer, mode, role, setRole, startDemo } = useWorkspace();
  const navigate = useNavigate();
  if (!viewer) return null;
  const go = (r: Role) => {
    if (r === role) return;
    const path = r === "landlord" ? "/owners" : "/living";
    if (viewer.roles.includes(r)) { setRole(r); return navigate({ to: path }); }
    if (mode === "demo") {
      const p = demoPersonas.find((x) => x.roles.includes(r) && x.userId !== "u-max")!;
      startDemo(p.userId);
      return navigate({ to: path });
    }
    navigate({ to: "/start" });
  };
  const opt = (r: Role, label: string) => (
    <button key={r} onClick={() => go(r)} aria-pressed={role === r}
      className={cn("rounded px-2.5 py-1 text-xs font-medium transition sm:px-3", role === r ? (dark ? "bg-sidebar-accent text-sidebar-accent-foreground" : "bg-primary text-primary-foreground") : "text-muted-foreground hover:text-foreground")}>
      {label}
    </button>
  );
  return <div role="group" aria-label="Switch app" className="flex rounded-md border bg-card p-0.5">{opt("landlord", "Owner")}{opt("tenant", "Tenant")}</div>;
}
