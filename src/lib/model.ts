// Shared data model used by both HouseKey for Owners and HouseKey Living.
export type Role = "landlord" | "tenant";
export type TxStatus = "Pending" | "Paid" | "Failed" | "Refunded";
export type BillType = "Electricity" | "Gas" | "Internet" | "Water" | "Other";

export type Property = { id: string; ownerId: string; name: string; address: string; photoUrl: string | null; inviteCode: string; rentDay: number };
export type Room = { id: string; propertyId: string; name: string; rent: number; deposit: number; weight: number; available: boolean };
export type Tenancy = {
  id: string;
  propertyId: string;
  roomId: string;
  tenantId: string | null;
  name: string;
  email: string | null;
  start: string;
  end: string | null;
  proposedEnd: string | null;
  status: "active" | "moveout_requested" | "ended";
};
export type Bill = { id: string; propertyId: string; type: BillType; provider: string; total: number; start: string; end: string; reference: string | null; source: string; createdAt: string };
export type Payment = {
  id: string;
  propertyId: string;
  payerId: string | null;
  payerName: string;
  payeeName: string;
  category: "Rent" | "Deposit" | "Utility" | "Settlement" | "Expense" | "Refund";
  description: string;
  amount: number;
  status: TxStatus;
  method: string;
  reference: string;
  billId: string | null;
  date: string;
};
export type Deposit = { id: string; propertyId: string; roomId: string; tenancyId: string | null; amount: number; status: "awaiting" | "held" | "refund_due" | "returned" };
export type SettlementItem = { label: string; amount: number };
export type Settlement = { id: string; propertyId: string; tenancyId: string; tenantId: string | null; items: SettlementItem[]; total: number; status: "draft" | "approved" | "paid" };
export type Application = { id: string; propertyId: string; roomId: string | null; applicantId: string | null; name: string; email: string | null; message: string | null; moveIn: string | null; status: "pending" | "approved" | "rejected"; createdAt: string };
export type Invitation = { id: string; propertyId: string; roomId: string | null; email: string; status: string };
export type Maintenance = { id: string; propertyId: string; roomId: string | null; title: string; details: string | null; cost: number | null; status: "open" | "in_progress" | "done"; createdAt: string };
export type Expense = { id: string; propertyId: string; category: string; description: string; amount: number; date: string };
export type Dispute = { id: string; billId: string; propertyId: string; raisedBy: string | null; reason: string; status: string; createdAt: string };
export type Audit = { id: string; propertyId: string | null; actor: string; action: string; at: string };
export type Message = { id: string; propertyId: string; senderId: string; senderName: string; body: string; at: string };
export type Chore = { id: string; propertyId: string; title: string; assigneeId: string | null; assigneeName: string | null; due: string | null; repeat: "once" | "weekly" | "fortnightly" | "monthly"; done: boolean };
export type HouseRule = { id: string; propertyId: string; body: string; createdBy: string; agreedBy: string[]; at: string };
export type DocKind = "Lease" | "Inspection" | "Receipt" | "Certificate" | "Other";
export type Doc = { id: string; propertyId: string; title: string; kind: DocKind; path: string | null; uploadedBy: string; uploadedByName: string; at: string };
export type Notice = { id: string; body: string; read: boolean; at: string };

export type Data = {
  properties: Property[];
  rooms: Room[];
  tenancies: Tenancy[];
  bills: Bill[];
  payments: Payment[];
  deposits: Deposit[];
  settlements: Settlement[];
  applications: Application[];
  invitations: Invitation[];
  maintenance: Maintenance[];
  expenses: Expense[];
  disputes: Dispute[];
  audit: Audit[];
  notifications: Notice[];
  messages: Message[];
  chores: Chore[];
  rules: HouseRule[];
  documents: Doc[];
};

export type Viewer = { userId: string; name: string; email: string; roles: Role[] };

export const today = () => new Date().toISOString().slice(0, 10);
export const isCurrent = (t: Tenancy, on = today()) => t.status !== "ended" && t.start <= on && (t.end === null || t.end >= on);
