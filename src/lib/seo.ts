export const meta = (title: string, description: string) => ({
  meta: [
    { title: `${title} · HouseKey` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · HouseKey` },
    { property: "og:description", content: description },
  ],
});

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : "—";
