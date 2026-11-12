import { createFileRoute } from "@tanstack/react-router";
import { useScope } from "@/lib/workspace";
import { isCurrent } from "@/lib/model";
import { fmtDate, meta } from "@/lib/seo";
import { Avatar, PageHeaderLite } from "@/components/hk/kit";

export const Route = createFileRoute("/living/housemates")({
  head: () => meta("Housemates", "Who you live with, and who's coming and going."),
  component: () => {
    const { data, pick, myTenancy } = useScope();
    const all = pick(data.tenancies);
    const now = all.filter((t) => isCurrent(t));
    const later = all.filter((t) => t.start > new Date().toISOString().slice(0, 10));
    const past = all.filter((t) => !isCurrent(t) && !later.includes(t));
    const card = (t: (typeof all)[number]) => (
      <div key={t.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
        <Avatar name={t.name} className="h-12 w-12 text-lg" />
        <div className="flex-1"><div className="font-medium">{t.name}{t.id === myTenancy?.id && <span className="text-muted-foreground"> (you)</span>}</div><div className="text-sm text-muted-foreground">{data.rooms.find((r) => r.id === t.roomId)?.name}</div></div>
        <div className="text-right text-xs text-muted-foreground">Since {fmtDate(t.start)}{t.proposedEnd ? <div className="text-warning-foreground">Leaving {fmtDate(t.proposedEnd)}</div> : null}</div>
      </div>
    );
    return (
      <div className="space-y-6">
        <PageHeaderLite title="Housemates" />
        <div className="grid gap-3 sm:grid-cols-2">{now.map(card)}</div>
        {later.length > 0 && <><div className="eyebrow">Moving in</div><div className="grid gap-3 sm:grid-cols-2">{later.map(card)}</div></>}
        {past.length > 0 && <><div className="eyebrow">Previously lived here</div><div className="grid gap-3 opacity-70 sm:grid-cols-2">{past.map(card)}</div></>}
      </div>
    );
  },
});
