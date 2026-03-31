import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(0 84% 60%)",
  important: "hsl(45 93% 47%)",
  informational: "hsl(217 91% 60%)",
};

interface TrendViewProps {
  data: any[];
}

export function TrendView({ data }: TrendViewProps) {
  const { monthlyData, sourceData, severityData } = useMemo(() => {
    const monthly: Record<string, { month: string; count: number }> = {};
    const sourceCounts: Record<string, number> = {};
    const sevCounts: Record<string, number> = { critical: 0, important: 0, informational: 0 };

    for (const brief of data) {
      const d = new Date(brief.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!monthly[key]) monthly[key] = { month: label, count: 0 };
      monthly[key].count++;

      sourceCounts[brief.source_name] = (sourceCounts[brief.source_name] ?? 0) + 1;

      const alert = Array.isArray(brief.alerts) ? brief.alerts?.[0] : brief.alerts;
      const sev = alert?.severity ?? "informational";
      sevCounts[sev] = (sevCounts[sev] ?? 0) + 1;
    }

    return {
      monthlyData: Object.values(monthly).slice(-12),
      sourceData: Object.entries(sourceCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      severityData: Object.entries(sevCounts)
        .filter(([, c]) => c > 0)
        .map(([name, value]) => ({ name, value })),
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No trend data available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Changes Detected Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By Severity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {severityData.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? "hsl(var(--muted))"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {severityData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLORS[s.name] }}
                />
                <span className="capitalize">{s.name}</span>
                <span className="text-muted-foreground">({s.value})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Most Active Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sourceData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{s.name}</span>
                <span className="text-muted-foreground font-medium ml-2">{s.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
