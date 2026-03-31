import { ReactNode, CSSProperties } from "react";
import { useScrollAnimate } from "@/hooks/use-scroll-animate";

type Variant = "fade-up" | "fade-left" | "fade-right" | "scale-in";

interface AnimateOnScrollProps {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
}

const hiddenStyles: Record<Variant, CSSProperties> = {
  "fade-up": { opacity: 0, transform: "translateY(24px)" },
  "fade-left": { opacity: 0, transform: "translateX(-24px)" },
  "fade-right": { opacity: 0, transform: "translateX(24px)" },
  "scale-in": { opacity: 0, transform: "scale(0.95)" },
};

const visibleStyle: CSSProperties = {
  opacity: 1,
  transform: "translate(0) scale(1)",
};

export function AnimateOnScroll({
  children,
  variant = "fade-up",
  delay = 0,
  className = "",
}: AnimateOnScrollProps) {
  const { ref, isVisible } = useScrollAnimate();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...(isVisible ? visibleStyle : hiddenStyles[variant]),
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
