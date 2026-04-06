import { Radar, Brain, Bell, ShieldCheck } from "lucide-react";
import { AnimateOnScroll } from "./AnimateOnScroll";

const steps = [
  {
    icon: Radar,
    num: "01",
    title: "Continuous Monitoring",
    description:
      "Our engine scans 100+ regulatory and platform policy sources every 6 hours. Federal registers, state legislatures, Apple, Google, Meta — all covered.",
  },
  {
    icon: Brain,
    num: "02",
    title: "AI-Powered Analysis",
    description:
      "When a change is detected, AI classifies severity, identifies who's affected, and drafts a structured impact brief with clear action items.",
  },
  {
    icon: Bell,
    num: "03",
    title: "Instant Delivery",
    description:
      "Receive your brief via email or your RuleShift dashboard — within hours, not days.",
  },
  {
    icon: ShieldCheck,
    num: "04",
    title: "Clear Action Items",
    description:
      "Every brief includes what changed, who's affected, what to do, and the deadline. No guesswork.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="bg-background py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          From Policy Change to Action Plan in Hours
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          While you focus on your business, RuleShift works in the background.
        </p>

        <div className="relative mt-16">
          {/* Animated dashed connector line (desktop) */}
          <div className="absolute top-16 left-[12.5%] right-[12.5%] hidden h-0.5 md:block">
            <div className="h-full w-full border-t-2 border-dashed border-secondary/30 animate-[dash-scroll_20s_linear_infinite]" />
          </div>

          <div className="grid gap-12 md:grid-cols-4 md:gap-6">
            {steps.map((s, i) => (
              <AnimateOnScroll key={s.num} variant="fade-up" delay={i * 100}>
              <div className="relative flex flex-col items-center text-center">
                {/* Watermark number */}
                <span className="absolute -top-4 -left-4 select-none text-6xl font-black text-primary/5">
                  {s.num}
                </span>

                <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-110">
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>

        <div className="mt-14 text-center">
          <span className="inline-block rounded-full bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary">
            Average time from policy change to brief delivery: under 12 hours
          </span>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
