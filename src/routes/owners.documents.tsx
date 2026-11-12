import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/lib/seo";
import { PageHeaderLite } from "@/components/hk/kit";
import { DocumentsVault } from "@/components/hk/features";

export const Route = createFileRoute("/owners/documents")({
  head: () => meta("Documents vault", "Leases, inspection reports, certificates and receipts for your property."),
  component: () => (
    <div className="space-y-6">
      <PageHeaderLite title="Documents vault" subtitle="Everything about this property, stored privately." />
      <DocumentsVault />
    </div>
  ),
});
