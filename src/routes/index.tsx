import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, KeyRound, Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HouseKey — Property and shared-living finances" },
      { name: "description", content: "HouseKey for Owners and HouseKey Living share one ledger for rent, deposits and bills — split fairly by the day." },
      { property: "og:title", content: "HouseKey — Property and shared-living finances" },
      { property: "og:description", content: "One shared ledger for landlords and housemates: verified deposits, day-accurate bills, fair move-outs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <KeyRound className="h-5 w-5 text-terracotta" />
          <span className="font-display text-xl">HouseKey</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/demo">Try the demo</Link></Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 lg:pt-20">
        <div className="eyebrow">Property & shared-living finance</div>
        <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[1.08] sm:text-7xl">
          Nobody should lose money <em className="text-mauve">because someone moves house.</em>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted-foreground">One ledger for landlords and housemates — deposits set once and locked, bills split by the day, move-outs settled to the cent.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" asChild><Link to="/demo">Explore Maple House, Dublin <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/auth">Create an account</Link></Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-2 mx-6 lg:mx-auto">
        <div className="bg-primary p-8 text-primary-foreground sm:p-10">
          <Building2 className="h-6 w-6 text-terracotta" />
          <div className="eyebrow mt-6 text-primary-foreground/60">HouseKey for Owners</div>
          <h2 className="mt-2 font-display text-3xl">Run every room like a portfolio.</h2>
          <ul className="mt-6 space-y-2 text-sm text-primary-foreground/80">
            <li>Occupancy, income and arrears at a glance</li>
            <li>Applications, tenancies and deposit handovers</li>
            <li>Maintenance, expenses and reports</li>
          </ul>
        </div>
        <div className="bg-secondary p-8 sm:p-10">
          <Sofa className="h-6 w-6 text-mauve" />
          <div className="eyebrow mt-6">HouseKey Living</div>
          <h2 className="mt-2 font-display text-3xl">Your money, your home, no awkward chats.</h2>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>See exactly what you owe — and why</li>
            <li>Pay your share, track your deposit</li>
            <li>A fair settlement when you leave</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            ["€0.75", "per person per day", "A €183 bill over 61 days, split between the four people actually living there each day."],
            ["€500", "locked deposit", "Set by the landlord when the room is created. Replacement tenants pay exactly that."],
            ["€514.75", "Max's settlement", "Deposit back, minus his days of electricity and internet, plus a rent credit."],
          ].map(([n, l, t]) => (
            <div key={l} className="border-t pt-6">
              <div className="font-display text-4xl num">{n}</div>
              <div className="eyebrow mt-2">{l}</div>
              <p className="mt-3 text-sm text-muted-foreground">{t}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl border-t px-6 py-8 text-xs text-muted-foreground">
        HouseKey records payments. It doesn't transfer leases, move money between bank accounts by itself, or replace a landlord's formal tenancy approval.
      </footer>
    </div>
  );
}
