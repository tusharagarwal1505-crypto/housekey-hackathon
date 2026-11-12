import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/lib/seo";
import { PageHeaderLite } from "@/components/hk/kit";
import { DocumentsVault } from "@/components/hk/features";

export const Route = createFileRoute("/living/documents")({
  head: () => meta("Documents", "Your lease, inspection reports and receipts."),
  component: () => (
    <div className="space-y-6">
      <PageHeaderLite title="Documents" subtitle="Leases, inspections, certificates and receipts." />
      <DocumentsVault />
    </div>
  ),
});
