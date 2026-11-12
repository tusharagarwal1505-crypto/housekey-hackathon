import { createFileRoute } from "@tanstack/react-router";
import { useScope } from "@/lib/workspace";
import { snapshot } from "@/lib/ledger";
import { meta } from "@/lib/seo";
import { PageHeaderLite } from "@/components/hk/kit";
import { AssistantChat } from "@/components/hk/shared";

export const Route = createFileRoute("/living/assistant")({
  head: () => meta("Assistant", "Ask about your bills, rent, deposit and move-out."),
  component: () => {
    const { data, property, viewer, myTenancy } = useScope();
    return (
      <div className="space-y-4">
        <PageHeaderLite title="Assistant" />
        <AssistantChat
          who={`${viewer!.name} (tenant, tenancy ${myTenancy?.id})`}
          ledger={snapshot(data, { role: "tenant", propertyId: property!.id, tenancyId: myTenancy?.id })}
          intro={`Hi ${viewer!.name.split(" ")[0]} — ask me anything about your money at ${property!.name}.`}
          suggestions={["Explain my latest bill", "How is my rent calculated?", "What if I leave on 17 November?", "How much deposit will I get back?", "Write a polite reminder about the internet bill"]}
        />
      </div>
    );
  },
});
