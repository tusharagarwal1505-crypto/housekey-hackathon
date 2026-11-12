import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm } from "./living.profile";
import { useScope } from "@/lib/workspace";
import { fmtDate, meta } from "@/lib/seo";
import { PageHeader, Panel } from "@/components/hk/kit";

export const Route = createFileRoute("/owners/settings")({
  head: () => meta("Owner settings", "Your profile and property audit trail."),
  component: () => {
    const { pick, data, property } = useScope();
    return (
      <>
        <PageHeader eyebrow={property!.name} title="Settings" />
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileForm />
          <Panel title="Audit trail">
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {pick(data.audit.filter((a): a is typeof a & { propertyId: string } => !!a.propertyId)).map((a) => <div key={a.id} className="flex justify-between gap-3 border-b pb-2 text-xs last:border-0"><span>{a.action}</span><span className="shrink-0 text-muted-foreground">{a.actor} · {fmtDate(a.at)}</span></div>)}
            </div>
          </Panel>
        </div>
      </>
    );
  },
});
