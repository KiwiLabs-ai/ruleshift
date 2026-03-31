import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const stepLabels = ["Company", "Sources", "Notifications", "Plan"];

interface OnboardingStepperProps {
  currentStep: number;
}

const OnboardingStepper = ({ currentStep }: OnboardingStepperProps) => {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-center gap-0">
        {stepLabels.map((label, i) => {
          const step = i + 1;
          const isComplete = currentStep > step;
          const isCurrent = currentStep === step;

          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    isComplete && "bg-secondary text-secondary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-5 w-5" /> : step}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-12 sm:w-20 rounded-full transition-colors",
                    currentStep > step ? "bg-secondary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingStepper;
