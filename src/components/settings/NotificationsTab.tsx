import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/hooks/use-settings-data";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function NotificationsTab() {
  const { user } = useAuth();
  const { data: prefs, isLoading } = useNotificationPrefs();
  const updatePrefs = useUpdateNotificationPrefs();
  const { toast } = useToast();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("daily");
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [preferredDay, setPreferredDay] = useState("Monday");
  const [severity, setSeverity] = useState("all");

  useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.email_enabled);
      setDigestFrequency(prefs.digest_frequency);
      setPreferredTime(prefs.preferred_time ?? "09:00");
      setPreferredDay(prefs.preferred_day ? prefs.preferred_day.charAt(0).toUpperCase() + prefs.preferred_day.slice(1) : "Monday");
      setSeverity(prefs.severity_threshold);
    }
  }, [prefs]);

  const handleSave = async () => {
    try {
      await updatePrefs.mutateAsync({
        email_enabled: emailEnabled,
        digest_frequency: digestFrequency,
        preferred_time: preferredTime,
        preferred_day: digestFrequency === "weekly" ? preferredDay.toLowerCase() : null,
        severity_threshold: severity,
      });
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Error saving preferences", variant: "destructive" });
    }
  };

  const handleTestAlert = () => {
    toast({
      title: "🔔 Test Alert",
      description: "This is a sample alert to verify your notification setup.",
    });
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Alert Channels */}
      <div>
        <h3 className="font-semibold text-foreground">Alert Channels</h3>
        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email</Label>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </div>
      </div>

      {/* Digest Frequency */}
      <div>
        <h3 className="font-semibold text-foreground">Digest Frequency</h3>
        <RadioGroup value={digestFrequency} onValueChange={setDigestFrequency} className="mt-3 space-y-2">
          {[
            { value: "realtime", label: "Real-time alerts" },
            { value: "daily", label: "Daily digest" },
            { value: "weekly", label: "Weekly digest" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={`s-freq-${opt.value}`} />
              <Label htmlFor={`s-freq-${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>

        {(digestFrequency === "daily" || digestFrequency === "weekly") && (
          <div className="mt-3 flex gap-3">
            {digestFrequency === "weekly" && (
              <Select value={preferredDay} onValueChange={setPreferredDay}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="w-32" />
          </div>
        )}
      </div>

      {/* Severity Threshold */}
      <div>
        <h3 className="font-semibold text-foreground">Severity Threshold</h3>
        <RadioGroup value={severity} onValueChange={setSeverity} className="mt-3 space-y-3">
          {[
            { value: "all", label: "All changes", desc: "Every policy update." },
            { value: "important", label: "Important + Critical", desc: "Only changes that may require action." },
            { value: "critical", label: "Critical only", desc: "Urgent changes with deadlines or enforcement risk." },
          ].map((opt) => (
            <div key={opt.value} className="flex items-start gap-2">
              <RadioGroupItem value={opt.value} id={`s-sev-${opt.value}`} className="mt-1" />
              <div>
                <Label htmlFor={`s-sev-${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={updatePrefs.isPending}>
          {updatePrefs.isPending ? "Saving…" : "Save Preferences"}
        </Button>
        <Button variant="outline" onClick={handleTestAlert} className="gap-1.5">
          <Bell className="h-4 w-4" /> Send Test Alert
        </Button>
      </div>
    </div>
  );
}
