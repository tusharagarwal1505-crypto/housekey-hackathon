import { createFileRoute, redirect } from "@tanstack/react-router";

// Old v1 addresses (/app/*) now live in the tenant app.
const MAP: Record<string, string> = {
  "": "/living",
  bills: "/living/bills",
  deposit: "/living/money",
  settlement: "/living/tenancy",
  transactions: "/living/activity",
  housemates: "/living/housemates",
  house: "/living",
  assistant: "/living/assistant",
  settings: "/living/profile",
};

export const Route = createFileRoute("/app/$")({
  beforeLoad: ({ params }) => {
    const key = (params._splat ?? "").split("/")[0];
    throw redirect({ href: MAP[key] ?? "/living", statusCode: 301 });
  },
});
