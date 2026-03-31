import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import { WelcomeBackBanner, markNavigatedFrom } from "@/components/onboarding/WelcomeBackBanner";
import { useOnboardingGuard } from "@/hooks/use-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const NotificationsStep = () => {
  const { profile, loading, user } = useOnboardingGuard();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [digestFrequency, setDigestFrequency] = useState("daily");
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [preferredDay, setPreferredDay] = useState("Monday");
  const [severity, setSeverity] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [existingPrefsId, setExistingPrefsId] = useState<string | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    if (!loading && profile) {
      if (profile.onboarding_step < 3) {
        navigate("/onboarding/company", { replace: true });
        return;
      }
      if (profile.onboarding_step > 3) {
        setIsReturning(true);
      }
      fetchExistingPrefs();
    }
  }, [loading, profile, navigate]);

  const fetchExistingPrefs = async () => {
    if (!user) { setLoadingPrefs(false); return; }
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setExistingPrefsId(data.id);
      setEmailEnabled(data.email_enabled);
      setSlackEnabled(data.slack_enabled);
      setSlackWebhook(data.slack_webhook_url ?? "");
      setDigestFrequency(data.digest_frequency);
      setPreferredTime(data.preferred_time ?? "09:00");
      setPreferredDay(data.preferred_day ? data.preferred_day.charAt(0).toUpperCase() + data.preferred_day.slice(1) : "Monday");
      setSeverity(data.severity_threshold);
      if (!isReturning) setIsReturning(true);
    }
    setLoadingPrefs(false);
  };

  if (loading || loadingPrefs) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);

    const payload = {
      user_id: user!.id,
      email_enabled: emailEnabled,
      slack_enabled: slackEnabled,
      slack_webhook_url: slackEnabled ? slackWebhook.trim() || null : null,
      digest_frequency: digestFrequency,
      preferred_time: preferredTime,
      preferred_day: digestFrequency === "weekly" ? preferredDay.toLowerCase() : null,
      severity_threshold: severity,
    };

    let error;
    if (existingPrefsId) {
      // Update existing
      const result = await supabase
        .from("notification_preferences")
        .update(payload)
        .eq("id", existingPrefsId);
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from("notification_preferences")
        .insert(payload);
      error = result.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error saving preferences", description: error.message });
      setSubmitting(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ onboarding_step: 4 })
      .eq("user_id", user!.id);

    markNavigatedFrom(3);
    setSubmitting(false);
    navigate("/onboarding/plan");
  };

  return (
    <div className="mx-auto max-w-lg">
      <OnboardingStepper currentStep={3} />
      <div className="rounded-2xl bg-card p-8 shadow-md">
        {isReturning && <WelcomeBackBanner stepKey="3" />}

        <h2 className="text-2xl font-bold text-card-foreground">How should we reach you?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure your alert channels and preferences.</p>

        <div className="mt-6 space-y-6">
          {/* Alert Channels */}
          <div>
            <h3 className="font-semibold text-card-foreground">Alert Channels</h3>
            <div className="mt-3 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email</Label>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Slack</Label>
                  <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
                </div>
                {slackEnabled && (
                  <div className="mt-2">
                    <Input
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-secondary hover:underline">
                      How to set up a Slack webhook →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Digest Frequency */}
          <div>
            <h3 className="font-semibold text-card-foreground">Digest Frequency</h3>
            <RadioGroup value={digestFrequency} onValueChange={setDigestFrequency} className="mt-3 space-y-2">
              {[
                { value: "realtime", label: "Real-time alerts" },
                { value: "daily", label: "Daily digest" },
                { value: "weekly", label: "Weekly digest" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} />
                  <Label htmlFor={`freq-${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>

            {(digestFrequency === "daily" || digestFrequency === "weekly") && (
              <div className="mt-3 flex gap-3">
                {digestFrequency === "weekly" && (
                  <Select value={preferredDay} onValueChange={setPreferredDay}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-32"
                />
              </div>
            )}
          </div>

          {/* Severity Threshold */}
          <div>
            <h3 className="font-semibold text-card-foreground">Severity Threshold</h3>
            <RadioGroup value={severity} onValueChange={setSeverity} className="mt-3 space-y-3">
              {[
                { value: "all", label: "All changes", desc: "Get notified about every policy update, no matter how small." },
                { value: "important", label: "Important + Critical only", desc: "Skip informational — only changes that may require action." },
                { value: "critical", label: "Critical only", desc: "Only urgent changes with compliance deadlines or enforcement risk." },
              ].map((opt) => (
                <div key={opt.value} className="flex items-start gap-2">
                  <RadioGroupItem value={opt.value} id={`sev-${opt.value}`} className="mt-1" />
                  <div>
                    <Label htmlFor={`sev-${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light">
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsStep;
