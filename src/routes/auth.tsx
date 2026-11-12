import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, KeyRound, Loader2, Sofa } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · HouseKey" },
      { name: "description", content: "Sign in to HouseKey for Owners or HouseKey Living." },
      { property: "og:title", content: "Sign in · HouseKey" },
      { property: "og:description", content: "Sign in or create your HouseKey account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode, exitDemo } = useWorkspace();
  const [tab, setTab] = useState<"in" | "up" | "forgot">("in");
  const [role, setRole] = useState<"landlord" | "tenant">("tenant");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (mode === "live") navigate({ to: "/start" });
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error("Enter a valid email.");
    setBusy(true);
    exitDemo();
    try {
      if (tab === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent(true);
      } else if (tab === "up") {
        if (!form.name.trim() || form.password.length < 8) throw new Error("Add your name and a password of at least 8 characters.");
        localStorage.setItem("housekey-pending-role", role);
        const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { emailRedirectTo: `${window.location.origin}/start`, data: { full_name: form.name } } });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    exitDemo();
    if (tab === "up") localStorage.setItem("housekey-pending-role", role);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2.5"><KeyRound className="h-5 w-5 text-terracotta" /><span className="font-display text-xl">HouseKey</span></Link>
        <div>
          <p className="font-display text-4xl leading-tight">“Shared living. Fair finances. Zero awkward conversations.”</p>
          <p className="mt-6 text-sm text-primary-foreground/70">Owners and tenants see the same ledger — each from their own side.</p>
        </div>
        <div className="text-xs text-primary-foreground/50">Dublin · 2026</div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl">{tab === "up" ? "Create your account" : tab === "forgot" ? "Reset your password" : "Welcome back"}</h1>
          {sent ? (
            <p className="mt-6 rounded-md bg-secondary p-4 text-sm">Check <b>{form.email}</b> for a link to continue.</p>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              {tab === "up" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {([["tenant", "I rent a room", Sofa], ["landlord", "I own or manage", Building2]] as const).map(([r, label, Icon]) => (
                      <button type="button" key={r} onClick={() => setRole(r)} className={cn("rounded-md border p-3 text-left text-sm transition", role === r ? "border-primary bg-secondary" : "hover:border-mauve")}>
                        <Icon className="mb-2 h-4 w-4 text-mauve" />{label}
                      </button>
                    ))}
                  </div>
                  <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                </>
              )}
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              {tab !== "forgot" && <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>}
              <Button className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{tab === "up" ? "Create account" : tab === "forgot" ? "Send reset link" : "Sign in"}</Button>
              {tab !== "forgot" && <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>}
            </form>
          )}
          <div className="mt-6 flex justify-between text-sm text-muted-foreground">
            {tab === "in" ? <button onClick={() => setTab("up")} className="underline">New here? Sign up</button> : <button onClick={() => { setTab("in"); setSent(false); }} className="underline">Back to sign in</button>}
            {tab === "in" && <button onClick={() => setTab("forgot")} className="underline">Forgot password?</button>}
          </div>
          <p className="mt-10 text-sm text-muted-foreground">Just looking? <Link to="/demo" className="text-foreground underline">Try the demo</Link></p>
        </div>
      </div>
    </div>
  );
}
