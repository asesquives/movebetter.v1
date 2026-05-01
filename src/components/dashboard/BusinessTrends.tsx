import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  eachMonthOfInterval,
  eachWeekOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import { DashboardPeriod, getPeriodRange } from "@/lib/dashboard-period";

interface Bucket {
  key: string;
  label: string;
  revenue: number;
  appointments: number;
}

import { formatCurrency } from "@/lib/format";

interface Props {
  period: DashboardPeriod;
}

export default function BusinessTrends({ period }: Props) {
  const { granularity, start: periodStart, end: periodEnd } = getPeriodRange(period);

  // Anchor for relative (mes/semana) modes; for ytd/custom we use the actual range.
  const anchor = period.date;
  const isRelative = period.mode === "month" || period.mode === "week";

  function buildBuckets(): Bucket[] {
    if (isRelative) {
      if (granularity === "month") {
        const baseMonth = startOfMonth(anchor);
        return Array.from({ length: 6 }).map((_, i) => {
          const d = subMonths(baseMonth, 5 - i);
          return {
            key: format(d, "yyyy-MM"),
            label: format(d, "MMM", { locale: es }),
            revenue: 0,
            appointments: 0,
          };
        });
      }
      const baseWeek = startOfWeek(anchor, { weekStartsOn: 1 });
      return Array.from({ length: 8 }).map((_, i) => {
        const d = subWeeks(baseWeek, 7 - i);
        return {
          key: format(d, "yyyy-'W'II"),
          label: format(d, "d MMM", { locale: es }),
          revenue: 0,
          appointments: 0,
        };
      });
    }

    // YTD / Custom: bucket across the actual period range
    if (granularity === "month") {
      return eachMonthOfInterval({ start: periodStart, end: periodEnd }).map((d) => ({
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM", { locale: es }),
        revenue: 0,
        appointments: 0,
      }));
    }
    return eachWeekOfInterval(
      { start: periodStart, end: periodEnd },
      { weekStartsOn: 1 }
    ).map((d) => ({
      key: format(d, "yyyy-'W'II"),
      label: format(d, "d MMM", { locale: es }),
      revenue: 0,
      appointments: 0,
    }));
  }

  const rangeStart = isRelative
    ? (granularity === "month"
        ? startOfMonth(subMonths(anchor, 5)).toISOString()
        : startOfWeek(subWeeks(anchor, 7), { weekStartsOn: 1 }).toISOString())
    : periodStart.toISOString();
  const rangeEnd = isRelative
    ? (granularity === "month"
        ? endOfMonth(anchor).toISOString()
        : endOfWeek(anchor, { weekStartsOn: 1 }).toISOString())
    : periodEnd.toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["business-trends", granularity, rangeStart, rangeEnd],
    queryFn: async () => {
      const [revenueRes, apptsRes] = await Promise.all([
        supabase
          .from("revenue_entries")
          .select("amount, recognized_at")
          .gte("recognized_at", rangeStart)
          .lte("recognized_at", rangeEnd),
        supabase
          .from("appointments")
          .select("start_time, status")
          .gte("start_time", rangeStart)
          .lte("start_time", rangeEnd)
          .neq("status", "cancelled"),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (apptsRes.error) throw apptsRes.error;

      const buckets = buildBuckets();
      const idx = new Map(buckets.map((b, i) => [b.key, i]));
      const keyFor = (d: Date) =>
        granularity === "month"
          ? format(d, "yyyy-MM")
          : format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-'W'II");

      for (const r of revenueRes.data ?? []) {
        const i = idx.get(keyFor(new Date(r.recognized_at)));
        if (i !== undefined) buckets[i].revenue += Number(r.amount ?? 0);
      }
      for (const a of apptsRes.data ?? []) {
        const i = idx.get(keyFor(new Date(a.start_time)));
        if (i !== undefined) buckets[i].appointments += 1;
      }
      return buckets;
    },
  });

  const buckets = data ?? buildBuckets();

  // Totals shown in headers must reflect ONLY the selected period,
  // not the full chart window (which extends further back for trend context).
  const periodStartIso = periodStart.toISOString();
  const periodEndIso = periodEnd.toISOString();

  const { data: periodTotals } = useQuery({
    queryKey: ["business-trends-period-totals", periodStartIso, periodEndIso],
    queryFn: async () => {
      const [revRes, apptRes] = await Promise.all([
        supabase
          .from("revenue_entries")
          .select("amount")
          .gte("recognized_at", periodStartIso)
          .lte("recognized_at", periodEndIso),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", periodStartIso)
          .lte("start_time", periodEndIso)
          .neq("status", "cancelled"),
      ]);
      if (revRes.error) throw revRes.error;
      if (apptRes.error) throw apptRes.error;
      const revenue = (revRes.data ?? []).reduce(
        (s, r) => s + Number(r.amount ?? 0),
        0
      );
      return { revenue, appointments: apptRes.count ?? 0 };
    },
  });

  const totalRevenue = periodTotals?.revenue ?? 0;
  const totalAppts = periodTotals?.appointments ?? 0;

  const subtitle = isRelative
    ? granularity === "month"
      ? "Últimos 6 meses"
      : "Últimas 8 semanas"
    : getPeriodRange(period).label;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="t-h2">Tendencias del negocio</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="t-eyebrow">
              Ingresos por {granularity === "month" ? "mes" : "semana"}
            </h3>
            <span className="text-sm font-bold tabular-nums">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="h-56">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Ingresos"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="t-eyebrow">
              Citas por {granularity === "month" ? "mes" : "semana"}
            </h3>
            <span className="text-sm font-bold tabular-nums">{totalAppts} citas</span>
          </div>
          <div className="h-56">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                    formatter={(v: number) => [v, "Citas"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
