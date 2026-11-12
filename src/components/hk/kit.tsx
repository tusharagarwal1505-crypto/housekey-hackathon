import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { eur } from "@/lib/proration";
import type { TxStatus } from "@/lib/model";
import { Button } from "@/components/ui/button";
import { createPayPalOrder, capturePayPalOrder } from "@/lib/paypal.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children, title, action }: { className?: string; children: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border bg-card p-5", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Compact metric for dense landlord dashboards. */
export function Metric({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="bg-card p-4">
      <div className="eyebrow">{label}</div>
      <div className={cn("mt-2 font-display text-2xl num", accent && "text-terracotta")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const statusStyles: Record<TxStatus, string> = {
  Paid: "bg-success text-success-foreground",
  Pending: "bg-warning text-warning-foreground",
  Failed: "bg-destructive/10 text-destructive",
  Refunded: "bg-muted text-muted-foreground",
};
export function StatusBadge({ status }: { status: TxStatus }) {
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", statusStyles[status])}>{status}</span>;
}
export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warn" | "ok" | "accent" }) {
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", tone === "muted" && "bg-muted text-muted-foreground", tone === "warn" && "bg-warning text-warning-foreground", tone === "ok" && "bg-success text-success-foreground", tone === "accent" && "bg-secondary text-secondary-foreground")}>{children}</span>;
}

export function Money({ value, signed, className }: { value: number; signed?: boolean; className?: string }) {
  return (
    <span className={cn("num", signed && value > 0 && "text-success-foreground", signed && value < 0 && "text-destructive", className)}>
      {signed && value > 0 ? "+" : ""}
      {eur(value)}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary font-display text-sm text-secondary-foreground", className)}>{name.slice(0, 1)}</span>;
}

export function LockedAmount({ amount, label = "Deposit set by landlord" }: { amount: number; label?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-mauve/30 bg-secondary/60 px-4 py-3">
      <div className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-mauve" /> {label}</div>
      <div className="font-display text-xl num">{eur(amount)}</div>
    </div>
  );
}

/** Simulated PayPal checkout — swap for the PayPal Orders API once credentials exist. */
// Landlord's sandbox REST app (public client ID; the secret stays on the server).
const PAYPAL_CLIENT_ID = (import.meta.env['VITE_PAYPAL_CLIENT_ID'] as string | undefined) || "ARDznlxqOQs-cEXipdCPdHLc1x5oXwt7qys60flYpYbZ4i8KsvoQ7JA3-i7V2DeLMkAKs5T2WIYcVwq5";
let paypalScript: Promise<any> | null = null;
function loadPayPal(): Promise<any> {
  const w = window as any;
  if (w.paypal) return Promise.resolve(w.paypal);
  paypalScript ??= new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=capture&disable-funding=credit,paylater`;
    el.onload = () => resolve(w.paypal);
    el.onerror = () => { paypalScript = null; reject(new Error("PayPal could not load")); };
    document.head.appendChild(el);
  });
  return paypalScript;
}

/** PayPal sandbox checkout: real PayPal buttons in test mode, so no real money moves. */
export function PayPalDialog({ open, onOpenChange, amount, payee, description, onResult, demo = true }: { open: boolean; onOpenChange: (o: boolean) => void; amount: number; payee: string; description: string; onResult: (status: "Paid" | "Failed", ref?: string) => void | Promise<void>; demo?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const box = useRef<HTMLDivElement>(null);
  const done = async (status: "Paid" | "Failed", ref?: string) => {
    setBusy(true);
    await onResult(status, ref);
    setBusy(false);
    onOpenChange(false);
  };
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let buttons: any;
    setState("loading");
    const t = setTimeout(() => {
      loadPayPal().then((paypal) => {
        if (cancelled || !box.current) return;
        box.current.innerHTML = "";
        buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 44 },
          createOrder: async () => (await createPayPalOrder({ data: { amount: Math.round(amount * 100) / 100, description: `${description} · ${payee}`.slice(0, 120) } })).id,
          onApprove: async (d: { orderID: string }) => {
            try {
              const r = await capturePayPalOrder({ data: { orderId: d.orderID } });
              await done(r.status === "COMPLETED" ? "Paid" : "Failed", r.captureId);
            } catch { await done("Failed"); }
          },
          onError: async () => { await done("Failed"); },
        });
        buttons.render(box.current).then(() => !cancelled && setState("ready")).catch(() => !cancelled && setState("error"));
      }).catch(() => !cancelled && setState("error"));
    }, 0);
    return () => { cancelled = true; clearTimeout(t); try { buttons?.close?.(); } catch { /* ignore */ } };
  }, [open, amount, payee, description]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-normal"><span className="rounded bg-paypal px-2 py-0.5 text-sm font-bold italic text-paypal-foreground">PayPal</span> Sandbox checkout</DialogTitle>
          <DialogDescription>PayPal test mode — sign in with a PayPal sandbox account or test card. No real money moves.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted p-4">
            <div className="text-xs text-muted-foreground">Paying {payee}</div>
            <div className="font-display text-3xl num">{eur(amount)}</div>
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mauve" />The amount comes from the HouseKey ledger and can't be edited here.</div>
          {busy && <div className="flex items-center justify-center gap-2 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Recording payment…</div>}
          <div ref={box} className={cn("min-h-[50px]", busy && "hidden")} />
          {state === "loading" && !busy && <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-mauve" /></div>}
          {state === "error" && <p className="text-xs text-destructive">PayPal didn't load (check your connection or ad blocker). Try again in a moment.</p>}
          {demo && <div className="flex gap-3 border-t pt-3 text-xs">
            <button className="text-muted-foreground underline" disabled={busy} onClick={() => done("Paid")}>Quick test payment</button>
            <button className="text-muted-foreground underline" disabled={busy} onClick={() => done("Failed")}>Simulate a failure</button>
          </div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed p-10 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-mauve">{icon}</div>
      <div className="mt-3 font-display text-lg">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading() {
  return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-mauve" /></div>;
}

export function PageHeaderLite({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h1 className="font-display text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
