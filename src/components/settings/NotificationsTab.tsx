import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPrefs, useUpdateNotificationPrefs, useSubscriptionStatus } from "@/hooks/use-settings-data";
import { useToast } from "@/hooks/use-toast";
import { getTierFromProductId, TIER_FREQUENCY_OPTIONS } from "@/lib/tier-features";
import { Bell, Lock } from "lucide-react";

interface FormSnapshot {
  emailEnabled: boolean;
  digestFrequency: string;
  preferredTime: string;
  preferredDay: string;
  severity: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function NotificationsTab() {
  const { user } = useAuth();
  const { data: prefs, isLoading } = useNotificationPrefs();
  const { data: sub } = useSubscriptionStatus();
  const updatePrefs = useUpdateNotificationPrefs();
  const { toast } = useToast();
  const tier = getTierFromProductId(sub?.product_id);
  const allowedFrequencies = TIER_FREQUENCY_OPTIONS[tier];

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("daily");
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [preferredDay, setPreferredDay] = useState("Monday");
  const [severity, setSeverity] = useState("all");
  const [initial, setInitial] = useState<FormSnapshot | null>(null);

  useEffect(() => {
    if (prefs) {
      const snapshot: FormSnapshot = {
        emailEnabled: prefs.email_enabled,
        digestFrequency: prefs.digest_frequency,
        preferredTime: prefs.preferred_time ?? "09:00",
        preferredDay: prefs.preferred_day
          ? prefs.preferred_day.charAt(0).toUpperCase() + prefs.preferred_day.slice(1)
          : "Monday",
        severity: prefs.severity_threshold,
      };
      setEmailEnabled(snapshot.emailEnabled);
      setDigestFrequency(snapshot.digestFrequency);
      setPreferredTime(snapshot.preferredTime);
      setPreferredDay(snapshot.preferredDay);
      setSeverity(snapshot.severity);
      setInitial(snapshot);
    }
  }, [prefs]);

  const hasChanges = useMemo(() => {
    if (!initial) return false;
    return (
      initial.emailEnabled !== emailEnabled ||
      initial.digestFrequency !== digestFrequency ||
      initial.preferredTime !== preferredTime ||
      initial.preferredDay !== preferredDay ||
      initial.severity !== severity
    );
  }, [initial, emailEnabled, digestFrequency, preferredTime, preferredDay, severity]);

  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const handleSave = async () => {
    try {
      await updatePrefs.mutateAsync({
        email_enabled: emailEnabled,
        digest_frequency: digestFrequency,
        preferred_time: preferredTime,
        preferred_day: digestFrequency === "weekly" ? preferredDay.toLowerCase() : null,
        severity_threshold: severity,
      });
      setInitial({ emailEnabled, digestFrequency, preferredTime, preferredDay, severity });
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
            { value: "realtime", label: "Real-time alerts", tier: "Enterprise" },
            { value: "daily", label: "Daily digest", tier: "Professional" },
            { value: "weekly", label: "Weekly digest", tier: null },
          ].map((opt) => {
            const locked = !allowedFrequencies.includes(opt.value);
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`s-freq-${opt.value}`} disabled={locked} />
                <Label htmlFor={`s-freq-${opt.value}`} className={`font-normal ${locked ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"}`}>
                  {opt.label}
                </Label>
                {locked && opt.tier && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> {opt.tier}+
                  </span>
                )}
              </div>
            );
          })}
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

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={updatePrefs.isPending || !hasChanges}>
          {updatePrefs.isPending ? "Saving…" : "Save Preferences"}
        </Button>
        <Button variant="outline" onClick={handleTestAlert} className="gap-1.5">
          <Bell className="h-4 w-4" /> Send Test Alert
        </Button>
        {hasChanges && (
          <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400">
            Unsaved changes
          </Badge>
        )}
      </div>
    </div>
  );
}
