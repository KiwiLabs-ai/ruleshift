import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeekBucket } from "@/hooks/use-activity-chart";

interface DashboardActivityChartProps {
  data: WeekBucket[] | undefined;
  loading: boolean;
}

export function DashboardActivityChart({ data, loading }: DashboardActivityChartProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.some((d) => d.critical + d.important + d.informational > 0);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Activity — Last 8 Weeks</h3>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[220px] text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No activity yet — your first scan results will appear here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar dataKey="critical" name="Critical" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="important" name="Important" stackId="a" fill="hsl(45 93% 47%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="informational" name="Informational" stackId="a" fill="hsl(var(--secondary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
