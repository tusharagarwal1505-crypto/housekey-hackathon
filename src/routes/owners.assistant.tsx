import { createFileRoute } from "@tanstack/react-router";
import { useScope } from "@/lib/workspace";
import { snapshot } from "@/lib/ledger";
import { meta } from "@/lib/seo";
import { PageHeader } from "@/components/hk/kit";
import { AssistantChat } from "@/components/hk/shared";

export const Route = createFileRoute("/owners/assistant")({
  head: () => meta("Owner assistant", "AI summaries of income, arrears, occupancy and maintenance."),
  component: () => {
    const { data, property, viewer } = useScope();
    return (
      <>
        <PageHeader eyebrow={property!.name} title="AI Assistant" subtitle="Summaries from your own ledger — nothing invented, nothing changed." />
        <AssistantChat
          who={`${viewer!.name} (landlord of ${property!.name})`}
          ledger={snapshot(data, { role: "landlord", propertyId: property!.id })}
          intro="Ask about income, arrears, occupancy or upcoming expirations."
          suggestions={["Summarise this month's rental income", "Who has outstanding payments?", "Which tenancies end soon?", "Summarise maintenance spending", "Summarise the open bill disputes", "Draft a polite rent reminder to Emma"]}
        />
      </>
    );
  },
});
