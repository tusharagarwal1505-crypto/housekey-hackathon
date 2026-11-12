import { eur } from "./proration";

export async function downloadReceipt(opts: {
  title: string;
  ref: string;
  date: string;
  lines: [string, string][];
  total?: { label: string; amount: number };
  note?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFillColor(23, 75, 58);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("HouseKey", 16, 20);
  doc.setFontSize(10);
  doc.text("Shared living. Fair finances.", 150, 20);
  doc.setTextColor(32, 37, 33);
  doc.setFontSize(16);
  doc.text(opts.title, 16, 48);
  doc.setFontSize(10);
  doc.setTextColor(110, 115, 110);
  doc.text(`Reference: ${opts.ref}`, 16, 56);
  doc.text(`Date: ${new Date(opts.date).toLocaleString("en-IE")}`, 16, 62);
  let y = 76;
  doc.setTextColor(32, 37, 33);
  for (const [k, v] of opts.lines) {
    doc.text(k, 16, y);
    doc.text(v, 194, y, { align: "right" });
    doc.setDrawColor(230, 230, 225);
    doc.line(16, y + 3, 194, y + 3);
    y += 10;
  }
  if (opts.total) {
    doc.setFontSize(13);
    doc.text(opts.total.label, 16, y + 6);
    doc.text(eur(opts.total.amount), 194, y + 6, { align: "right" });
    y += 16;
  }
  doc.setFontSize(8);
  doc.setTextColor(130, 135, 130);
  doc.text(
    opts.note ??
      "This receipt records a payment between housemates. It does not transfer a lease or constitute landlord approval.",
    16,
    y + 10,
    { maxWidth: 178 },
  );
  doc.save(`housekey-${opts.ref}.pdf`);
}
