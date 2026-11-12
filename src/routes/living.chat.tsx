import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/lib/seo";
import { PageHeaderLite } from "@/components/hk/kit";
import { HouseChat } from "@/components/hk/features";

export const Route = createFileRoute("/living/chat")({
  head: () => meta("House chat", "Message your housemates and landlord in one thread."),
  component: () => (
    <div className="space-y-6">
      <PageHeaderLite title="House chat" subtitle="Your housemates and landlord, in one thread." />
      <HouseChat />
    </div>
  ),
});
