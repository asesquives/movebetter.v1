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
  // (LineChart/Line replaced by AreaChart for Mictio styling)
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
import { useTheme } from "@/hooks/useTheme";
import { Cell, Area, AreaChart } from "recharts";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const barColor = isDark ? "rgba(255,255,255,0.25)" : "#111111";
  const barColorActive = isDark ? "rgba(255,255,255,0.55)" : "#111111";
  const lineColor = isDark ? "rgba(255,255,255,0.70)" : "#111111";
  const areaColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const axisColor = isDark ? "rgba(255,255,255,0.30)" : "#AAAAAA";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
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

  // Accrual logic: revenue = sum of price-per-session for each done appointment.
  async function fetchDoneWithAmount(fromIso: string, toIso: string) {
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("scheduled_at, start_time, type, price, package_id, service_id, status")
      .eq("status", "done")
      .gte("scheduled_at", fromIso)
      .lte("scheduled_at", toIso);
    if (error) throw error;
    const rows = appts ?? [];
    const pkgIds = Array.from(new Set(rows.map((r: any) => r.package_id).filter(Boolean)));
    const svcIds = Array.from(new Set(rows.map((r: any) => r.service_id).filter(Boolean)));
    const [pkgRes, svcRes] = await Promise.all([
      pkgIds.length
        ? supabase.from("packages").select("id, name, price_per_session, price_paid, total_sessions").in("id", pkgIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      svcIds.length
        ? supabase.from("services").select("id, price, price_per_session").in("id", svcIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    const pkgMap = new Map((pkgRes.data ?? []).map((p: any) => [p.id, p]));
    const svcMap = new Map((svcRes.data ?? []).map((s: any) => [s.id, s]));
    const STANDALONE: Record<string, number> = { medical_diagnosis: 200, physio_diagnosis: 150, recovery: 70 };
    return rows.map((a: any) => {
      let amount = 0;
      if (a.package_id) {
        const p: any = pkgMap.get(a.package_id);
        if (p) {
          let pps = Number(p.price_per_session ?? 0);
          if (!pps && p.total_sessions && Number(p.total_sessions) > 0) {
            pps = Number(p.price_paid ?? 0) / Number(p.total_sessions);
          }
          amount = pps || 0;
        }
      } else if (a.price != null && Number(a.price) > 0) {
        amount = Number(a.price);
      } else if (a.service_id) {
        const s: any = svcMap.get(a.service_id);
        if (s) amount = Number(s.price_per_session ?? s.price ?? 0);
      }
      if (!amount && a.type) amount = STANDALONE[a.type] ?? 0;
      return { scheduled_at: a.scheduled_at ?? a.start_time, amount };
    });
  }

  const { data, isLoading } = useQuery({
    queryKey: ["business-trends", granularity, rangeStart, rangeEnd],
    queryFn: async () => {
      const [doneAppts, apptsRes] = await Promise.all([
        fetchDoneWithAmount(rangeStart, rangeEnd),
        supabase
          .from("appointments")
          .select("start_time, status")
          .gte("start_time", rangeStart)
          .lte("start_time", rangeEnd)
          .neq("status", "cancelled"),
      ]);
      if (apptsRes.error) throw apptsRes.error;

      const buckets = buildBuckets();
      const idx = new Map(buckets.map((b, i) => [b.key, i]));
      const keyFor = (d: Date) =>
        granularity === "month"
          ? format(d, "yyyy-MM")
          : format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-'W'II");

      for (const r of doneAppts) {
        const i = idx.get(keyFor(new Date(r.scheduled_at)));
        if (i !== undefined) buckets[i].revenue += r.amount;
      }
      for (const a of apptsRes.data ?? []) {
        const i = idx.get(keyFor(new Date(a.start_time)));
        if (i !== undefined) buckets[i].appointments += 1;
      }
      return buckets;
    },
  });

  const buckets = data ?? buildBuckets();

  const periodStartIso = periodStart.toISOString();
  const periodEndIso = periodEnd.toISOString();

  const { data: periodTotals } = useQuery({
    queryKey: ["business-trends-period-totals", periodStartIso, periodEndIso],
    queryFn: async () => {
      const [doneAppts, apptRes] = await Promise.all([
        fetchDoneWithAmount(periodStartIso, periodEndIso),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", periodStartIso)
          .lte("start_time", periodEndIso)
          .neq("status", "cancelled"),
      ]);
      if (apptRes.error) throw apptRes.error;
      const revenue = doneAppts.reduce((s, r) => s + r.amount, 0);
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
        <h2 className="text-lg font-semibold">Tendencias del negocio</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mictio-stagger">
        <div className="mictio-card">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-semibold">
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
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: axisColor }} />
                  <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: axisColor }} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip
                    cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                    itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                    formatter={(v: number) => [formatCurrency(v), "Ingresos"]}
                  />

                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {buckets.map((_, i) => (
                      <Cell key={i} fill={i === buckets.length - 1 ? barColorActive : barColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mictio-card">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-semibold">
              Citas por {granularity === "month" ? "mes" : "semana"}
            </h3>
            <span className="text-sm font-bold tabular-nums">{totalAppts} citas</span>
          </div>
          <div className="h-56">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mictioAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)"} stopOpacity={isDark ? 0.15 : 0.10} />
                      <stop offset="100%" stopColor={isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: axisColor }} />
                  <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: axisColor }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: axisColor, strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [v, "Citas"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="appointments"
                    stroke={lineColor}
                    strokeWidth={2}
                    fill="url(#mictioAreaGrad)"
                    activeDot={{
                      r: 4,
                      fill: isDark ? "rgba(255,255,255,0.90)" : "#111111",
                      stroke: isDark ? "#0E0E0E" : "#FFFFFF",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
