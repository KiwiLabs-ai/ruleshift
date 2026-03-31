import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "ruleshift_cookie_consent";

export function hasConsentedToCookies(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const handleChoice = (choice: "accepted" | "declined") => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] animate-[slide-up_400ms_ease-out_both] p-4">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-2xl border border-white/10 bg-card/90 px-6 py-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          We use cookies to provide our service and improve your experience. See our{" "}
          <Link to="/privacy" className="text-secondary hover:underline font-medium">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleChoice("declined")}
          >
            Decline
          </Button>
          <Button
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => handleChoice("accepted")}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
