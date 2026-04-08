import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Share2, CheckCircle2, Calendar, RefreshCw, FileDown, Loader2 } from "lucide-react";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useBriefDetail } from "@/hooks/use-alerts-data";
import { useBriefActionItems } from "@/hooks/use-brief-actions";
import { useState, useMemo } from "react";
import { differenceInDays } from "date-fns";
import { useOrganizationId } from "@/hooks/use-dashboard-data";
import { supabase } from "@/integrations/supabase/client";
import { apiCall } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const severityBadge: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-destructive/10 text-destructive border-destructive/30", label: "🔴 Critical" },
  important: { className: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "⚠️ Important" },
  informational: { className: "bg-blue-100 text-blue-800 border-blue-300", label: "ℹ️ Informational" },
};

const BriefDetail = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: brief, isLoading } = useBriefDetail(briefId);
  const [_unusedChecked, _setUnusedChecked] = useState<Set<number>>(new Set());
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const queryClient = useQueryClient();
  const { data: orgId } = useOrganizationId();

  const alert = Array.isArray(brief?.alerts) ? brief.alerts[0] : brief?.alerts;
  const orgSourceId = (alert as any)?.org_source_id ?? null;
  const canRegenerate = !!orgSourceId;

  const isActioned = !!(brief as any)?.actioned_at;

  const handleRegenerate = async () => {
    if (!brief || !alert || !canRegenerate) return;
    setIsRegenerating(true);
    try {
      // The backend looks up the latest page_snapshot for this alert's
      // org_source_id and regenerates in place (updates the existing briefs
      // row rather than inserting a new one), so the /briefs/<id> URL the
      // user is currently viewing stays valid.
      const { error } = await apiCall("generate-brief", { alert_id: alert.id });
      if (error) throw new Error(error);
      await queryClient.invalidateQueries({ queryKey: ["brief-detail", briefId] });
      toast({ title: "Brief regenerated", description: "Brief regenerated successfully." });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message || "Could not regenerate brief.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleMarkActioned = async () => {
    if (!briefId) return;
    setIsActioning(true);
    try {
      const { error } = await supabase
        .from("briefs")
        .update({ actioned_at: new Date().toISOString(), actioned_by: user?.id } as any)
        .eq("id", briefId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["brief-detail", briefId] });
      queryClient.invalidateQueries({ queryKey: ["archive-briefs"] });
      queryClient.invalidateQueries({ queryKey: ["alerts-page"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Marked as actioned", description: "This brief has been marked as actioned." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "Could not mark as actioned.", variant: "destructive" });
    } finally {
      setIsActioning(false);
    }
  };

  const handleUndoAction = async () => {
    if (!briefId) return;
    setIsActioning(true);
    try {
      const { error } = await supabase
        .from("briefs")
        .update({ actioned_at: null, actioned_by: null } as any)
        .eq("id", briefId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["brief-detail", briefId] });
      queryClient.invalidateQueries({ queryKey: ["archive-briefs"] });
      queryClient.invalidateQueries({ queryKey: ["alerts-page"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Undo successful", description: "Actioned status has been removed." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "Could not undo action.", variant: "destructive" });
    } finally {
      setIsActioning(false);
    }
  };

  // Parse actions first so we can pass count to the hook
  const content = brief?.content ?? "";
  const sections = useMemo(() => parseContentSections(content), [content]);

  const { completedSet: checkedActions, itemMap, toggle: toggleActionItem } = useBriefActionItems(
    briefId,
    sections.actions.length
  );

  const toggleAction = (idx: number) => {
    if (!user?.id) return;
    toggleActionItem({ actionIndex: idx, completed: !checkedActions.has(idx), userId: user.id });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied", description: "Brief link copied to clipboard." });
  };

  const handleExportPdf = async () => {
    if (!briefId || !orgId) return;
    setIsExportingPdf(true);
    try {
      const { error, rawResponse } = await apiCall("export-brief-pdf", { brief_id: briefId, org_id: orgId }, { raw: true });
      if (error) throw new Error(error);
      if (!rawResponse) throw new Error("No response received");

      const blob = await rawResponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ruleshift-brief-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Brief exported as PDF" });
    } catch (err: any) {
      toast({
        title: "PDF export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!brief) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Brief not found.</p>
          <Button variant="link" onClick={() => navigate("/alerts")}>
            Back to Alerts
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const severity = alert?.severity ?? "informational";
  const badge = severityBadge[severity] ?? severityBadge.informational;

  // content and sections already declared above via useMemo

  const totalActions = sections.actions.length;
  const completedActions = checkedActions.size;

  let deadlineUrgent = false;
  if (sections.deadline) {
    try {
      const deadlineDate = new Date(sections.deadline);
      if (!isNaN(deadlineDate.getTime())) {
        deadlineUrgent = differenceInDays(deadlineDate, new Date()) <= 30;
      }
    } catch {}
  }

  return (
    <DashboardLayout>
      <PageErrorBoundary pageName="BriefDetail">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/alerts")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Alerts
        </Button>

        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl px-6 py-5 border-b border-border">
          <h1 className="text-xl font-bold font-display text-foreground leading-tight">{brief.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge className={badge.className}>{badge.label}</Badge>
            {isActioned && (
              <Badge className="bg-green-100 text-green-800 border-green-300">✓ Actioned</Badge>
            )}
            <span className="text-sm text-muted-foreground">{brief.source_name}</span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">
              {new Date(brief.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>

        {brief.summary && (
          <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2">TL;DR</p>
            <p className="text-sm leading-relaxed text-foreground">{brief.summary}</p>
          </div>
        )}

        <div className="space-y-8">
          {sections.whatChanged && (
            <BriefSection title="What Changed">
              <p className="text-sm text-muted-foreground leading-relaxed">{sections.whatChanged}</p>
            </BriefSection>
          )}

          {sections.whoAffected && (
            <BriefSection title="Who Is Affected">
              <p className="text-sm text-muted-foreground leading-relaxed">{sections.whoAffected}</p>
            </BriefSection>
          )}

          {totalActions > 0 && (
            <BriefSection title="Required Actions">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    {completedActions} of {totalActions} actions completed
                  </span>
                  <span className="text-xs font-medium text-secondary">
                    {totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-300"
                    style={{ width: `${totalActions > 0 ? (completedActions / totalActions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <ol className="space-y-2">
                {sections.actions.map((action, idx) => {
                  const item = itemMap.get(idx);
                  const isChecked = checkedActions.has(idx);
                  return (
                    <li key={idx} className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleAction(idx)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${isChecked ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                          {action}
                        </span>
                        {isChecked && item?.completed_at && (
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                            Completed {new Date(item.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </BriefSection>
          )}

          {sections.deadline && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground border-l-[3px] border-secondary pl-3 flex items-center gap-2">
                Deadline
                {deadlineUrgent && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[9px] px-1.5 py-0">URGENT</Badge>
                )}
              </h4>
              <div className="flex items-center gap-2 pl-4">
                <Calendar className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">{sections.deadline}</p>
              </div>
            </div>
          )}

          {sections.impact && (
            <BriefSection title="Business Impact">
              <p className="text-sm text-muted-foreground leading-relaxed">{sections.impact}</p>
            </BriefSection>
          )}
        </div>

        {!sections.whatChanged && !sections.whoAffected && sections.actions.length === 0 && content && (
          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-sm prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-sm prose-li:text-muted-foreground prose-strong:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {isExportingPdf ? "Exporting…" : "Download PDF"}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleRegenerate}
                    disabled={!canRegenerate || isRegenerating}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                    {isRegenerating ? "Regenerating…" : "Regenerate Brief"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canRegenerate && (
                <TooltipContent>
                  <p>Regeneration not available for this brief.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {isActioned ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Actioned {(brief as any).actioned_at ? new Date((brief as any).actioned_at).toLocaleDateString() : ""}
              </Badge>
              <button
                onClick={handleUndoAction}
                disabled={isActioning}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Undo
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleMarkActioned}
              disabled={isActioning}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isActioning ? "Saving…" : "Mark as Actioned"}
            </Button>
          )}
        </div>
      </div>
      </PageErrorBoundary>
    </DashboardLayout>
  );
};

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-foreground border-l-[3px] border-secondary pl-3">{title}</h4>
      {children}
    </div>
  );
}

function parseContentSections(content: string) {
  const result = {
    whatChanged: "",
    whoAffected: "",
    actions: [] as string[],
    deadline: "",
    impact: "",
  };

  if (!content) return result;

  const sectionMap: Record<string, keyof typeof result> = {
    "what changed": "whatChanged",
    "who is affected": "whoAffected",
    "required actions": "actions" as any,
    "deadline": "deadline",
    "business impact": "impact",
  };

  const lines = content.split("\n");
  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase().replace(/[:#*]/g, "").trim();

    if (sectionMap[lower]) {
      currentSection = lower;
      continue;
    }

    if (currentSection && trimmed) {
      const key = sectionMap[currentSection];
      if (key === ("actions" as any)) {
        const cleaned = trimmed.replace(/^[\d.\-*]+\s*/, "");
        if (cleaned) result.actions.push(cleaned);
      } else if (key) {
        (result as any)[key] += ((result as any)[key] ? "\n" : "") + trimmed;
      }
    }
  }

  return result;
}

export default BriefDetail;
