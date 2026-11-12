import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Bot, Check, Loader2, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { extractBill, askAssistant, type BillExtraction } from "@/lib/ai.functions";
import { billSplit, sharePaid } from "@/lib/ledger";
import { daysBetween, eur } from "@/lib/proration";
import type { Bill, BillType, Data } from "@/lib/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const types: BillType[] = ["Electricity", "Gas", "Internet", "Water", "Other"];

/** Upload → AI extraction → mandatory human review → saved bill. Used by both apps. */
export function BillUploadDialog({ open, onOpenChange, propertyId, onSave, manual }: { open: boolean; onOpenChange: (o: boolean) => void; propertyId: string; manual?: boolean; onSave: (b: Omit<Bill, "id" | "createdAt">) => Promise<void> }) {
  const [mode, setMode] = useState<"choose" | "scanning" | "review">(manual ? "review" : "choose");
  const [ai, setAi] = useState<BillExtraction | null>(null);
  const [draft, setDraft] = useState({ type: "Electricity" as BillType, provider: "", total: "", start: "", end: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const extract = useServerFn(extractBill);

  useEffect(() => {
    if (open) {
      setMode(manual ? "review" : "choose");
      setAi(null);
      setDraft({ type: "Electricity", provider: "", total: "", start: "", end: "", reference: "" });
    }
  }, [open, manual]);

  const onFile = async (f: File) => {
    if (!/pdf|png|jpe?g/i.test(f.type)) return toast.error("Upload a PDF, JPG or PNG.");
    if (f.size > 5_000_000) return toast.error("File is over 5 MB.");
    setMode("scanning");
    const base64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] ?? "");
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    const out = await extract({ data: { base64, mediaType: f.type, fileName: f.name } });
    if (!out.ok) {
      toast.error(out.error);
      setAi({ provider: null, billType: null, total: null, currency: null, startDate: null, endDate: null, reference: null, uncertain: ["provider", "total", "startDate", "endDate"], notes: "Extraction failed — please enter the details yourself." });
      return setMode("review");
    }
    const d = out.data;
    setAi(d);
    setDraft({ type: d.billType ?? "Other", provider: d.provider ?? "", total: d.total != null ? String(d.total) : "", start: d.startDate ?? "", end: d.endDate ?? "", reference: d.reference ?? "" });
    setMode("review");
  };
  const flag = (k: string) => !!ai?.uncertain?.some((u) => u.toLowerCase().includes(k.toLowerCase()));

  const save = async () => {
    const total = Number(draft.total);
    if (!draft.provider.trim() || !(total > 0) || !draft.start || !draft.end) return toast.error("Provider, amount and billing period are required.");
    if (draft.end < draft.start) return toast.error("The billing period ends before it starts.");
    setSaving(true);
    try {
      await onSave({ propertyId, type: draft.type, provider: draft.provider.trim(), total, start: draft.start, end: draft.end, reference: draft.reference || null, source: ai ? "AI scan" : "Manual" });
      toast.success("Bill added and split by occupancy");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-normal">{mode === "review" && ai ? "Review what AI found" : mode === "review" ? "Add a bill" : "Upload a bill"}</DialogTitle>
          <DialogDescription>{mode === "review" && ai ? "Nothing is saved until you confirm. Flagged fields need a second look." : "PDF, JPG or PNG up to 5 MB."}</DialogDescription>
        </DialogHeader>
        {mode === "choose" && (
          <>
            <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }} className="flex flex-col items-center rounded-lg border border-dashed border-mauve/50 bg-muted/50 p-10 text-center transition hover:border-terracotta">
              <Upload className="h-7 w-7 text-mauve" />
              <div className="mt-3 font-medium">Drop a bill here or browse</div>
              <div className="mt-1 text-xs text-muted-foreground">AI reads the provider, amount, dates and reference</div>
            </button>
            <Button variant="ghost" onClick={() => setMode("review")}>Enter details manually</Button>
          </>
        )}
        {mode === "scanning" && (
          <div className="flex flex-col items-center py-10 text-center"><Loader2 className="h-7 w-7 animate-spin text-mauve" /><div className="mt-3 font-medium">Reading your bill…</div></div>
        )}
        {mode === "review" && (
          <div className="space-y-3">
            {ai && (
              <div className={cn("flex gap-2 rounded-md p-3 text-sm", ai.uncertain?.length ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground")}>
                {ai.uncertain?.length ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
                <div>{ai.uncertain?.length ? `Please check: ${ai.uncertain.join(", ")}.` : "All fields read confidently."} {ai.notes}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" flag={flag("type")}><Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as BillType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Provider" flag={flag("provider")}><Input value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} placeholder="Electric Ireland" /></Field>
              <Field label={`Total (${ai?.currency ?? "EUR"})`} flag={flag("total")}><Input type="number" step="0.01" value={draft.total} onChange={(e) => setDraft({ ...draft, total: e.target.value })} /></Field>
              <Field label="Reference" flag={flag("reference")}><Input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} /></Field>
              <Field label="Period start" flag={flag("start")}><Input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
              <Field label="Period end" flag={flag("end")}><Input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
            </div>
            {ai?.currency && ai.currency !== "EUR" && <p className="text-xs text-warning-foreground">This bill is in {ai.currency}. Convert to euros before confirming.</p>}
            {draft.start && draft.end >= draft.start && Number(draft.total) > 0 && <p className="text-xs text-muted-foreground">{daysBetween(draft.start, draft.end)} days · {eur(Number(draft.total) / daysBetween(draft.start, draft.end))} per day</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{ai ? "Confirm & split" : "Add & split"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, flag, children }: { label: string; flag?: boolean; children: ReactNode }) {
  return (
    <div className={cn("space-y-1 rounded-md", flag && "ring-2 ring-warning-foreground/40 ring-offset-2 ring-offset-background")}>
      <Label className="flex items-center gap-1 text-xs">{label}{flag && <AlertTriangle className="h-3 w-3 text-warning-foreground" />}</Label>
      {children}
    </div>
  );
}

/** Transparent per-day breakdown of one bill. */
export function BillBreakdown({ data, bill, highlight }: { data: Data; bill: Bill; highlight?: string | null }) {
  const split = billSplit(data, bill);
  const name = (id: string) => data.tenancies.find((t) => t.id === id)?.name ?? "—";
  const counts = split.daily.map((d) => d.occupants.length);
  return (
    <div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
        {[["Total", eur(bill.total)], ["Days", String(split.days)], ["Per day", eur(split.dailyCost)], ["People / day", `${Math.min(...counts)}–${Math.max(...counts)}`]].map(([k, v]) => (
          <div key={k} className="bg-card p-3"><div className="eyebrow">{k}</div><div className="mt-1 font-display text-lg num">{v}</div></div>
        ))}
      </div>
      <div className="mt-4 flex h-12 items-end gap-px">
        {split.daily.map((d) => <div key={d.day} title={`${d.day}: ${d.occupants.map(name).join(", ")} · ${eur(d.perPerson)} each`} className="flex-1 rounded-t-[2px] bg-mauve/60 hover:bg-terracotta" style={{ height: `${(d.occupants.length / Math.max(...counts, 1)) * 100}%` }} />)}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{bill.start}</span><span>{bill.end}</span></div>
      <table className="mt-4 w-full text-sm">
        <thead><tr className="text-left"><th className="eyebrow pb-2 font-medium">Resident</th><th className="eyebrow pb-2 font-medium">Days</th><th className="eyebrow hidden pb-2 font-medium sm:table-cell">Calculation</th><th className="eyebrow pb-2 text-right font-medium">Share</th><th className="eyebrow pb-2 text-right font-medium">Status</th></tr></thead>
        <tbody className="divide-y">
          {split.lines.map((l) => {
            const t = data.tenancies.find((x) => x.id === l.tenantId)!;
            const paid = sharePaid(data, bill, t);
            return (
              <tr key={l.tenantId} className={cn(highlight === l.tenantId && "bg-accent/50")}>
                <td className="py-2.5 font-medium">{t.name}</td>
                <td className="py-2.5 num">{l.days}</td>
                <td className="hidden py-2.5 text-xs text-muted-foreground num sm:table-cell">{l.days} days × {eur(l.exact / l.days)}</td>
                <td className="py-2.5 text-right num">{eur(l.amount)}</td>
                <td className="py-2.5 text-right"><span className={cn("rounded px-1.5 py-0.5 text-xs", paid ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground")}>{paid ? "Paid" : "Due"}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">{eur(bill.total)} ÷ {split.days} days = {eur(split.dailyCost)} a day, shared between whoever lived there that day. Nobody pays for days they weren't living there.</p>
    </div>
  );
}

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };
export function AssistantChat({ ledger, who, suggestions, intro }: { ledger: string; who: string; suggestions: string[]; intro: string }) {
  const ask = useServerFn(askAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);
  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    const out = await ask({ data: { me: who, ledger, messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) } });
    setBusy(false);
    setMsgs((m) => [...m, out.ok ? { role: "assistant", content: out.data } : { role: "assistant", content: out.error, error: true }]);
  };
  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[420px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-card p-4 sm:p-6">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-mauve"><Bot className="h-5 w-5" /></div>
            <p className="mt-3 max-w-sm font-display text-lg">{intro}</p>
            <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-md border px-3 py-1.5 text-sm transition hover:border-terracotta hover:text-foreground">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
            <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-primary text-primary-foreground" : m.error ? "bg-destructive/10 text-destructive" : "bg-muted")}>{m.content.replace(/\*\*/g, "")}</div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking the ledger…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} rows={1} placeholder="Ask about rent, bills, deposits…" className="min-h-11 resize-none" />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || !input.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">Answers use only records you're allowed to see. The assistant can't change anything.</p>
    </div>
  );
}
