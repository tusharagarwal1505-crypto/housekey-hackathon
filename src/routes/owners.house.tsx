import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/lib/seo";
import { PageHeaderLite } from "@/components/hk/kit";
import { ChoresAndRules } from "@/components/hk/features";

export const Route = createFileRoute("/owners/house")({
  head: () => meta("House rules & chores", "House rules and the tenants' chore rota."),
  component: () => (
    <div className="space-y-6">
      <PageHeaderLite title="House rules & chores" subtitle="See the rota and keep house rules up to date." />
      <ChoresAndRules />
    </div>
  ),
});
