import type { Data, Viewer } from "./model";

const P = "p-maple";
export const demoPersonas: (Viewer & { blurb: string })[] = [
  { userId: "u-niamh", name: "Niamh Byrne", email: "niamh@byrnelettings.ie", roles: ["landlord"], blurb: "Landlord · owns Maple House" },
  { userId: "u-sarah", name: "Sarah", email: "sarah@maple.ie", roles: ["tenant"], blurb: "Tenant · Room 1" },
  { userId: "u-max", name: "Max", email: "max@maple.ie", roles: ["tenant"], blurb: "Former tenant · left 31 Oct" },
  { userId: "u-jake", name: "Jake", email: "jake@maple.ie", roles: ["tenant"], blurb: "Replacement tenant · Room 4" },
];

export const demoSeed = (): Data => ({
  properties: [
    { id: P, ownerId: "u-niamh", name: "Maple House", address: "14 Maple Terrace, Rathmines, Dublin 6", photoUrl: null, inviteCode: "MAPLE-7Q4K", rentDay: 1 },
  ],
  rooms: [
    { id: "r1", propertyId: P, name: "Room 1 · Front double", rent: 850, deposit: 500, weight: 1, available: false },
    { id: "r2", propertyId: P, name: "Room 2 · Garden view", rent: 800, deposit: 500, weight: 1, available: false },
    { id: "r3", propertyId: P, name: "Room 3 · Attic", rent: 750, deposit: 500, weight: 1, available: false },
    { id: "r4", propertyId: P, name: "Room 4 · Back double", rent: 800, deposit: 500, weight: 1, available: false },
  ],
  tenancies: [
    { id: "t-sarah", propertyId: P, roomId: "r1", tenantId: "u-sarah", name: "Sarah", email: "sarah@maple.ie", start: "2025-09-01", end: "2027-08-31", proposedEnd: null, status: "active" },
    { id: "t-emma", propertyId: P, roomId: "r2", tenantId: "u-emma", name: "Emma", email: "emma@maple.ie", start: "2025-09-01", end: "2026-12-31", proposedEnd: null, status: "active" },
    { id: "t-priya", propertyId: P, roomId: "r3", tenantId: "u-priya", name: "Priya", email: "priya@maple.ie", start: "2025-09-01", end: "2027-08-31", proposedEnd: null, status: "active" },
    { id: "t-max", propertyId: P, roomId: "r4", tenantId: "u-max", name: "Max", email: "max@maple.ie", start: "2025-09-01", end: "2026-10-31", proposedEnd: "2026-10-31", status: "ended" },
    { id: "t-jake", propertyId: P, roomId: "r4", tenantId: "u-jake", name: "Jake", email: "jake@maple.ie", start: "2026-11-01", end: "2027-08-31", proposedEnd: null, status: "active" },
  ],
  bills: [
    { id: "b-elec", propertyId: P, type: "Electricity", provider: "Electric Ireland", total: 183, start: "2026-10-01", end: "2026-11-30", reference: "EI-2026-55812", source: "AI scan", createdAt: "2026-11-02T10:00:00Z" },
    { id: "b-net", propertyId: P, type: "Internet", provider: "Virgin Media", total: 48, start: "2026-10-01", end: "2026-10-31", reference: "VM-883120", source: "Manual", createdAt: "2026-11-01T09:00:00Z" },
    { id: "b-gas", propertyId: P, type: "Gas", provider: "Bord Gáis Energy", total: 96, start: "2026-09-01", end: "2026-10-31", reference: "BG-4471-22", source: "Manual", createdAt: "2026-11-01T09:10:00Z" },
    { id: "b-elec-0", propertyId: P, type: "Electricity", provider: "Electric Ireland", total: 164, start: "2026-08-01", end: "2026-09-30", reference: "EI-2026-41207", source: "Manual", createdAt: "2026-10-02T09:00:00Z" },
  ],
  payments: [
    ...["Aug", "Sep", "Oct", "Nov"].flatMap((m, i) => {
      const date = `2026-${String(8 + i).padStart(2, "0")}-01T08:00:00Z`;
      const rows = [
        { id: `rent-sarah-${m}`, payerId: "u-sarah", payerName: "Sarah", amount: 850, room: "Room 1" },
        { id: `rent-emma-${m}`, payerId: "u-emma", payerName: "Emma", amount: 800, room: "Room 2" },
        { id: `rent-priya-${m}`, payerId: "u-priya", payerName: "Priya", amount: 750, room: "Room 3" },
        m === "Nov" ? { id: `rent-jake-${m}`, payerId: "u-jake", payerName: "Jake", amount: 800, room: "Room 4" } : { id: `rent-max-${m}`, payerId: "u-max", payerName: "Max", amount: 800, room: "Room 4" },
      ];
      return rows.map((r) => ({
        id: r.id, propertyId: P, payerId: r.payerId, payerName: r.payerName, payeeName: "Niamh Byrne", category: "Rent" as const,
        description: `${m} rent · ${r.room}`, amount: r.amount,
        status: (m === "Nov" && (r.payerName === "Emma" || r.payerName === "Jake") ? "Pending" : "Paid") as "Pending" | "Paid",
        method: "Bank transfer", reference: `PAYID-R${m.toUpperCase()}${r.payerName.toUpperCase().slice(0, 3)}`, billId: null, date,
      }));
    }),
    { id: "pu1", propertyId: P, payerId: "u-sarah", payerName: "Sarah", payeeName: "Household", category: "Utility", description: "Internet Oct share", amount: 12, status: "Paid", method: "PayPal", reference: "PAYID-NET1SAR", billId: "b-net", date: "2026-11-01T12:00:00Z" },
    { id: "pu2", propertyId: P, payerId: "u-emma", payerName: "Emma", payeeName: "Household", category: "Utility", description: "Internet Oct share", amount: 12, status: "Paid", method: "PayPal", reference: "PAYID-NET1EMM", billId: "b-net", date: "2026-11-01T12:30:00Z" },
    { id: "pu3", propertyId: P, payerId: "u-priya", payerName: "Priya", payeeName: "Household", category: "Utility", description: "Internet Oct share", amount: 12, status: "Paid", method: "PayPal", reference: "PAYID-NET1PRI", billId: "b-net", date: "2026-11-01T13:00:00Z" },
    ...["u-sarah", "u-emma", "u-priya", "u-max"].map((u, i) => ({ id: `pg${i}`, propertyId: P, payerId: u, payerName: ["Sarah", "Emma", "Priya", "Max"][i]!, payeeName: "Household", category: "Utility" as const, description: "Gas Sep–Oct share", amount: 24, status: "Paid" as const, method: "PayPal", reference: `PAYID-GAS${i}`, billId: "b-gas", date: "2026-11-01T14:00:00Z" })),
    ...["u-sarah", "u-emma", "u-priya", "u-max"].map((u, i) => ({ id: `pe${i}`, propertyId: P, payerId: u, payerName: ["Sarah", "Emma", "Priya", "Max"][i]!, payeeName: "Household", category: "Utility" as const, description: "Electricity Aug–Sep share", amount: 41, status: "Paid" as const, method: "PayPal", reference: `PAYID-EL0${i}`, billId: "b-elec-0", date: "2026-10-03T10:00:00Z" })),
    { id: "pmax-dep", propertyId: P, payerId: "u-max", payerName: "Max", payeeName: "Niamh Byrne", category: "Deposit", description: "Deposit · Room 4", amount: 500, status: "Paid", method: "Bank transfer", reference: "PAYID-DEPMAX25", billId: null, date: "2025-08-25T10:00:00Z" },
  ],
  deposits: [
    { id: "d1", propertyId: P, roomId: "r1", tenancyId: "t-sarah", amount: 500, status: "held" },
    { id: "d2", propertyId: P, roomId: "r2", tenancyId: "t-emma", amount: 500, status: "held" },
    { id: "d3", propertyId: P, roomId: "r3", tenancyId: "t-priya", amount: 500, status: "held" },
    { id: "d4", propertyId: P, roomId: "r4", tenancyId: "t-max", amount: 500, status: "refund_due" },
    { id: "d5", propertyId: P, roomId: "r4", tenancyId: "t-jake", amount: 500, status: "awaiting" },
  ],
  settlements: [
    {
      id: "s-max", propertyId: P, tenancyId: "t-max", tenantId: "u-max", status: "draft", total: 514.75,
      items: [
        { label: "Deposit refund", amount: 500 },
        { label: "Electricity Oct–Nov (31 days)", amount: -23.25 },
        { label: "Internet October share", amount: -12 },
        { label: "Rent overpayment credit", amount: 50 },
      ],
    },
  ],
  applications: [
    { id: "a-jake", propertyId: P, roomId: "r4", applicantId: "u-jake", name: "Jake", email: "jake@maple.ie", message: "MSc student at Trinity, tidy and quiet. Can move in 1 Nov.", moveIn: "2026-11-01", status: "approved", createdAt: "2026-10-12T10:00:00Z" },
    { id: "a-ana", propertyId: P, roomId: "r2", applicantId: null, name: "Ana Kovač", email: "ana@example.com", message: "Junior architect looking for a room from January.", moveIn: "2027-01-01", status: "pending", createdAt: "2026-10-30T15:00:00Z" },
  ],
  invitations: [{ id: "i1", propertyId: P, roomId: "r2", email: "tom@example.com", status: "pending" }],
  maintenance: [
    { id: "m1", propertyId: P, roomId: "r3", title: "Attic skylight leaking", details: "Drips during heavy rain.", cost: 180, status: "in_progress", createdAt: "2026-10-21T09:00:00Z" },
    { id: "m2", propertyId: P, roomId: null, title: "Boiler annual service", details: null, cost: 120, status: "done", createdAt: "2026-09-14T09:00:00Z" },
    { id: "m3", propertyId: P, roomId: "r1", title: "Wardrobe door hinge", details: null, cost: null, status: "open", createdAt: "2026-11-01T18:00:00Z" },
  ],
  expenses: [
    { id: "e1", propertyId: P, category: "Insurance", description: "Landlord insurance (annual)", amount: 640, date: "2026-09-01" },
    { id: "e2", propertyId: P, category: "Maintenance", description: "Boiler service", amount: 120, date: "2026-09-14" },
    { id: "e3", propertyId: P, category: "Fees", description: "RTB tenancy registration", amount: 40, date: "2026-11-01" },
  ],
  disputes: [],
  audit: [
    { id: "au1", propertyId: P, actor: "Niamh Byrne", action: "Set Room 4 deposit at €500 (locked)", at: "2025-08-20T10:00:00Z" },
    { id: "au2", propertyId: P, actor: "Max", action: "Requested move-out for 2026-10-31", at: "2026-10-05T09:00:00Z" },
    { id: "au3", propertyId: P, actor: "Niamh Byrne", action: "Approved Max's move-out for 2026-10-31", at: "2026-10-06T09:00:00Z" },
    { id: "au4", propertyId: P, actor: "Niamh Byrne", action: "Approved Jake's application for Room 4 (tenancy agreement signed offline)", at: "2026-10-15T09:00:00Z" },
  ],
  messages: [
    { id: "msg1", propertyId: P, senderId: "u-niamh", senderName: "Niamh Byrne", body: "Welcome to Maple House, Jake! Your keys are in the lockbox — code is in your welcome pack.", at: "2026-11-01T09:30:00Z" },
    { id: "msg2", propertyId: P, senderId: "u-sarah", senderName: "Sarah", body: "Welcome Jake 👋 bins go out Thursday night.", at: "2026-11-01T10:05:00Z" },
    { id: "msg3", propertyId: P, senderId: "u-jake", senderName: "Jake", body: "Thanks both! Moving my stuff in this afternoon.", at: "2026-11-01T10:20:00Z" },
  ],
  chores: [
    { id: "c1", propertyId: P, title: "Bins out (Thursday)", assigneeId: "u-sarah", assigneeName: "Sarah", due: "2026-11-05", repeat: "weekly", done: false },
    { id: "c2", propertyId: P, title: "Clean kitchen surfaces", assigneeId: "u-jake", assigneeName: "Jake", due: "2026-11-04", repeat: "weekly", done: false },
    { id: "c3", propertyId: P, title: "Hoover stairs & hall", assigneeId: "u-priya", assigneeName: "Priya", due: "2026-11-07", repeat: "fortnightly", done: false },
    { id: "c4", propertyId: P, title: "Bathroom deep clean", assigneeId: "u-emma", assigneeName: "Emma", due: "2026-11-01", repeat: "weekly", done: true },
  ],
  rules: [
    { id: "hr1", propertyId: P, body: "Quiet hours 11pm–7am on weeknights.", createdBy: "Niamh Byrne", agreedBy: ["u-sarah", "u-emma", "u-priya"], at: "2025-08-25T10:00:00Z" },
    { id: "hr2", propertyId: P, body: "Guests staying more than 3 nights should be mentioned in the house chat.", createdBy: "Sarah", agreedBy: ["u-sarah", "u-priya"], at: "2025-09-10T10:00:00Z" },
    { id: "hr3", propertyId: P, body: "Shared groceries (milk, oil, washing-up liquid) split equally each month.", createdBy: "Emma", agreedBy: ["u-emma", "u-sarah", "u-priya"], at: "2025-09-12T10:00:00Z" },
  ],
  documents: [
    { id: "d1", propertyId: P, title: "Room 4 lease · Jake", kind: "Lease", path: null, uploadedBy: "u-niamh", uploadedByName: "Niamh Byrne", at: "2026-10-28T10:00:00Z" },
    { id: "d2", propertyId: P, title: "Move-in inspection · Room 4", kind: "Inspection", path: null, uploadedBy: "u-niamh", uploadedByName: "Niamh Byrne", at: "2026-11-01T08:00:00Z" },
    { id: "d3", propertyId: P, title: "Gas safety certificate 2026", kind: "Certificate", path: null, uploadedBy: "u-niamh", uploadedByName: "Niamh Byrne", at: "2026-09-14T09:00:00Z" },
    { id: "d4", propertyId: P, title: "Room 1 lease · Sarah", kind: "Lease", path: null, uploadedBy: "u-niamh", uploadedByName: "Niamh Byrne", at: "2025-08-28T09:00:00Z" },
  ],
  notifications: [
    { id: "n1", body: "Jake's €500 Room 4 deposit is awaiting payment", read: false, at: "2026-11-01T09:00:00Z" },
    { id: "n2", body: "Emma's November rent is pending", read: false, at: "2026-11-01T08:05:00Z" },
    { id: "n3", body: "New application from Ana Kovač", read: false, at: "2026-10-30T15:00:00Z" },
  ],
});
