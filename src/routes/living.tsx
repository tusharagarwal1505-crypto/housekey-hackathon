import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Activity, FileText, ListChecks, MessageCircle, MoreHorizontal, Bot, Home, KeyRound, Receipt, ScrollText, User, Users, Wallet } from "lucide-react";
import { useScope } from "@/lib/workspace";
import { AccountMenu, Gate, NotificationBell, RoleSwitch } from "@/components/hk/chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/living")({
  head: () => ({
    meta: [
      { title: "HouseKey Living" },
      { name: "description", content: "Your rent, bills, deposit and housemates — all in one calm place." },
      { property: "og:title", content: "HouseKey Living" },
      { property: "og:description", content: "The tenant side of HouseKey." },
    ],
  }),
  component: LivingLayout,
});

const nav = [
  { to: "/living", label: "Home", icon: Home, exact: true },
  { to: "/living/money", label: "My Money", icon: Wallet },
  { to: "/living/bills", label: "Bills", icon: Receipt },
  { to: "/living/chat", label: "Chat", icon: MessageCircle },
  { to: "/living/housemates", label: "Housemates", icon: Users },
  { to: "/living/house", label: "Chores & Rules", icon: ListChecks },
  { to: "/living/documents", label: "Documents", icon: FileText },
  { to: "/living/tenancy", label: "My Tenancy", icon: ScrollText },
  { to: "/living/activity", label: "Activity", icon: Activity },
  { to: "/living/assistant", label: "Assistant", icon: Bot },
  { to: "/living/profile", label: "Profile", icon: User },
] as const;
const mobile = ["/living", "/living/money", "/living/bills", "/living/chat"];

function LivingLayout() {
  return (
    <Gate need="tenant">
      <Shell />
    </Gate>
  );
}

function Shell() {
  const loc = useLocation();
  const { property } = useScope();
  const active = (to: string, exact?: boolean) => (exact ? loc.pathname === to || loc.pathname === to + "/" : loc.pathname.startsWith(to));
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/living" className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-terracotta" /><span className="hidden font-display text-lg sm:inline">HouseKey <em className="text-mauve">Living</em></span></Link>
          <div className="flex items-center gap-2"><RoleSwitch /><NotificationBell /><AccountMenu /></div>
        </div>
        <nav className="mx-auto hidden max-w-5xl gap-1 overflow-x-auto px-4 md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className={cn("shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground transition hover:text-foreground", active(n.to, "exact" in n) && "border-terracotta text-foreground")}>{n.label}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">
        <div className="eyebrow mb-1">{property?.name}</div>
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card md:hidden">
        {nav.filter((n) => mobile.includes(n.to)).map((n) => (
          <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground", active(n.to, "exact" in n) && "text-foreground")}>
            <n.icon className={cn("h-5 w-5", active(n.to, "exact" in n) && "text-terracotta")} />{n.label.replace("My ", "")}
          </Link>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"><MoreHorizontal className="h-5 w-5" />More</DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            {nav.filter((n) => !mobile.includes(n.to)).map((n) => (
              <DropdownMenuItem key={n.to} asChild><Link to={n.to}><n.icon className="h-4 w-4" />{n.label}</Link></DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}
