import { XCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const withoutItems = [
  "You manually check regulatory websites weekly (or forget)",
  "Policy changes are buried in 50-page PDF updates",
  "You find out about a deadline after it passes",
  "Fines, app rejections, and ad suspensions catch you off guard",
  "Your team wastes 10+ hours/month on compliance research",
];

const withItems = [
  "100+ sources monitored automatically, 24/7",
  "AI extracts the exact changes that affect your business",
  "Deadline alerts arrive weeks before action is required",
  "You get step-by-step action items in every brief",
  "Compliance monitoring takes 5 minutes per week",
];

const PainPointsSection = () => {
  return (
    <section id="pain-points" className="bg-muted py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Stop Scrambling. Start Monitoring.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          See how RuleShift replaces hours of manual tracking with automated intelligence.
        </p>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* Without */}
          <Card className="border-none shadow-md">
            <CardHeader className="rounded-t-lg bg-destructive/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-destructive">Without RuleShift</h3>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {withoutItems.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <span className="text-sm text-card-foreground">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* With */}
          <Card className="border-none shadow-xl ring-2 ring-secondary/30 transition-transform duration-300 hover:scale-[1.02]">
            <CardHeader className="rounded-t-lg bg-secondary/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-secondary">With RuleShift</h3>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {withItems.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <span className="text-sm text-card-foreground">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-teal-light text-base px-8" asChild>
            <Link to="/signup">Start Your Free Trial →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PainPointsSection;
