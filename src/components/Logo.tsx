import iconSrc from "@/assets/ruleshift-icon.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const iconSizes = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
};

const textSizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

const Logo = ({ className = "", size = "md", showText = true }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={iconSrc} alt="RuleShift" className={`${iconSizes[size]} w-auto`} />
      {showText && (
        <span className={`font-bold ${textSizes[size]}`}>
          RuleShift
        </span>
      )}
    </div>
  );
};

export default Logo;
