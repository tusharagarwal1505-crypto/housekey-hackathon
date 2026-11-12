import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/lib/seo";
import { PageHeaderLite } from "@/components/hk/kit";
import { ChoresAndRules } from "@/components/hk/features";

export const Route = createFileRoute("/living/house")({
  head: () => meta("Chores & house rules", "Shared chore rota and house rules agreed by housemates."),
  component: () => (
    <div className="space-y-6">
      <PageHeaderLite title="Chores & house rules" subtitle="Keep the house running fairly." />
      <ChoresAndRules />
    </div>
  ),
});
