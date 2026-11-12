import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, ListChecks, MessageCircle, BarChart3, Bot, Building2, ClipboardList, DoorOpen, Gauge, KeyRound, Lock, Menu, Receipt, Settings, Users, Wallet, Wrench, X } from "lucide-react";
import { useScope } from "@/lib/workspace";
import { AccountMenu, Gate, NotificationBell, RoleSwitch } from "@/components/hk/chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owners")({
  head: () => ({
    meta: [
      { title: "HouseKey for Owners" },
      { name: "description", content: "Property performance, tenancies, deposits and rent collection for landlords." },
      { property: "og:title", content: "HouseKey for Owners" },
      { property: "og:description", content: "The landlord side of HouseKey." },
    ],
  }),
  component: OwnersLayout,
});

const nav = [
  { to: "/owners", label: "Overview", icon: Gauge, exact: true },
  { to: "/owners/properties", label: "Properties", icon: Building2 },
  { to: "/owners/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/owners/tenants", label: "Tenants", icon: Users },
  { to: "/owners/applications", label: "Applications", icon: ClipboardList },
  { to: "/owners/deposits", label: "Deposits", icon: Lock },
  { to: "/owners/payments", label: "Rent & Payments", icon: Wallet },
  { to: "/owners/bills", label: "Utility Bills", icon: Receipt },
  { to: "/owners/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/owners/messages", label: "Messages", icon: MessageCircle },
  { to: "/owners/house", label: "House Rules", icon: ListChecks },
  { to: "/owners/documents", label: "Documents", icon: FileText },
  { to: "/owners/reports", label: "Reports", icon: BarChart3 },
  { to: "/owners/assistant", label: "AI Assistant", icon: Bot },
  { to: "/owners/settings", label: "Settings", icon: Settings },
] as const;

const mobile = ["/owners", "/owners/payments", "/owners/deposits", "/owners/bills"];

function OwnersLayout() {
  return (
    <Gate need="landlord">
      <Shell />
    </Gate>
  );
}

function Shell() {
  const loc = useLocation();
  const { property, data, mode } = useScope();
  const [open, setOpen] = useState(false);
  const pendingApps = data.applications.filter((a) => a.propertyId === property?.id && a.status === "pending").length;
  const active = (to: string, exact?: boolean) => (exact ? loc.pathname === to || loc.pathname === to + "/" : loc.pathname.startsWith(to));

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/owners" className="flex items-center gap-2.5 px-3 py-5">
        <KeyRound className="h-5 w-5 text-terracotta" />
        <div><div className="font-display text-lg leading-none">HouseKey</div><div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">for Owners</div></div>
      </Link>
      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", active(n.to, "exact" in n) && "bg-sidebar-accent text-sidebar-accent-foreground")}>
            <n.icon className="h-4 w-4" /> <span className="flex-1">{n.label}</span>
            {n.to === "/owners/applications" && pendingApps > 0 && <span className="rounded bg-terracotta px-1.5 text-[10px] text-terracotta-foreground">{pendingApps}</span>}
          </Link>
        ))}
      </nav>
      {mode === "demo" && <div className="m-3 rounded-md border border-sidebar-border p-3 text-xs text-sidebar-foreground/70">Demo mode · use the Owner / Tenant switch at the top to see the tenant side.</div>}
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-sidebar text-sidebar-foreground lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-primary/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            <div className="min-w-0 truncate text-sm"><span className="hidden text-muted-foreground sm:inline">Property · </span><span className="font-medium">{property?.name}</span></div>
          </div>
          <div className="flex items-center gap-2"><RoleSwitch /><NotificationBell /><AccountMenu /></div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-8 lg:py-8"><Outlet /></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card lg:hidden">
        {nav.filter((n) => mobile.includes(n.to)).map((n) => (
          <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground", active(n.to, "exact" in n) && "text-foreground")}>
            <n.icon className={cn("h-5 w-5", active(n.to, "exact" in n) && "text-terracotta")} />{n.label.replace("Rent & ", "").replace("Utility ", "")}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"><Menu className="h-5 w-5" />More</button>
      </nav>
    </div>
  );
}
