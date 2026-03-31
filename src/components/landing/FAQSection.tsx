import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What types of policy sources do you monitor?",
    a: "RuleShift monitors 100+ sources including US state privacy laws (CCPA, VCDPA, CPA, and more), federal regulations, GDPR updates, and platform policies from Apple, Google, Meta, Amazon, and other major tech platforms. We also track industry-specific frameworks like HIPAA and PCI-DSS. You can add custom URLs to monitor any public policy page.",
  },
  {
    q: "How quickly will I get notified of a change?",
    a: "Our monitoring engine checks sources every 6-24 hours depending on your plan. When a change is detected, our AI analyzes it and generates an impact brief. Most briefs are delivered within 6-12 hours of the change being published. Enterprise plans include real-time monitoring with under-1-hour delivery.",
  },
  {
    q: "Do I need a compliance team to use RuleShift?",
    a: "Not at all — RuleShift is designed specifically for small and mid-size businesses that don't have dedicated compliance staff. Our briefs are written in plain English, not legal jargon, and include specific action items so anyone on your team can act on them. Most of our customers are ops leaders, product managers, and founders.",
  },
  {
    q: "What happens after my 14-day free trial?",
    a: "Your subscription starts automatically on the plan you selected. A credit card is required to begin your trial, but you won't be charged until the 14 days are up. You can cancel anytime from your dashboard before the trial ends to avoid being charged.",
  },
  {
    q: "Can I monitor custom policy pages that aren't in your library?",
    a: "Yes. In addition to our built-in library of 100+ sources, you can add any public URL as a custom source. Just paste the URL, give it a name, and optionally add a CSS selector to target a specific section of the page. RuleShift will monitor it on your chosen schedule.",
  },
  {
    q: "How is this different from setting up Google Alerts?",
    a: "Google Alerts tells you a page changed — RuleShift tells you what changed, why it matters to your specific business, what you need to do about it, and when the deadline is. Every brief includes severity classification, affected teams, action items, and timelines. It's the difference between a notification and an intelligence brief.",
  },
];

const FAQSection = () => {
  return (
    <section className="bg-background py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="mx-auto mt-14 max-w-3xl">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium text-card-foreground py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
