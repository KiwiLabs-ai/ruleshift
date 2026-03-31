import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnimateOnScroll } from "./AnimateOnScroll";

const testimonials = [
  {
    quote:
      "We got hit with an App Store rejection because we missed a policy update buried in Apple's guidelines. That would never happen now — RuleShift flagged the exact change two weeks before our submission.",
    name: "Sarah Chen",
    title: "Head of Product, StreamFlow",
    initials: "SC",
    avatarClass: "bg-secondary text-secondary-foreground",
  },
  {
    quote:
      "Our legal team used to spend 15+ hours a month just tracking regulatory changes across states. RuleShift cut that to under an hour. The briefs are better than what we were producing manually.",
    name: "Marcus Rivera",
    title: "General Counsel, DataBridge Analytics",
    initials: "MR",
    avatarClass: "bg-primary text-primary-foreground",
  },
  {
    quote:
      "The CCPA amendment brief arrived in my inbox the morning after it was published. It had a clear deadline, a list of what to change, and who on our team needed to act. Exactly what I needed.",
    name: "Priya Patel",
    title: "VP Operations, AdScale",
    initials: "PP",
    avatarClass: "bg-secondary text-secondary-foreground",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-background py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Trusted by Compliance-Conscious Teams
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          See why growing businesses rely on RuleShift to stay ahead of regulatory risk.
        </p>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={t.name} variant="fade-up" delay={i * 100}>
            <Card
              key={t.name}
              className="border-none bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <CardContent className="flex flex-col p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                  <Quote className="h-5 w-5 text-secondary" />
                </div>
                <p className="flex-1 text-sm italic leading-relaxed text-card-foreground">
                  "{t.quote}"
                </p>
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${t.avatarClass}`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </AnimateOnScroll>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Join <span className="font-medium">100+</span> businesses monitoring policy changes with RuleShift
        </p>
      </div>
    </section>
  );
};

export default TestimonialsSection;
