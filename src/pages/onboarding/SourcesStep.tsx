import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import { WelcomeBackBanner, markNavigatedFrom } from "@/components/onboarding/WelcomeBackBanner";
import { useOnboardingGuard } from "@/hooks/use-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, ChevronDown, Sparkles, ArrowDown, AlertTriangle } from "lucide-react";

interface CustomSource {
  url: string;
  name: string;
  selector: string;
}

const PLAN_SOURCE_LIMIT = 25; // Professional plan default for onboarding guidance

const SourcesStep = () => {
  const { profile, loading, user } = useOnboardingGuard();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [industryTemplates, setIndustryTemplates] = useState<any[]>([]);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [orgIndustry, setOrgIndustry] = useState("");
  const [orgConcern, setOrgConcern] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);
  const [existingSourceIds, setExistingSourceIds] = useState<Set<string>>(new Set());
  const [existingCustomSources, setExistingCustomSources] = useState<CustomSource[]>([]);
  const [customUrl, setCustomUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSelector, setCustomSelector] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [customUrlsOpen, setCustomUrlsOpen] = useState(false);

  useEffect(() => {
    if (!loading && profile) {
      if (profile.onboarding_step < 2) {
        navigate("/onboarding/company", { replace: true });
        return;
      }
      if (profile.onboarding_step > 2) {
        setIsReturning(true);
      }
      fetchData();
    }
  }, [loading, profile]);

  const fetchData = async () => {
    if (!profile) return;
    const orgId = profile.organization_id;

    const { data: org } = await supabase
      .from("organizations")
      .select("industry, compliance_concern")
      .eq("id", orgId)
      .single();
    const industry = org?.industry || "Other";
    setOrgIndustry(industry);
    setOrgConcern(org?.compliance_concern || "");

    const { data: templateData } = await supabase.from("watchlist_templates").select("*");
    const all = templateData || [];
    setAllTemplates(all);

    const filtered = all.filter((t: any) => t.industries.includes(industry));
    setIndustryTemplates(filtered);

    // If no industry templates, auto-expand custom URLs
    if (filtered.length === 0 && all.length === 0) {
      setCustomUrlsOpen(true);
    }

    // Fetch existing sources for pre-selection
    const { data: existingSources } = await supabase
      .from("organization_sources")
      .select("source_id, is_custom, custom_url, custom_name, custom_selector")
      .eq("organization_id", orgId);

    if (existingSources && existingSources.length > 0) {
      const existingIds = new Set(
        existingSources.filter((s: any) => s.source_id).map((s: any) => s.source_id)
      );
      setExistingSourceIds(existingIds);

      // Auto-select from both industry and all templates
      const autoSelected = all
        .filter((t: any) => t.source_ids.some((id: string) => existingIds.has(id)))
        .map((t: any) => t.id);
      setSelectedTemplateIds(autoSelected);

      const customs = existingSources
        .filter((s: any) => s.is_custom)
        .map((s: any) => ({
          url: s.custom_url || "",
          name: s.custom_name || "",
          selector: s.custom_selector || "",
        }));
      setExistingCustomSources(customs);
      setCustomSources(customs);

      if (!isReturning) setIsReturning(true);
    }

    setLoadingData(false);
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const addCustomSource = () => {
    if (!customUrl.trim()) return;
    setCustomSources((prev) => [
      ...prev,
      { url: customUrl.trim(), name: customName.trim(), selector: customSelector.trim() },
    ]);
    setCustomUrl("");
    setCustomName("");
    setCustomSelector("");
  };

  const removeCustomSource = (index: number) => {
    setCustomSources((prev) => prev.filter((_, i) => i !== index));
  };

  // Compute total unique sources
  const allSourceIds = useMemo(() => {
    const ids = new Set<string>();
    const combined = [...industryTemplates, ...allTemplates];
    combined
      .filter((t) => selectedTemplateIds.includes(t.id))
      .forEach((t) => t.source_ids.forEach((id: string) => ids.add(id)));
    return ids;
  }, [selectedTemplateIds, industryTemplates, allTemplates]);

  const totalSources = allSourceIds.size + customSources.length;

  // Other-industry templates (not in the industry-filtered list)
  const otherTemplates = useMemo(() => {
    const industryIds = new Set(industryTemplates.map((t) => t.id));
    return allTemplates.filter((t) => !industryIds.has(t.id));
  }, [allTemplates, industryTemplates]);

  // Group other templates by their first industry
  const groupedOtherTemplates = useMemo(() => {
    const groups: Record<string, any[]> = {};
    otherTemplates.forEach((t) => {
      const label = t.industries?.[0] || "General";
      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    });
    return groups;
  }, [otherTemplates]);

  // Recommendation
  const recommendation = useMemo(() => {
    if (industryTemplates.length === 0) return null;
    // Try to match concern keywords to template name/description
    if (orgConcern) {
      const concernLower = orgConcern.toLowerCase();
      const match = industryTemplates.find(
        (t: any) =>
          t.name.toLowerCase().includes(concernLower.split(" ")[0]) ||
          (t.description || "").toLowerCase().includes(concernLower.split(" ")[0])
      );
      if (match) return match;
    }
    // Default to first industry template
    return industryTemplates[0];
  }, [industryTemplates, orgConcern]);

  const handleSubmit = async () => {
    if (totalSources === 0) {
      toast({ variant: "destructive", title: "Please select at least one source." });
      return;
    }
    setSubmitting(true);

    const orgId = profile!.organization_id;

    if (existingSourceIds.size > 0 || existingCustomSources.length > 0) {
      await supabase
        .from("organization_sources")
        .delete()
        .eq("organization_id", orgId);
    }

    const templateInserts = Array.from(allSourceIds).map((sourceId) => ({
      organization_id: orgId,
      source_id: sourceId,
      is_custom: false,
    }));

    const customInserts = customSources.map((s) => ({
      organization_id: orgId,
      custom_url: s.url,
      custom_name: s.name || null,
      custom_selector: s.selector || null,
      is_custom: true,
    }));

    const allInserts = [...templateInserts, ...customInserts];

    if (allInserts.length > 0) {
      const { error } = await supabase.from("organization_sources").insert(allInserts);
      if (error) {
        toast({ variant: "destructive", title: "Error saving sources", description: error.message });
        setSubmitting(false);
        return;
      }
    }

    await supabase
      .from("profiles")
      .update({ onboarding_step: 3 })
      .eq("user_id", user!.id);

    markNavigatedFrom(2);
    setSubmitting(false);
    navigate("/onboarding/notifications");
  };

  const renderTemplateCard = (t: any) => (
    <Card
      key={t.id}
      className={`cursor-pointer transition-all ${
        selectedTemplateIds.includes(t.id)
          ? "ring-2 ring-secondary border-secondary"
          : "hover:shadow-md"
      }`}
      onClick={() => toggleTemplate(t.id)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selectedTemplateIds.includes(t.id)}
            onCheckedChange={() => toggleTemplate(t.id)}
            className="mt-1"
          />
          <div>
            <h3 className="font-semibold text-card-foreground">{t.name}</h3>
            <p className="text-xs text-muted-foreground">{t.source_count} sources</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {t.key_sources.map((s: string) => (
                <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading || loadingData) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const noTemplatesAtAll = allTemplates.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <OnboardingStepper currentStep={2} />
      <div className="rounded-2xl bg-card p-8 shadow-md">
        {isReturning && <WelcomeBackBanner stepKey="2" />}

        <h2 className="text-2xl font-bold text-card-foreground">What should we monitor for you?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select pre-built watchlist templates or add custom URLs.
        </p>

        {/* Recommendation banner */}
        {recommendation && !selectedTemplateIds.includes(recommendation.id) && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3">
            <Sparkles className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="text-foreground">
                Based on your industry ({orgIndustry})
                {orgConcern ? ` and concern about ${orgConcern}` : ""}, we recommend the{" "}
              </span>
              <button
                onClick={() => toggleTemplate(recommendation.id)}
                className="font-semibold text-secondary hover:underline"
              >
                {recommendation.name}
              </button>
              <span className="text-foreground"> template.</span>
            </div>
          </div>
        )}

        {/* No templates empty state */}
        {noTemplatesAtAll ? (
          <div className="mt-6 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No pre-built templates available yet. Add custom policy URLs below to get started.
            </p>
            <ArrowDown className="mx-auto mt-3 h-5 w-5 text-muted-foreground/40 animate-bounce" />
          </div>
        ) : (
          <>
            {/* Industry-matched templates */}
            {industryTemplates.length > 0 && (
              <>
                <p className="mt-6 mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Recommended for {orgIndustry}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {industryTemplates.map(renderTemplateCard)}
                </div>
              </>
            )}

            {industryTemplates.length === 0 && (
              <div className="mt-6 rounded-lg border border-dashed border-muted-foreground/20 p-5 text-center text-sm text-muted-foreground">
                No templates specifically for {orgIndustry} yet. Browse templates from other industries below, or add custom URLs.
              </div>
            )}

            {/* Browse all templates */}
            {otherTemplates.length > 0 && (
              <Collapsible
                open={showAllTemplates || industryTemplates.length === 0}
                onOpenChange={setShowAllTemplates}
                className="mt-5"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-sm text-muted-foreground w-full justify-center">
                    More templates from other industries
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAllTemplates || industryTemplates.length === 0 ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-5">
                  {Object.entries(groupedOtherTemplates).map(([industry, templates]) => (
                    <div key={industry}>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {industry}
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {templates.map(renderTemplateCard)}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}

        {/* Custom sources */}
        <Collapsible
          open={customUrlsOpen || noTemplatesAtAll}
          onOpenChange={setCustomUrlsOpen}
          className="mt-6"
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 text-sm text-muted-foreground">
              <Plus className="h-4 w-4" /> Add Custom URLs <ChevronDown className={`h-4 w-4 transition-transform ${customUrlsOpen || noTemplatesAtAll ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/policy"
                className="flex-1"
              />
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name (optional)"
                className="w-40"
              />
              <Button size="sm" onClick={addCustomSource} disabled={!customUrl.trim()}>
                Add
              </Button>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:underline">
                Advanced: CSS selector
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Input
                  value={customSelector}
                  onChange={(e) => setCustomSelector(e.target.value)}
                  placeholder=".policy-content"
                  className="w-full"
                />
              </CollapsibleContent>
            </Collapsible>

            {customSources.length > 0 && (
              <div className="space-y-2">
                {customSources.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded bg-muted px-3 py-2 text-sm">
                    <span className="flex-1 truncate">{s.name || s.url}</span>
                    <button onClick={() => removeCustomSource(i)}>
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Source count + plan limit warning */}
        <div className="mt-6 space-y-2">
          <div className="rounded-lg bg-muted p-3 text-center text-sm font-medium text-foreground">
            You're monitoring <span className="text-secondary font-bold">{totalSources}</span> sources
          </div>

          {totalSources > PLAN_SOURCE_LIMIT && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-700 dark:bg-amber-950/40">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-amber-900 dark:text-amber-200">
                You've selected <strong>{totalSources}</strong> sources. The Professional plan includes up to {PLAN_SOURCE_LIMIT}. You may need to upgrade or reduce your selection.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 w-full bg-secondary text-secondary-foreground hover:bg-teal-light"
        >
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
};

export default SourcesStep;
