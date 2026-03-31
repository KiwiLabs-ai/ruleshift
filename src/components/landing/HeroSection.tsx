import { Link } from "react-router-dom";
import { Shield, BarChart3, Lock, FileCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onOpenBrief: () => void;
}

const cards = [
  { icon: <Shield className="h-7 w-7 text-secondary" />, label: "Policies Tracked", value: "142" },
  { icon: <BarChart3 className="h-7 w-7 text-secondary" />, label: "Briefs This Month", value: "23" },
  { icon: <Lock className="h-7 w-7 text-secondary" />, label: "Compliance Score", value: "97%" },
  { icon: <FileCheck className="h-7 w-7 text-secondary" />, label: "Actions Resolved", value: "18" },
];

const cardTransforms = [
  "rotate-0 translate-x-0 translate-y-0 z-40 scale-100",
  "rotate-3 translate-x-4 -translate-y-2 z-30 scale-[0.97]",
  "rotate-6 translate-x-8 -translate-y-4 z-20 scale-[0.94]",
  "rotate-[9deg] translate-x-12 -translate-y-6 z-10 scale-[0.91]",
];

const HeroSection = ({ onOpenBrief }: HeroSectionProps) => {
  return (
    <section className="hero-noise relative min-h-screen gradient-mesh flex items-center overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-32 pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Text */}
          <div className="max-w-xl">
            {/* Urgency Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">Live</span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-[urgency-pulse_2s_ease-in-out_infinite] rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-xs text-primary-foreground/80">3 new policy changes detected this week</span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
              One Missed <span className="text-gradient">Policy Change</span> Could Cost You 4% of Revenue
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-primary-foreground/70">
              16 US states passed new privacy laws this year. Apple, Google, and Meta update platform policies weekly. RuleShift monitors 100+ sources 24/7 and delivers plain-English impact briefs — so you act before deadlines hit.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-teal-light text-base px-8 shadow-[0_0_24px_rgba(42,161,152,0.35)] hover:shadow-[0_0_36px_rgba(42,161,152,0.5)] transition-shadow"
                asChild
              >
                <Link to="/signup">Get Protected in 2 Minutes</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-secondary/50 text-secondary hover:bg-secondary/10 text-base px-8"
                onClick={onOpenBrief}
              >
                See a Real Policy Brief →
              </Button>
            </div>

            {/* Social Proof Logo Bar */}
            <div className="mt-12 animate-[social-fade-in_1s_ease-out_0.5s_both]">
              <p className="text-xs uppercase tracking-widest text-primary-foreground/50">Monitoring policies from</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
                {["Apple", "Google", "Meta", "Amazon", "GDPR", "CCPA", "HIPAA"].map((name, i, arr) => (
                  <span key={name} className="flex items-center gap-1">
                    <span className="font-semibold text-primary-foreground/40 transition hover:text-primary-foreground/70">{name}</span>
                    {i < arr.length - 1 && <span className="text-primary-foreground/20 mx-1">·</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Illustration — fanned card stack */}
          <div className="hidden lg:flex justify-center">
            <div className="relative animate-[hero-float_6s_ease-in-out_infinite]">
              {/* Teal glow */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-glow-teal/20 blur-3xl" />

              <div className="group relative h-96 w-[30rem]">
                {cards.map((card, i) => {
                  // Grid positions for hover state
                  const gridPositions = [
                    "group-hover:translate-x-0 group-hover:translate-y-0",
                    "group-hover:translate-x-[calc(100%+8px)] group-hover:translate-y-0",
                    "group-hover:translate-x-0 group-hover:translate-y-[calc(100%+8px)]",
                    "group-hover:translate-x-[calc(100%+8px)] group-hover:translate-y-[calc(100%+8px)]",
                  ];
                  return (
                    <div
                      key={card.label}
                      className={`absolute top-0 left-0 w-[calc(50%-4px)] h-[calc(50%-4px)] flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-primary-foreground/5 p-4 text-center backdrop-blur-sm shadow-lg transition-all duration-500 ease-out ${cardTransforms[i]} group-hover:rotate-0 group-hover:scale-100 ${gridPositions[i]}`}
                    >
                      {card.icon}
                      <span className="text-3xl font-bold text-primary-foreground">{card.value}</span>
                      <span className="text-xs text-primary-foreground/60">{card.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-[hero-bounce_2s_ease-in-out_infinite]">
        <ChevronDown className="h-6 w-6 text-primary-foreground/40" />
      </div>
    </section>
  );
};

export default HeroSection;
