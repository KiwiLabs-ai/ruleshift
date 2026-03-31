import { useState } from "react";
import { Info, X } from "lucide-react";

interface WelcomeBackBannerProps {
  stepKey: string;
}

export function WelcomeBackBanner({ stepKey }: WelcomeBackBannerProps) {
  const navFlag = sessionStorage.getItem(`onboarding_navigated_from_${stepKey}`);
  const [dismissed, setDismissed] = useState(!!navFlag);

  // If the user navigated here naturally (flag was set by previous step), don't show
  if (dismissed || navFlag) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Info className="h-4 w-4 text-secondary shrink-0" />
        <p className="text-sm text-foreground">
          Welcome back! You left off here — pick up where you stopped.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 hover:bg-secondary/10 transition-colors"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

/** Call this when a user clicks Continue to navigate to the next step */
export function markNavigatedFrom(currentStep: number) {
  sessionStorage.setItem(`onboarding_navigated_from_${currentStep + 1}`, "true");
}
