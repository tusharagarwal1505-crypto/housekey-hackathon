import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/lib/workspace";
import { draftSettlement, settlementTotal } from "@/lib/ledger";
import { eur, prorateRent } from "@/lib/proration";
import { fmtDate, meta } from "@/lib/seo";
import { LockedAmount, Money, PageHeaderLite, Panel, Tag } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/living/tenancy")({
  head: () => meta("My tenancy", "Your tenancy details, move-out requests and settlement preview."),
  component: Tenancy,
});

function Tenancy() {
  const { data, myTenancy: t, actions } = useScope();
  const [date, setDate] = useState("");
  if (!t) return null;
  const room = data.rooms.find((r) => r.id === t.roomId)!;
  const dep = data.deposits.find((d) => d.tenancyId === t.id);
  const preview = date ? draftSettlement(data, { ...t, proposedEnd: date, end: date }) : null;
  const [y, m] = (date || "2000-01-01").split("-").map(Number) as [number, number];
  const rentPreview = date ? prorateRent(room.rent, y, m, [{ tenantId: t.id, roomId: room.id, start: t.start, end: date }]) : null;

  const request = async () => {
    if (!date) return toast.error("Pick your last night in the house.");
    try {
      await actions.requestMoveout(t.id, date);
      toast.success("Move-out request sent to your landlord");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeaderLite title="My tenancy" />
      <Panel>
        <div className="grid grid-cols-2 gap-5 text-sm md:grid-cols-4">
          <div><div className="eyebrow">Room</div><div className="mt-1">{room.name}</div></div>
          <div><div className="eyebrow">Start</div><div className="mt-1">{fmtDate(t.start)}</div></div>
          <div><div className="eyebrow">Expected end</div><div className="mt-1">{fmtDate(t.end)}</div></div>
          <div><div className="eyebrow">Status</div><div className="mt-1"><Tag tone={t.status === "active" ? "ok" : "warn"}>{t.status.replace("_", " ")}</Tag></div></div>
        </div>
        <div className="mt-5"><LockedAmount amount={dep?.amount ?? room.deposit} /></div>
      </Panel>

      {t.status === "active" && !t.proposedEnd ? (
        <Panel title="Planning to move out?">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div><Label>Last night in the house</Label><Input type="date" value={date} min={t.start} onChange={(e) => setDate(e.target.value)} /></div>
              <Button onClick={request} disabled={!date}>Send request to landlord</Button>
              <p className="flex gap-2 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0" />Your landlord reviews the date. Notice periods in your agreement still apply.</p>
            </div>
            {preview && (
              <div className="rounded-md bg-muted p-4">
                <div className="eyebrow">Settlement preview</div>
                {rentPreview && <p className="mt-1 text-xs text-muted-foreground">Final month: {rentPreview.lines[0]?.days ?? 0} nights × {eur(rentPreview.dailyRate)} = {eur(rentPreview.lines[0]?.amount ?? 0)}</p>}
                <div className="mt-3 space-y-1">{preview.map((i) => <div key={i.label} className="flex justify-between text-sm"><span>{i.label}</span><Money value={i.amount} signed /></div>)}</div>
                <div className="mt-3 flex justify-between border-t pt-2 font-display text-lg"><span>Estimated</span><span className="num">{eur(settlementTotal(preview))}</span></div>
                <p className="mt-1 text-[11px] text-muted-foreground">Estimate from today's records — bills that arrive later can change it.</p>
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title="Move-out">
          <p className="text-sm">{t.status === "moveout_requested" ? `You asked to leave on ${fmtDate(t.proposedEnd)}. Waiting for your landlord.` : `Your move-out date is ${fmtDate(t.proposedEnd ?? t.end)}.`}</p>
        </Panel>
      )}

      <Panel title="Tenancy record">
        {data.audit.filter((a) => a.propertyId === t.propertyId && a.action.includes(t.name)).map((a) => <div key={a.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{a.action}</span><span className="text-muted-foreground">{fmtDate(a.at)}</span></div>)}
      </Panel>
    </div>
  );
}
