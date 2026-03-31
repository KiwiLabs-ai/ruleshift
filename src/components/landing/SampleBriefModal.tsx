import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ExternalLink, Shield } from "lucide-react";

interface SampleBriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SampleBriefModal = ({ open, onOpenChange }: SampleBriefModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground leading-snug">
                Apple Updates In-App Purchase Requirements for Streaming Apps
              </DialogTitle>
              <DialogDescription className="sr-only">Sample policy change impact brief</DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
                  ⚠️ Important
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Apple App Review Guidelines
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  March 1, 2026
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-2" />

        <div className="space-y-5">
          <BriefSection title="What Changed">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Apple has revised Section 3.1.1 of the App Review Guidelines to require that all streaming
              service apps using external payment links must also offer In-App Purchase as an equal option.
              Previously, apps with court-ordered external payment entitlements could offer external links
              exclusively. The new language requires "equal prominence" for IAP alongside any external
              payment options.
            </p>
          </BriefSection>

          <BriefSection title="Who Is Affected">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mobile streaming apps (video, music, audiobooks) that currently use external payment links
              under the Reader App entitlement. This primarily affects apps in the US market that received
              external link entitlements following the Epic v. Apple rulings.
            </p>
          </BriefSection>

          <BriefSection title="Required Actions">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Review your current payment flow implementation against the new Section 3.1.1 language</li>
              <li>If using external payment links, add IAP as a parallel payment option with equal UI prominence</li>
              <li>Update your payment analytics to track IAP vs external payment split</li>
              <li>Schedule a compliance review with your app review submission at least 2 weeks before the deadline</li>
            </ol>
          </BriefSection>

          <BriefSection title="Deadline">
            <p className="text-sm font-semibold text-destructive">
              April 15, 2026 — Apps must be in compliance for the next review cycle
            </p>
          </BriefSection>

          <BriefSection title="Business Impact">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Non-compliance will result in app rejection during the next review submission. For streaming
              services generating significant subscription revenue through the App Store, this change could
              increase Apple's commission revenue and may require UI/UX redesign of payment flows.
            </p>
          </BriefSection>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BriefSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h4>
    {children}
  </div>
);

export default SampleBriefModal;
