import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound } from "lucide-react";
import { demoPersonas } from "@/lib/demo";
import { useWorkspace } from "@/lib/workspace";
import { Avatar } from "@/components/hk/kit";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo · HouseKey" },
      { name: "description", content: "Explore Maple House, Dublin as the landlord or as a tenant." },
      { property: "og:title", content: "Demo · HouseKey" },
      { property: "og:description", content: "Switch between landlord and tenant views of the same shared ledger." },
    ],
  }),
  component: Demo,
});

function Demo() {
  const { startDemo } = useWorkspace();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="flex items-center gap-2.5"><KeyRound className="h-5 w-5 text-terracotta" /><span className="font-display text-xl">HouseKey</span></Link>
      <div className="eyebrow mt-14">Demo · Maple House, Rathmines</div>
      <h1 className="mt-3 font-display text-4xl">Who would you like to be?</h1>
      <p className="mt-3 text-muted-foreground">Everyone sees the same ledger, from their own side. You can switch any time from the account menu.</p>
      <div className="mt-10 divide-y rounded-lg border bg-card">
        {demoPersonas.map((p) => (
          <button key={p.userId} onClick={() => { startDemo(p.userId); navigate({ to: p.roles[0] === "landlord" ? "/owners" : "/living" }); }} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-muted/60">
            <Avatar name={p.name} className="h-11 w-11 text-lg" />
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">{p.blurb}</div>
            </div>
            <span className="eyebrow">{p.roles[0] === "landlord" ? "Owners" : "Living"}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Demo changes are saved in this browser only. Payments are simulated.</p>
    </div>
  );
}
