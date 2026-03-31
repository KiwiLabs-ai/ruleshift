import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import PainPointsSection from "@/components/landing/PainPointsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import BriefPreviewSection from "@/components/landing/BriefPreviewSection";

import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import SampleBriefModal from "@/components/landing/SampleBriefModal";
import Footer from "@/components/landing/Footer";
import StickyBottomCTA from "@/components/landing/StickyBottomCTA";
import SectionDivider from "@/components/landing/SectionDivider";
import { AnimateOnScroll } from "@/components/landing/AnimateOnScroll";

const Index = () => {
  const [briefOpen, setBriefOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection onOpenBrief={() => setBriefOpen(true)} />
      <SectionDivider />
      <AnimateOnScroll variant="fade-up">
        <PainPointsSection />
      </AnimateOnScroll>
      <SectionDivider />
      <HowItWorksSection />
      <SectionDivider />
      <AnimateOnScroll variant="scale-in">
        <BriefPreviewSection />
      </AnimateOnScroll>
      <SectionDivider />
      <AnimateOnScroll variant="fade-up">
        <PricingSection />
      </AnimateOnScroll>
      <SectionDivider />
      <AnimateOnScroll variant="fade-up">
        <FAQSection />
      </AnimateOnScroll>
      <Footer />
      <SampleBriefModal open={briefOpen} onOpenChange={setBriefOpen} />
      <StickyBottomCTA />
    </div>
  );
};

export default Index;
