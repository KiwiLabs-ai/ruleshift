import { Radar, Bell, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (prev.current === target) return;
    prev.current = target;
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

interface StatsCardsProps {
  activeSources: number;
  unreadAlerts: number;
  monthChanges: number;
  criticalItems: number;
  loading?: boolean;
}

const cardConfigs = [
  {
    label: "Active Sources",
    icon: Radar,
    borderColor: "border-t-secondary",
    iconBg: "bg-secondary/[0.08]",
    iconText: "text-secondary",
    trend: "↑ 4 added this month",
    trendColor: "text-green-600",
  },
  {
    label: "Unread Alerts",
    icon: Bell,
    borderColor: "border-t-yellow-500",
    iconBg: "bg-yellow-500/[0.08]",
    iconText: "text-yellow-600",
    trend: "↑ 12% from last month",
    trendColor: "text-green-600",
  },
  {
    label: "This Month's Changes",
    icon: FileText,
    borderColor: "border-t-primary",
    iconBg: "bg-primary/[0.08]",
    iconText: "text-primary",
    trend: "3 new this week",
    trendColor: "text-muted-foreground",
  },
  {
    label: "Critical Items",
    icon: AlertTriangle,
    borderColor: "border-t-destructive",
    iconBg: "bg-destructive/[0.08]",
    iconText: "text-destructive",
    trend: "Needs attention",
    trendColor: "text-destructive",
  },
];

function StatCard({ config, value, isCriticalActive }: { config: typeof cardConfigs[0]; value: number; isCriticalActive: boolean }) {
  const display = useCountUp(value);

  return (
    <Card
      className={`border-t-2 ${config.borderColor} transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:bg-surface-elevated ${
        isCriticalActive ? "animate-[critical-glow_3s_ease-in-out_infinite]" : ""
      }`}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${config.iconBg}`}>
          <config.icon className={`h-5 w-5 ${config.iconText}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{display}</p>
          <p className="text-xs text-muted-foreground">{config.label}</p>
          <p className={`text-[11px] mt-0.5 ${config.trendColor}`}>{config.trend}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ activeSources, unreadAlerts, monthChanges, criticalItems, loading }: StatsCardsProps) {
  const values = [activeSources, unreadAlerts, monthChanges, criticalItems];

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardConfigs.map((config, i) => (
        <StatCard
          key={config.label}
          config={config}
          value={values[i]}
          isCriticalActive={config.label === "Critical Items" && criticalItems > 0}
        />
      ))}
    </div>
  );
}
