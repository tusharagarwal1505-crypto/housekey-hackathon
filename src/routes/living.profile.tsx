import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { meta } from "@/lib/seo";
import { Avatar, PageHeaderLite, Panel } from "@/components/hk/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/living/profile")({
  head: () => meta("Profile", "Your name and contact details."),
  component: () => (
    <div className="space-y-6">
      <PageHeaderLite title="Profile" />
      <ProfileForm />
    </div>
  ),
});

export function ProfileForm() {
  const { viewer, mode, refresh } = useWorkspace();
  const [name, setName] = useState(viewer?.name ?? "");
  const [phone, setPhone] = useState("");
  const save = async () => {
    if (!name.trim()) return toast.error("Name can't be empty.");
    if (mode === "live") {
      const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone || null }).eq("id", viewer!.userId);
      if (error) return toast.error(error.message);
      refresh();
    }
    toast.success(mode === "demo" ? "Saved (demo profiles reset on refresh)" : "Profile saved");
  };
  return (
    <Panel title="Your details">
      <div className="mb-5 flex items-center gap-4"><Avatar name={name || "?"} className="h-14 w-14 text-xl" /><div><div className="font-medium">{viewer?.email}</div><div className="text-xs text-muted-foreground">Roles: {viewer?.roles.join(", ")}</div></div></div>
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+353" /></div>
        <Button onClick={save}>Save</Button>
      </div>
    </Panel>
  );
}
