import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import { WelcomeBackBanner, markNavigatedFrom } from "@/components/onboarding/WelcomeBackBanner";
import { useOnboardingGuard } from "@/hooks/use-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const industries = [
  "Mobile App Publishing",
  "Fintech & Financial Services",
  "Healthcare",
  "Marketing Agency",
  "E-commerce",
  "Legal Services",
  "Other",
];

const companySizes = ["1-10", "11-50", "51-200", "200+"];

const CompanyStep = () => {
  const { profile, loading, user } = useOnboardingGuard();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [concern, setConcern] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingOrgId, setExistingOrgId] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Pre-fill if org already exists
  useEffect(() => {
    if (!loading && profile) {
      if (profile.onboarding_step > 1 && profile.organization_id) {
        // Returning user — fetch existing org data
        setIsReturning(true);
        supabase
          .from("organizations")
          .select("id, name, industry, company_size, compliance_concern")
          .eq("id", profile.organization_id)
          .single()
          .then(({ data }) => {
            if (data) {
              setExistingOrgId(data.id);
              setCompanyName(data.name);
              setIndustry(data.industry);
              setCompanySize(data.company_size);
              setConcern(data.compliance_concern ?? "");
              setPrefilled(true);
            }
          });
      } else if (profile.onboarding_step > 1 && !profile.organization_id) {
        navigate("/onboarding/sources", { replace: true });
      }
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!companyName.trim() || !industry || !companySize) {
      toast({ variant: "destructive", title: "Please fill all required fields." });
      return;
    }
    setSubmitting(true);

    const orgPayload = {
      name: companyName.trim(),
      industry,
      company_size: companySize,
      compliance_concern: concern.trim() || null,
      created_by: user!.id,
    };

    let orgId = existingOrgId;

    if (existingOrgId) {
      // Update existing org
      const { error } = await supabase
        .from("organizations")
        .update(orgPayload)
        .eq("id", existingOrgId);
      if (error) {
        toast({ variant: "destructive", title: "Error updating organization", description: error.message });
        setSubmitting(false);
        return;
      }
    } else {
      // Create new org
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert(orgPayload)
        .select()
        .single();
      if (orgError) {
        toast({ variant: "destructive", title: "Error creating organization", description: orgError.message });
        setSubmitting(false);
        return;
      }
      orgId = org.id;
    }

    // Update profile
    await supabase
      .from("profiles")
      .update({ organization_id: orgId, onboarding_step: 2 })
      .eq("user_id", user!.id);

    markNavigatedFrom(1);
    setSubmitting(false);
    navigate("/onboarding/sources");
  };

  return (
    <div className="mx-auto max-w-lg">
      <OnboardingStepper currentStep={1} />
      <div className="rounded-2xl bg-card p-8 shadow-md">
        {isReturning && <WelcomeBackBanner stepKey="1" />}

        <h2 className="text-2xl font-bold text-card-foreground">Tell us about your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">This helps us customize your monitoring setup.</p>

        <div className="mt-6 space-y-5">
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
          </div>

          <div>
            <Label>Industry *</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
              <SelectContent>
                {industries.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Company Size *</Label>
            <RadioGroup value={companySize} onValueChange={setCompanySize} className="mt-2 flex flex-wrap gap-3">
              {companySizes.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <RadioGroupItem value={s} id={`size-${s}`} />
                  <Label htmlFor={`size-${s}`} className="cursor-pointer font-normal">{s} employees</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="concern">What's your primary compliance concern?</Label>
            <Textarea
              id="concern"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              placeholder="e.g., Tracking Apple App Store policy changes for our mobile apps"
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light">
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanyStep;
