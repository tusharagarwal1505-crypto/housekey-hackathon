import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/lib/seo";
import { PageHeaderLite } from "@/components/hk/kit";
import { HouseChat } from "@/components/hk/features";

export const Route = createFileRoute("/owners/messages")({
  head: () => meta("Messages", "Chat with the tenants of your property."),
  component: () => (
    <div className="space-y-6">
      <PageHeaderLite title="Messages" subtitle="One thread with everyone living in this property." />
      <HouseChat />
    </div>
  ),
});
