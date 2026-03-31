import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileData, useUpdateProfile } from "@/hooks/use-settings-data";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

export function ProfileTab() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfileData();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ full_name: fullName });
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Error saving profile", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <div className="flex items-center gap-2">
          <Input value={user?.email ?? ""} disabled className="opacity-70" />
          <Badge variant="outline" className="shrink-0 gap-1 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Input value="Owner" disabled className="opacity-70" />
      </div>

      <Button onClick={handleSave} disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
