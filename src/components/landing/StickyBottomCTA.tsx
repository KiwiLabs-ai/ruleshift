import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const StickyBottomCTA = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const show = visible && !dismissed;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-primary-foreground/10 bg-primary/95 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] backdrop-blur-md transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-3 sm:flex-row">
        <span className="text-sm font-medium text-primary-foreground">
          🛡️ Monitor 100+ policy sources. Free for 14 days.
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-teal-light" asChild>
            <Link to="/signup">Start Free Trial →</Link>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-primary-foreground/60 transition hover:text-primary-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickyBottomCTA;
