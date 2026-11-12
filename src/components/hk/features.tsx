import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, CheckCircle2, Circle, FileText, Paperclip, Plus, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { remindersFor } from "@/lib/ledger";
import { eur } from "@/lib/proration";
import { isCurrent, today, type Chore, type DocKind } from "@/lib/model";
import { fmtDate } from "@/lib/seo";
import { Avatar, EmptyState, Panel, Tag } from "./kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

/* ---------------- House chat ---------------- */
export function HouseChat() {
  const { data, property, viewer, actions, pick, refresh, mode } = useScope();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const msgs = pick(data.messages);
  const landlordId = property?.ownerId;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  // Live mode: poll quietly so new messages appear without reloading.
  useEffect(() => {
    if (mode !== "live") return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [mode, refresh]);
  const send = async () => {
    if (!text.trim() || !property) return;
    setBusy(true);
    try { await actions.sendMessage(property.id, text); setText(""); } catch (e) { err(e); }
    setBusy(false);
  };
  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[420px] flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello to the house.</p>}
        {msgs.map((m) => {
          const mine = m.senderId === viewer?.userId;
          return (
            <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
              {!mine && <Avatar name={m.senderName} className="shrink-0" />}
              <div className={cn("max-w-[80%] min-w-0", mine && "text-right")}>
                <div className="mb-0.5 text-[11px] text-muted-foreground">
                  {mine ? "You" : m.senderName}{m.senderId === landlordId && !mine ? " · Landlord" : ""} · {new Date(m.at).toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className={cn("inline-block whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-left text-sm", mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the house…" maxLength={2000} aria-label="Message" />
        <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

/* ---------------- Chores & house rules ---------------- */
export function ChoresAndRules() {
  const { data, property, viewer, actions, pick, role } = useScope();
  const [open, setOpen] = useState(false);
  const [rule, setRule] = useState("");
  const tenants = pick(data.tenancies).filter((t) => isCurrent(t) && t.tenantId);
  const chores = pick(data.chores).sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "").localeCompare(b.due ?? ""));
  const rules = pick(data.rules);
  const on = today();
  const isOwner = role === "landlord";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Chore rota" action={<Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add</Button>}>
        {chores.length === 0 ? <p className="text-sm text-muted-foreground">No chores yet.</p> : (
          <ul className="divide-y">
            {chores.map((c) => {
              const late = !c.done && c.due && c.due < on;
              const mine = c.assigneeId === viewer?.userId;
              return (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <button aria-label={c.done ? "Mark not done" : "Mark done"} onClick={() => actions.toggleChore(c).then(() => !c.done && toast.success(c.repeat === "once" ? "Done!" : "Done — next one scheduled")).catch(err)} className="shrink-0">
                    {c.done ? <CheckCircle2 className="h-5 w-5 text-mauve" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-sm", c.done && "text-muted-foreground line-through")}>{c.title}</div>
                    <div className="text-xs text-muted-foreground">{mine ? "You" : c.assigneeName ?? "Anyone"} · {c.repeat === "once" ? "one-off" : c.repeat}{c.due ? ` · due ${fmtDate(c.due)}` : ""}</div>
                  </div>
                  {late && <Tag tone="warn">Overdue</Tag>}
                  <button aria-label="Delete chore" onClick={() => actions.deleteChore(c.id).catch(err)} className="shrink-0 text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="House rules">
        <p className="mb-3 text-xs text-muted-foreground">Agreed between the people living here. Not part of the legal lease.</p>
        <ul className="space-y-3">
          {rules.map((r) => {
            const agreed = viewer ? r.agreedBy.includes(viewer.userId) : false;
            const count = r.agreedBy.filter((u) => tenants.some((t) => t.tenantId === u)).length;
            return (
              <li key={r.id} className="rounded-md border p-3">
                <div className="text-sm">{r.body}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Proposed by {r.createdBy}</span>
                  <span>· {count}/{tenants.length} housemates agreed</span>
                  <span className="ml-auto flex gap-1">
                    {!isOwner && <Button size="sm" variant={agreed ? "secondary" : "outline"} onClick={() => actions.agreeRule(r.id, !agreed).catch(err)}>{agreed ? <><Check className="h-3.5 w-3.5" />Agreed</> : "Agree"}</Button>}
                    {isOwner && <Button size="sm" variant="ghost" onClick={() => actions.deleteRule(r.id).catch(err)} aria-label="Remove rule"><Trash2 className="h-4 w-4" /></Button>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <form className="mt-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!rule.trim() || !property) return; try { await actions.addRule(property.id, rule.trim()); setRule(""); toast.success("Rule proposed"); } catch (x) { err(x); } }}>
          <Input value={rule} onChange={(e) => setRule(e.target.value)} placeholder="Propose a house rule…" maxLength={300} />
          <Button type="submit" variant="outline" disabled={!rule.trim()}>Propose</Button>
        </form>
      </Panel>

      <ChoreDialog open={open} onOpenChange={setOpen} people={tenants.map((t) => ({ id: t.tenantId!, name: t.name }))} onSave={async (c) => { await actions.addChore({ ...c, propertyId: property!.id }); toast.success("Chore added"); }} />
    </div>
  );
}

function ChoreDialog({ open, onOpenChange, people, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; people: { id: string; name: string }[]; onSave: (c: { title: string; assigneeId: string | null; assigneeName: string | null; due: string | null; repeat: Chore["repeat"] }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("anyone");
  const [due, setDue] = useState(today());
  const [repeat, setRepeat] = useState<Chore["repeat"]>("weekly");
  const save = async () => {
    const p = people.find((x) => x.id === who);
    try { await onSave({ title: title.trim(), assigneeId: p?.id ?? null, assigneeName: p?.name ?? null, due: due || null, repeat }); setTitle(""); onOpenChange(false); } catch (e) { err(e); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display font-normal">New chore</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>What</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Take out recycling" maxLength={100} /></div>
          <div><Label>Who</Label>
            <Select value={who} onValueChange={setWho}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="anyone">Anyone</SelectItem>{people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First due</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
            <div><Label>Repeats</Label>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as Chore["repeat"])}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="once">One-off</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="fortnightly">Fortnightly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={!title.trim()}>Add chore</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Documents vault ---------------- */
const KINDS: DocKind[] = ["Lease", "Inspection", "Receipt", "Certificate", "Other"];
export function DocumentsVault() {
  const { data, property, viewer, actions, pick, role } = useScope();
  const [filter, setFilter] = useState<DocKind | "All">("All");
  const [open, setOpen] = useState(false);
  const docs = pick(data.documents).filter((d) => filter === "All" || d.kind === filter);
  const view = async (path: string | null) => {
    if (!path) return toast.info("Sample document — upload your own file to open it.");
    try { window.open(await actions.openDocument(path), "_blank", "noopener"); } catch (e) { err(e); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["All", ...KINDS] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full border px-3 py-1 text-xs", filter === k ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{k}</button>
        ))}
        <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}><Upload className="h-4 w-4" />Add document</Button>
      </div>
      {docs.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="No documents yet" text="Keep leases, inspection photos, certificates and receipts in one place." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-mauve"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <button onClick={() => view(d.path)} className="block max-w-full truncate text-left text-sm font-medium hover:underline">{d.title}</button>
                <div className="mt-0.5 text-xs text-muted-foreground">{d.uploadedByName} · {fmtDate(d.at)}</div>
                <div className="mt-2 flex items-center gap-2"><Tag>{d.kind}</Tag>{d.path && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}</div>
              </div>
              {(role === "landlord" || d.uploadedBy === viewer?.userId) && (
                <button aria-label="Delete document" onClick={() => actions.deleteDocument(d.id).then(() => toast.success("Removed")).catch(err)} className="shrink-0 text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}
      <DocDialog open={open} onOpenChange={setOpen} onSave={async (title, kind, file) => { await actions.addDocument({ propertyId: property!.id, title, kind, file }); toast.success("Document saved"); }} />
    </div>
  );
}

function DocDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (title: string, kind: DocKind, file: File | null) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DocKind>("Lease");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (file && file.size > 20 * 1024 * 1024) return toast.error("Files must be under 20 MB");
    setBusy(true);
    try { await onSave(title.trim(), kind, file); setTitle(""); setFile(null); onOpenChange(false); } catch (e) { err(e); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display font-normal">Add document</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>File (PDF or photo)</Label><Input type="file" accept="application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "")); }} /></div>
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
          <div><Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as DocKind)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Only people in this home can see it.</p>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy || !title.trim()}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Rent reminders ---------------- */
export function TenantReminders() {
  const { data, property, myTenancy } = useScope();
  if (!myTenancy || !property) return null;
  const items = remindersFor(data, myTenancy, property.rentDay, today());
  if (!items.length) return null;
  return (
    <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Bell className="h-4 w-4 text-terracotta" />Reminders</div>
      <ul className="space-y-1.5 text-sm">
        {items.map((r, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{r.label}{r.daysLeft !== null ? ` · ${r.daysLeft === 0 ? "due today" : `due in ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"}`}` : ""}</span>
            <span className="num shrink-0">{eur(r.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OwnerReminders() {
  const { data, property, pick, actions } = useScope();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const on = today();
  const rows = useMemo(() => (property ? pick(data.tenancies).filter((t) => isCurrent(t)).map((t) => ({ t, items: remindersFor(data, t, property.rentDay, on, 10) })).filter((r) => r.items.length) : []), [data, property?.id]);
  if (!property) return null;
  return (
    <Panel title="Rent reminders" className="mb-6">
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Everyone is up to date — nothing due in the next 10 days.</p> : (
        <ul className="divide-y">
          {rows.map(({ t, items }) => {
            const total = items.reduce((a, x) => a + x.amount, 0);
            const body = `Friendly reminder from ${property.name}: ${items.map((x) => `${x.label} ${eur(x.amount)}`).join(", ")}.`;
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={t.name} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{items.map((x) => x.label + (x.daysLeft !== null ? ` (in ${x.daysLeft}d)` : "")).join(" · ")}</div>
                </div>
                <span className="num text-sm">{eur(total)}</span>
                <Button size="sm" variant="outline" disabled={sent[t.id]} onClick={() => actions.sendReminder(t.id, body).then(() => { setSent((s) => ({ ...s, [t.id]: true })); toast.success(`Reminder sent to ${t.name}`); }).catch(err)}>
                  <Bell className="h-4 w-4" />{sent[t.id] ? "Sent" : "Remind"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
