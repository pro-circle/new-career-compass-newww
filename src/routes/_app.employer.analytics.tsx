import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/routes/_app";
import { SectionCard, StatTile } from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/employer/analytics")({
  head: () => ({ meta: [{ title: "Analytics · ATS Engine" }] }),
  component: Analytics,
});

function Analytics() {
  const { analyticsMetrics, funnel: funnelData, trend: hiringTrend } = useDataset();
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Recruitment intelligence"
        title="Hiring analytics"
        subtitle="Track applications, hiring metrics, and pipeline trends."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsMetrics.map((m) => (
          <StatTile key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Hiring trend (6 months)" className="lg:col-span-2">
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hiringTrend}>
                <defs>
                  <linearGradient id="app" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  stroke="var(--brand)"
                  fill="url(#app)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="hires"
                  stroke="var(--accent)"
                  fill="url(#hire)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Funnel">
          <div className="space-y-3 p-5">
            {funnelData.map((s, i) => {
              const pct = (s.count / funnelData[0].count) * 100;
              return (
                <div key={s.stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{s.stage}</span>
                    <span className="font-mono text-muted-foreground">{s.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full bg-gradient-to-r from-brand to-accent transition-all"
                      style={{ width: `${pct}%`, opacity: 1 - i * 0.12 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Applications by role" className="lg:col-span-3">
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hiringTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="applications" fill="var(--brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
