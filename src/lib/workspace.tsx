import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { demoPersonas, demoSeed } from "./demo";
import { draftSettlement, settlementTotal } from "./ledger";
import type { Application, Bill, BillType, Chore, Data, DocKind, Payment, Role, SettlementItem, TxStatus, Viewer } from "./model";

const uid = () => Math.random().toString(36).slice(2, 10);
const ref = () => "PAYID-" + Math.random().toString(36).slice(2, 12).toUpperCase();
const now = () => new Date().toISOString();
const num = (v: unknown) => Number(v ?? 0);

type Mode = "demo" | "live" | "none";
export type NewPayment = { propertyId: string; category: Payment["category"]; description: string; amount: number; payeeName: string; billId?: string | null; status: TxStatus; payerName?: string; payerId?: string | null };

export type Actions = {
  addProperty: (p: { name: string; address: string; rentDay: number; rooms: { name: string; rent: number; deposit: number }[] }) => Promise<string>;
  updateProperty: (id: string, patch: { name?: string; address?: string; photoUrl?: string | null }) => Promise<void>;
  addRoom: (r: { propertyId: string; name: string; rent: number; deposit: number }) => Promise<void>;
  updateRoom: (id: string, patch: { name?: string; rent?: number; deposit?: number; available?: boolean; weight?: number }) => Promise<void>;
  invite: (propertyId: string, roomId: string | null, email: string) => Promise<void>;
  decideApplication: (a: Application, approve: boolean, roomId?: string, start?: string, end?: string | null) => Promise<void>;
  applyWithCode: (code: string, name: string, message: string, moveIn: string | null) => Promise<void>;
  addBill: (b: Omit<Bill, "id" | "createdAt">) => Promise<void>;
  pay: (p: NewPayment) => Promise<Payment>;
  setPaymentStatus: (id: string, status: TxStatus) => Promise<void>;
  requestMoveout: (tenancyId: string, date: string) => Promise<void>;
  decideMoveout: (tenancyId: string, approve: boolean) => Promise<void>;
  saveSettlement: (id: string, items: SettlementItem[], status: "draft" | "approved" | "paid") => Promise<void>;
  payDeposit: (depositId: string) => Promise<Payment>;
  returnDeposit: (depositId: string) => Promise<void>;
  confirmDeposit: (depositId: string) => Promise<void>;
  addMaintenance: (m: { propertyId: string; roomId: string | null; title: string; details: string | null }) => Promise<void>;
  updateMaintenance: (id: string, patch: { status?: "open" | "in_progress" | "done"; cost?: number | null }) => Promise<void>;
  addExpense: (e: { propertyId: string; category: string; description: string; amount: number; date: string }) => Promise<void>;
  raiseDispute: (billId: string, propertyId: string, reason: string) => Promise<void>;
  readNotifications: () => Promise<void>;
  sendMessage: (propertyId: string, body: string) => Promise<void>;
  addChore: (c: { propertyId: string; title: string; assigneeId: string | null; assigneeName: string | null; due: string | null; repeat: Chore["repeat"] }) => Promise<void>;
  toggleChore: (c: Chore) => Promise<void>;
  deleteChore: (id: string) => Promise<void>;
  addRule: (propertyId: string, body: string) => Promise<void>;
  agreeRule: (id: string, agree: boolean) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  addDocument: (d: { propertyId: string; title: string; kind: DocKind; file: File | null }) => Promise<void>;
  openDocument: (path: string) => Promise<string>;
  deleteDocument: (id: string) => Promise<void>;
  sendReminder: (tenancyId: string, body: string) => Promise<void>;
};

type Ctx = {
  mode: Mode;
  loading: boolean;
  viewer: Viewer | null;
  data: Data;
  role: Role;
  setRole: (r: Role) => void;
  propertyId: string | null;
  setPropertyId: (id: string) => void;
  actions: Actions;
  startDemo: (userId: string) => void;
  exitDemo: () => void;
  resetDemo: () => void;
  refresh: () => void;
};

const empty: Data = { properties: [], rooms: [], tenancies: [], bills: [], payments: [], deposits: [], settlements: [], applications: [], invitations: [], maintenance: [], expenses: [], disputes: [], audit: [], notifications: [], messages: [], chores: [], rules: [], documents: [] };
const WsCtx = createContext<Ctx | null>(null);
const DEMO_KEY = "housekey-demo-v4";
const DEMO_USER = "housekey-demo-user";

// ---------- live loading ----------
async function loadLive(userId: string): Promise<{ data: Data; viewer: Viewer }> {
  const q = async (table: string) => {
    const { data, error } = await (supabase.from(table as never) as any).select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as any[];
  };
  const [props, rooms, ten, bills, pays, deps, sets, apps, invs, mnt, exps, disp, aud, notes, roles, prof, user] = await Promise.all([
    q("properties"), q("rooms"), q("tenancies"), q("bills"), q("payments"), q("deposits"), q("settlements"), q("applications"), q("invitations"),
    q("maintenance_requests"), q("expenses"), q("bill_disputes"), q("audit_logs"), q("notifications"),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const [msgs, chores, rules, docs] = await Promise.all([q("messages"), q("chores"), q("house_rules"), q("documents")]);
  const data: Data = {
    properties: props.map((p) => ({ id: p.id, ownerId: p.owner_id, name: p.name, address: p.address, photoUrl: p.photo_url, inviteCode: p.invite_code, rentDay: p.rent_day })),
    rooms: rooms.map((r) => ({ id: r.id, propertyId: r.property_id, name: r.name, rent: num(r.rent), deposit: num(r.deposit), weight: num(r.weight), available: r.available })),
    tenancies: ten.map((t) => ({ id: t.id, propertyId: t.property_id, roomId: t.room_id, tenantId: t.tenant_id, name: t.tenant_name, email: t.tenant_email, start: t.start_date, end: t.end_date, proposedEnd: t.proposed_end_date, status: t.status })),
    bills: bills.map((b) => ({ id: b.id, propertyId: b.property_id, type: b.bill_type as BillType, provider: b.provider, total: num(b.total), start: b.start_date, end: b.end_date, reference: b.reference, source: b.source, createdAt: b.created_at })),
    payments: pays.map((p) => ({ id: p.id, propertyId: p.property_id, payerId: p.payer_id, payerName: p.payer_name, payeeName: p.payee_name, category: p.category, description: p.description, amount: num(p.amount), status: p.status, method: p.method, reference: p.reference, billId: p.bill_id, date: p.created_at })),
    deposits: deps.map((x) => ({ id: x.id, propertyId: x.property_id, roomId: x.room_id, tenancyId: x.tenancy_id, amount: num(x.amount), status: x.status })),
    settlements: sets.map((s) => ({ id: s.id, propertyId: s.property_id, tenancyId: s.tenancy_id, tenantId: s.tenant_id, items: s.items ?? [], total: num(s.total), status: s.status })),
    applications: apps.map((a) => ({ id: a.id, propertyId: a.property_id, roomId: a.room_id, applicantId: a.applicant_id, name: a.applicant_name, email: a.applicant_email, message: a.message, moveIn: a.move_in, status: a.status, createdAt: a.created_at })),
    invitations: invs.map((i) => ({ id: i.id, propertyId: i.property_id, roomId: i.room_id, email: i.email, status: i.status })),
    maintenance: mnt.map((m) => ({ id: m.id, propertyId: m.property_id, roomId: m.room_id, title: m.title, details: m.details, cost: m.cost == null ? null : num(m.cost), status: m.status, createdAt: m.created_at })),
    expenses: exps.map((e) => ({ id: e.id, propertyId: e.property_id, category: e.category, description: e.description, amount: num(e.amount), date: e.spent_on })),
    disputes: disp.map((x) => ({ id: x.id, billId: x.bill_id, propertyId: x.property_id, raisedBy: x.raised_by, reason: x.reason, status: x.status, createdAt: x.created_at })),
    audit: aud.map((a) => ({ id: a.id, propertyId: a.property_id, actor: a.actor_id === userId ? "You" : "Household member", action: a.action, at: a.created_at })).reverse(),
    notifications: notes.map((n) => ({ id: n.id, body: n.body, read: n.read, at: n.created_at })).reverse(),
    messages: msgs.map((m) => ({ id: m.id, propertyId: m.property_id, senderId: m.sender_id, senderName: m.sender_name, body: m.body, at: m.created_at })),
    chores: chores.map((c) => ({ id: c.id, propertyId: c.property_id, title: c.title, assigneeId: c.assignee_id, assigneeName: c.assignee_name, due: c.due_date, repeat: c.repeat, done: c.done })),
    rules: rules.map((r) => ({ id: r.id, propertyId: r.property_id, body: r.body, createdBy: r.created_by_name, agreedBy: r.agreed_by ?? [], at: r.created_at })),
    documents: docs.map((d) => ({ id: d.id, propertyId: d.property_id, title: d.title, kind: d.kind, path: d.storage_path, uploadedBy: d.uploaded_by, uploadedByName: d.uploaded_by_name, at: d.created_at })).reverse(),
  };
  const viewer: Viewer = {
    userId,
    name: (prof.data as any)?.full_name || user.data.user?.email?.split("@")[0] || "You",
    email: user.data.user?.email ?? "",
    roles: ((roles.data ?? []) as { role: string }[]).map((r) => r.role).filter((r): r is Role => r === "landlord" || r === "tenant"),
  };
  return { data, viewer };
}

const check = ({ error }: { error: unknown }) => {
  if (error) throw new Error((error as { message?: string }).message ?? "Something went wrong");
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [demoUser, setDemoUser] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<Data>(demoSeed);
  const [hydrated, setHydrated] = useState(false);
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [role, setRoleState] = useState<Role>("tenant");
  const [propertyId, setPropertyId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem(DEMO_USER);
      const raw = localStorage.getItem(DEMO_KEY);
      if (u) setDemoUser(u);
      if (raw) setDemoData(JSON.parse(raw));
    } catch {}
    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user.id ?? null);
      setHydrated(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSessionUser(session?.user.id ?? null);
      if (event === "SIGNED_OUT") qc.removeQueries({ queryKey: ["ws"] });
      else qc.invalidateQueries({ queryKey: ["ws"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(DEMO_KEY, JSON.stringify(demoData));
  }, [demoData, hydrated]);

  const mode: Mode = demoUser ? "demo" : sessionUser ? "live" : "none";
  const live = useQuery({ queryKey: ["ws", sessionUser], queryFn: () => loadLive(sessionUser!), enabled: mode === "live" });

  const demoViewer = demoPersonas.find((p) => p.userId === demoUser) ?? null;
  const viewer: Viewer | null = mode === "demo" ? demoViewer : mode === "live" ? live.data?.viewer ?? null : null;
  const data = mode === "demo" ? demoData : mode === "live" ? live.data?.data ?? empty : empty;

  // default role + property
  useEffect(() => {
    if (!viewer) return;
    const stored = typeof window !== "undefined" ? (localStorage.getItem("housekey-role") as Role | null) : null;
    if (stored && viewer.roles.includes(stored)) setRoleState(stored);
    else if (viewer.roles[0]) setRoleState(viewer.roles[0]);
  }, [viewer?.userId, viewer?.roles.join()]);
  useEffect(() => {
    if (!viewer) return;
    const mine = role === "landlord" ? data.properties.filter((p) => p.ownerId === viewer.userId) : data.properties.filter((p) => data.tenancies.some((t) => t.propertyId === p.id && t.tenantId === viewer.userId));
    if (!propertyId || !mine.some((p) => p.id === propertyId)) setPropertyId(mine[0]?.id ?? null);
  }, [viewer?.userId, role, data.properties.length, data.tenancies.length]);

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem("housekey-role", r);
  };

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["ws"] }), [qc]);
  const D = (fn: (d: Data) => Data) => setDemoData((d) => fn(d));
  const actor = viewer?.name ?? "Someone";
  const audit = (d: Data, propertyId: string, action: string): Data => ({ ...d, audit: [{ id: uid(), propertyId, actor, action, at: now() }, ...d.audit] });
  const notify = (d: Data, body: string): Data => ({ ...d, notifications: [{ id: uid(), body, read: false, at: now() }, ...d.notifications] });
  const liveAudit = async (propertyId: string, action: string) => {
    await supabase.from("audit_logs").insert({ property_id: propertyId, action });
  };

  const actions: Actions = useMemo(() => {
    const isDemo = mode === "demo";
    return {
      async addProperty(p) {
        if (isDemo) {
          const id = uid();
          D((d) => audit({ ...d, properties: [...d.properties, { id, ownerId: viewer!.userId, name: p.name, address: p.address, photoUrl: null, inviteCode: p.name.slice(0, 4).toUpperCase() + "-" + uid().slice(0, 4).toUpperCase(), rentDay: p.rentDay }], rooms: [...d.rooms, ...p.rooms.map((r) => ({ id: uid(), propertyId: id, ...r, weight: 1, available: true }))] }, id, `Created ${p.name} with ${p.rooms.length} rooms`));
          return id;
        }
        const { data: row, error } = await supabase.from("properties").insert({ name: p.name, address: p.address, rent_day: p.rentDay }).select("id").single();
        if (error) throw new Error(error.message);
        if (p.rooms.length) check(await supabase.from("rooms").insert(p.rooms.map((r) => ({ property_id: row.id, name: r.name, rent: r.rent, deposit: r.deposit }))));
        await liveAudit(row.id, `Created ${p.name} with ${p.rooms.length} rooms`);
        refresh();
        return row.id;
      },
      async updateProperty(id, patch) {
        if (isDemo) return D((d) => ({ ...d, properties: d.properties.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        check(await supabase.from("properties").update({ name: patch.name, address: patch.address, photo_url: patch.photoUrl }).eq("id", id));
        refresh();
      },
      async addRoom(r) {
        if (isDemo) return D((d) => audit({ ...d, rooms: [...d.rooms, { id: uid(), ...r, weight: 1, available: true }] }, r.propertyId, `Added ${r.name}`));
        check(await supabase.from("rooms").insert({ property_id: r.propertyId, name: r.name, rent: r.rent, deposit: r.deposit }));
        await liveAudit(r.propertyId, `Added ${r.name}`);
        refresh();
      },
      async updateRoom(id, patch) {
        if (isDemo) return D((d) => ({ ...d, rooms: d.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
        check(await supabase.from("rooms").update(patch).eq("id", id));
        refresh();
      },
      async invite(propertyId, roomId, email) {
        if (isDemo) return D((d) => ({ ...d, invitations: [{ id: uid(), propertyId, roomId, email, status: "pending" }, ...d.invitations] }));
        check(await supabase.from("invitations").insert({ property_id: propertyId, room_id: roomId, email }));
        refresh();
      },
      async decideApplication(a, approve, roomId, start, end) {
        if (isDemo) {
          return D((d) => {
            let n: Data = { ...d, applications: d.applications.map((x) => (x.id === a.id ? { ...x, status: approve ? "approved" : "rejected", roomId: roomId ?? x.roomId } : x)) };
            if (approve && roomId && start) {
              const tid = uid();
              const room = d.rooms.find((r) => r.id === roomId)!;
              n = { ...n, tenancies: [...n.tenancies, { id: tid, propertyId: a.propertyId, roomId, tenantId: a.applicantId, name: a.name, email: a.email, start, end: end ?? null, proposedEnd: null, status: "active" }], deposits: [...n.deposits, { id: uid(), propertyId: a.propertyId, roomId, tenancyId: tid, amount: room.deposit, status: "awaiting" }] };
            }
            return audit(n, a.propertyId, `${approve ? "Approved" : "Declined"} ${a.name}'s application`);
          });
        }
        check(await supabase.from("applications").update({ status: approve ? "approved" : "rejected", room_id: roomId ?? a.roomId }).eq("id", a.id));
        if (approve && roomId && start) {
          const { data: room } = await supabase.from("rooms").select("deposit").eq("id", roomId).single();
          const { data: t, error } = await supabase.from("tenancies").insert({ property_id: a.propertyId, room_id: roomId, tenant_id: a.applicantId, tenant_name: a.name, tenant_email: a.email, start_date: start, end_date: end ?? null }).select("id").single();
          if (error) throw new Error(error.message);
          check(await supabase.from("deposits").insert({ property_id: a.propertyId, room_id: roomId, tenancy_id: t.id, amount: room?.deposit ?? 0, status: "awaiting" }));
        }
        await liveAudit(a.propertyId, `${approve ? "Approved" : "Declined"} ${a.name}'s application`);
        refresh();
      },
      async applyWithCode(code, name, message, moveIn) {
        if (isDemo) {
          const p = demoData.properties.find((x) => x.inviteCode === code.trim().toUpperCase());
          if (!p) throw new Error("No property found for that code. Try MAPLE-7Q4K.");
          return D((d) => ({ ...d, applications: [{ id: uid(), propertyId: p.id, roomId: null, applicantId: viewer!.userId, name, email: viewer!.email, message, moveIn, status: "pending", createdAt: now() }, ...d.applications] }));
        }
        check(await supabase.rpc("apply_with_code", { _code: code, _name: name, _message: message, _move_in: moveIn as string }));
        refresh();
      },
      async addBill(b) {
        if (isDemo) return D((d) => notify(audit({ ...d, bills: [{ ...b, id: uid(), createdAt: now() }, ...d.bills] }, b.propertyId, `Added ${b.type} bill ${b.provider} €${b.total} (${b.start} → ${b.end})`), `New ${b.type.toLowerCase()} bill: €${b.total.toFixed(2)}`));
        check(await supabase.from("bills").insert({ property_id: b.propertyId, bill_type: b.type, provider: b.provider, total: b.total, start_date: b.start, end_date: b.end, reference: b.reference, source: b.source }));
        await liveAudit(b.propertyId, `Added ${b.type} bill ${b.provider} €${b.total} (${b.start} → ${b.end})`);
        refresh();
      },
      async pay(p) {
        const row: Payment = { id: uid(), propertyId: p.propertyId, payerId: p.payerId === undefined ? viewer!.userId : p.payerId, payerName: p.payerName ?? viewer!.name, payeeName: p.payeeName, category: p.category, description: p.description, amount: p.amount, status: p.status, method: "PayPal", reference: ref(), billId: p.billId ?? null, date: now() };
        if (isDemo) {
          D((d) => audit({ ...d, payments: [row, ...d.payments] }, p.propertyId, `${row.payerName} paid €${p.amount.toFixed(2)} · ${p.description} (${p.status})`));
          return row;
        }
        const { data: ins, error } = await supabase.from("payments").insert({ property_id: p.propertyId, payer_id: row.payerId, payer_name: row.payerName, payee_name: p.payeeName, category: p.category, description: p.description, amount: p.amount, status: p.status, bill_id: p.billId ?? null }).select("*").single();
        if (error) throw new Error(error.message);
        await liveAudit(p.propertyId, `${row.payerName} paid €${p.amount.toFixed(2)} · ${p.description} (${p.status})`);
        refresh();
        return { ...row, id: ins.id, reference: ins.reference, date: ins.created_at };
      },
      async setPaymentStatus(id, status) {
        if (isDemo) return D((d) => ({ ...d, payments: d.payments.map((p) => (p.id === id ? { ...p, status } : p)) }));
        check(await supabase.from("payments").update({ status }).eq("id", id));
        refresh();
      },
      async requestMoveout(tenancyId, date) {
        if (isDemo) {
          const t = demoData.tenancies.find((x) => x.id === tenancyId)!;
          return D((d) => notify(audit({ ...d, tenancies: d.tenancies.map((x) => (x.id === tenancyId ? { ...x, proposedEnd: date, status: "moveout_requested" } : x)) }, t.propertyId, `${t.name} requested move-out for ${date}`), `${t.name} requested to move out on ${date}`));
        }
        check(await supabase.rpc("request_moveout", { _tenancy: tenancyId, _date: date }));
        refresh();
      },
      async decideMoveout(tenancyId, approve) {
        const src = isDemo ? demoData : data;
        const t = src.tenancies.find((x) => x.id === tenancyId)!;
        if (!approve) {
          if (isDemo) return D((d) => audit({ ...d, tenancies: d.tenancies.map((x) => (x.id === tenancyId ? { ...x, proposedEnd: null, status: "active" } : x)) }, t.propertyId, `Declined ${t.name}'s move-out request`));
          check(await supabase.from("tenancies").update({ proposed_end_date: null, status: "active" }).eq("id", tenancyId));
          await liveAudit(t.propertyId, `Declined ${t.name}'s move-out request`);
          return refresh();
        }
        const next: Data = { ...src, tenancies: src.tenancies.map((x) => (x.id === tenancyId ? { ...x, end: t.proposedEnd, status: "active" as const } : x)) };
        const items = draftSettlement(next, { ...t, end: t.proposedEnd });
        const total = settlementTotal(items);
        if (isDemo) {
          return D((d) => audit({
            ...d,
            tenancies: next.tenancies,
            rooms: d.rooms.map((r) => (r.id === t.roomId ? { ...r, available: true } : r)),
            deposits: d.deposits.map((x) => (x.tenancyId === tenancyId ? { ...x, status: "refund_due" } : x)),
            settlements: [{ id: uid(), propertyId: t.propertyId, tenancyId, tenantId: t.tenantId, items, total, status: "draft" }, ...d.settlements.filter((s) => s.tenancyId !== tenancyId)],
          }, t.propertyId, `Approved ${t.name}'s move-out for ${t.proposedEnd}; draft settlement ${total.toFixed(2)}`));
        }
        check(await supabase.from("tenancies").update({ end_date: t.proposedEnd, status: "active" }).eq("id", tenancyId));
        check(await supabase.from("rooms").update({ available: true }).eq("id", t.roomId));
        check(await supabase.from("deposits").update({ status: "refund_due" }).eq("tenancy_id", tenancyId));
        check(await supabase.from("settlements").insert({ property_id: t.propertyId, tenancy_id: tenancyId, tenant_id: t.tenantId, items: items as never, total }));
        await liveAudit(t.propertyId, `Approved ${t.name}'s move-out for ${t.proposedEnd}; draft settlement ${total.toFixed(2)}`);
        refresh();
      },
      async saveSettlement(id, items, status) {
        const total = settlementTotal(items);
        if (isDemo) return D((d) => ({ ...d, settlements: d.settlements.map((s) => (s.id === id ? { ...s, items, total, status } : s)) }));
        check(await supabase.from("settlements").update({ items: items as never, total, status }).eq("id", id));
        refresh();
      },
      async payDeposit(depositId) {
        const src = isDemo ? demoData : data;
        const dep = src.deposits.find((x) => x.id === depositId)!;
        const room = src.rooms.find((r) => r.id === dep.roomId);
        const owner = src.properties.find((p) => p.id === dep.propertyId);
        const pay = await this.pay({ propertyId: dep.propertyId, category: "Deposit", description: `Deposit · ${room?.name.split(" · ")[0] ?? "room"}`, amount: dep.amount, payeeName: owner ? "Landlord" : "Landlord", status: "Paid" });
        if (isDemo) D((d) => ({ ...d, deposits: d.deposits.map((x) => (x.id === depositId ? { ...x, status: "held" } : x)) }));
        // Tenants can't update deposits directly; landlord confirms receipt in live mode.
        return pay;
      },
      async returnDeposit(depositId) {
        const src = isDemo ? demoData : data;
        const dep = src.deposits.find((x) => x.id === depositId)!;
        const t = src.tenancies.find((x) => x.id === dep.tenancyId);
        if (isDemo) {
          D((d) => ({ ...d, deposits: d.deposits.map((x) => (x.id === depositId ? { ...x, status: "returned" } : x)) }));
        } else {
          check(await supabase.from("deposits").update({ status: "returned" }).eq("id", depositId));
        }
        await this.pay({ propertyId: dep.propertyId, category: "Refund", description: `Deposit returned to ${t?.name ?? "tenant"}`, amount: dep.amount, payeeName: t?.name ?? "Tenant", status: "Paid" });
      },
      async confirmDeposit(depositId) {
        if (isDemo) return D((d) => ({ ...d, deposits: d.deposits.map((x) => (x.id === depositId ? { ...x, status: "held" } : x)) }));
        check(await supabase.from("deposits").update({ status: "held" }).eq("id", depositId));
        refresh();
      },
      async addMaintenance(m) {
        if (isDemo) return D((d) => notify({ ...d, maintenance: [{ id: uid(), ...m, cost: null, status: "open", createdAt: now() }, ...d.maintenance] }, `Maintenance request: ${m.title}`));
        check(await supabase.from("maintenance_requests").insert({ property_id: m.propertyId, room_id: m.roomId, title: m.title, details: m.details }));
        refresh();
      },
      async updateMaintenance(id, patch) {
        if (isDemo) return D((d) => ({ ...d, maintenance: d.maintenance.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
        check(await supabase.from("maintenance_requests").update(patch).eq("id", id));
        refresh();
      },
      async addExpense(e) {
        if (isDemo) return D((d) => ({ ...d, expenses: [{ id: uid(), ...e }, ...d.expenses] }));
        check(await supabase.from("expenses").insert({ property_id: e.propertyId, category: e.category, description: e.description, amount: e.amount, spent_on: e.date }));
        refresh();
      },
      async raiseDispute(billId, propertyId, reason) {
        if (isDemo) return D((d) => notify(audit({ ...d, disputes: [{ id: uid(), billId, propertyId, raisedBy: viewer!.userId, reason, status: "open", createdAt: now() }, ...d.disputes] }, propertyId, `Raised a bill dispute: ${reason}`), "A bill dispute was raised"));
        check(await supabase.from("bill_disputes").insert({ bill_id: billId, property_id: propertyId, reason }));
        await liveAudit(propertyId, `Raised a bill dispute: ${reason}`);
        refresh();
      },
      async readNotifications() {
        if (isDemo) return D((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
        await supabase.from("notifications").update({ read: true }).eq("read", false);
        refresh();
      },
      async sendMessage(propertyId, body) {
        const text = body.trim().slice(0, 2000);
        if (!text) return;
        if (isDemo) return D((d) => ({ ...d, messages: [...d.messages, { id: uid(), propertyId, senderId: viewer!.userId, senderName: viewer!.name, body: text, at: now() }] }));
        check(await supabase.from("messages").insert({ property_id: propertyId, sender_name: viewer!.name, body: text }));
        refresh();
      },
      async addChore(c) {
        if (isDemo) return D((d) => ({ ...d, chores: [...d.chores, { id: uid(), ...c, done: false }] }));
        check(await supabase.from("chores").insert({ property_id: c.propertyId, title: c.title, assignee_id: c.assigneeId, assignee_name: c.assigneeName, due_date: c.due, repeat: c.repeat }));
        refresh();
      },
      async toggleChore(c) {
        // Completing a repeating chore rolls it to the next due date instead of closing it.
        const step = { weekly: 7, fortnightly: 14, monthly: 30, once: 0 }[c.repeat];
        const next = !c.done && step && c.due ? new Date(new Date(c.due).getTime() + step * 864e5).toISOString().slice(0, 10) : null;
        const patch = next ? { done: false, due: next } : { done: !c.done, due: c.due };
        if (isDemo) return D((d) => ({ ...d, chores: d.chores.map((x) => (x.id === c.id ? { ...x, ...patch } : x)) }));
        check(await supabase.from("chores").update({ done: patch.done, due_date: patch.due }).eq("id", c.id));
        refresh();
      },
      async deleteChore(id) {
        if (isDemo) return D((d) => ({ ...d, chores: d.chores.filter((x) => x.id !== id) }));
        check(await supabase.from("chores").delete().eq("id", id));
        refresh();
      },
      async addRule(propertyId, body) {
        if (isDemo) return D((d) => ({ ...d, rules: [...d.rules, { id: uid(), propertyId, body, createdBy: viewer!.name, agreedBy: [viewer!.userId], at: now() }] }));
        check(await supabase.from("house_rules").insert({ property_id: propertyId, body, created_by_name: viewer!.name, agreed_by: [viewer!.userId] }));
        refresh();
      },
      async agreeRule(id, agree) {
        const r = data.rules.find((x) => x.id === id);
        if (!r) return;
        const agreedBy = agree ? Array.from(new Set([...r.agreedBy, viewer!.userId])) : r.agreedBy.filter((u) => u !== viewer!.userId);
        if (isDemo) return D((d) => ({ ...d, rules: d.rules.map((x) => (x.id === id ? { ...x, agreedBy } : x)) }));
        check(await supabase.from("house_rules").update({ agreed_by: agreedBy }).eq("id", id));
        refresh();
      },
      async deleteRule(id) {
        if (isDemo) return D((d) => ({ ...d, rules: d.rules.filter((x) => x.id !== id) }));
        check(await supabase.from("house_rules").delete().eq("id", id));
        refresh();
      },
      async addDocument(doc) {
        if (isDemo) {
          const path = doc.file ? URL.createObjectURL(doc.file) : null;
          return D((d) => audit({ ...d, documents: [{ id: uid(), propertyId: doc.propertyId, title: doc.title, kind: doc.kind, path, uploadedBy: viewer!.userId, uploadedByName: viewer!.name, at: now() }, ...d.documents] }, doc.propertyId, `Added document: ${doc.title}`));
        }
        let path: string | null = null;
        if (doc.file) {
          path = `${doc.propertyId}/${crypto.randomUUID()}-${doc.file.name.replace(/[^\w.-]+/g, "_")}`;
          check(await supabase.storage.from("documents").upload(path, doc.file));
        }
        check(await supabase.from("documents").insert({ property_id: doc.propertyId, title: doc.title, kind: doc.kind, storage_path: path, uploaded_by_name: viewer!.name }));
        await liveAudit(doc.propertyId, `Added document: ${doc.title}`);
        refresh();
      },
      async openDocument(path) {
        if (isDemo || path.startsWith("blob:")) return path;
        const { data: signed, error } = await supabase.storage.from("documents").createSignedUrl(path, 300);
        if (error) throw new Error(error.message);
        return signed.signedUrl;
      },
      async deleteDocument(id) {
        const doc = data.documents.find((x) => x.id === id);
        if (isDemo) return D((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== id) }));
        if (doc?.path) await supabase.storage.from("documents").remove([doc.path]);
        check(await supabase.from("documents").delete().eq("id", id));
        refresh();
      },
      async sendReminder(tenancyId, body) {
        if (isDemo) {
          // Demo has one shared notification feed, so the reminder shows there.
          const t = demoData.tenancies.find((x) => x.id === tenancyId);
          return D((d) => audit(notify(d, `Reminder to ${t?.name ?? "tenant"}: ${body}`), t?.propertyId ?? "", `Sent a reminder to ${t?.name}`));
        }
        check(await supabase.rpc("send_reminder", { _tenancy: tenancyId, _body: body }));
      },
    };
  }, [mode, viewer, demoData, data, refresh]);

  const value: Ctx = {
    mode,
    loading: !hydrated || (mode === "live" && live.isLoading),
    viewer,
    data,
    role,
    setRole,
    propertyId,
    setPropertyId,
    actions,
    refresh,
    startDemo: (u) => {
      localStorage.setItem(DEMO_USER, u);
      setDemoUser(u);
      const r = demoPersonas.find((p) => p.userId === u)?.roles[0] ?? "tenant";
      setRole(r);
    },
    exitDemo: () => {
      localStorage.removeItem(DEMO_USER);
      setDemoUser(null);
    },
    resetDemo: () => setDemoData(demoSeed()),
  };
  return <WsCtx.Provider value={value}>{children}</WsCtx.Provider>;
}

export function useWorkspace() {
  const c = useContext(WsCtx);
  if (!c) throw new Error("WorkspaceProvider missing");
  return c;
}

/** Scoped helpers for the active property. */
export function useScope() {
  const ws = useWorkspace();
  const { data, propertyId, viewer } = ws;
  const property = data.properties.find((p) => p.id === propertyId) ?? null;
  const pick = <T extends { propertyId: string }>(xs: T[]) => xs.filter((x) => x.propertyId === propertyId);
  const myTenancy = viewer ? data.tenancies.filter((t) => t.propertyId === propertyId && t.tenantId === viewer.userId).sort((a, b) => b.start.localeCompare(a.start))[0] ?? null : null;
  return { ...ws, property, pick, myTenancy };
}
