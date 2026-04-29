import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  eachDayOfInterval,
  differenceInMinutes,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { DashboardPeriod, getPeriodRange } from "@/lib/dashboard-period";

interface Props {
  period: DashboardPeriod;
}

// Map weekday index (0=sun..6=sat) to a set of accepted tokens for schedule_days
const DAY_TOKENS: string[][] = [
  ["sun", "dom", "domingo"],
  ["mon", "lun", "lunes"],
  ["tue", "mar", "martes"],
  ["wed", "mie", "mié", "miercoles", "miércoles"],
  ["thu", "jue", "jueves"],
  ["fri", "vie", "viernes"],
  ["sat", "sab", "sáb", "sabado", "sábado"],
];

const normalizeDay = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const formatPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

export default function AdvancedMetrics({ period }: Props) {
  const range = getPeriodRange(period);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const prevStart = startOfMonth(subMonths(range.start, 1));
  const prevEnd = endOfMonth(subMonths(range.start, 1));
  const curMonthStart = startOfMonth(range.start);
  const curMonthEnd = endOfMonth(range.start);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-advanced-metrics", startIso, endIso],
    queryFn: async () => {
      const [
        physiosRes,
        physioApptsRes,
        prevApptsRes,
        curMonthApptsRes,
        packagesPeriodRes,
        soloApptsPeriodRes,
        revenuePeriodRes,
        revenuePrevRes,
        clientsPeriodRes,
        clientsPrevRes,
        sessionsPeriodRes,
        sessionsPrevRes,
        apptsPeriodAllRes,
        pkgsActivityPeriodRes,
      ] = await Promise.all([
        supabase
          .from("professionals")
          .select("id, schedule_days, schedule_start, schedule_end, is_active")
          .eq("type", "physio")
          .eq("is_active", true),
        supabase
          .from("appointments")
          .select("professional_id, start_time, end_time, status")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .neq("status", "cancelled"),
        supabase
          .from("appointments")
          .select("client_id")
          .gte("start_time", prevStart.toISOString())
          .lte("start_time", prevEnd.toISOString())
          .neq("status", "cancelled"),
        supabase
          .from("appointments")
          .select("client_id")
          .gte("start_time", curMonthStart.toISOString())
          .lte("start_time", curMonthEnd.toISOString())
          .neq("status", "cancelled"),
        supabase
          .from("packages")
          .select("client_id, total_paid, created_at")
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("appointments")
          .select("client_id, revenue_amount, package_id, status")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .eq("status", "done")
          .is("package_id", null),
        supabase
          .from("revenue_entries")
          .select("amount")
          .gte("recognized_at", curMonthStart.toISOString())
          .lte("recognized_at", curMonthEnd.toISOString()),
        supabase
          .from("revenue_entries")
          .select("amount")
          .gte("recognized_at", prevStart.toISOString())
          .lte("recognized_at", prevEnd.toISOString()),
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .gte("created_at", curMonthStart.toISOString())
          .lte("created_at", curMonthEnd.toISOString()),
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .gte("created_at", prevStart.toISOString())
          .lte("created_at", prevEnd.toISOString()),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", curMonthStart.toISOString())
          .lte("start_time", curMonthEnd.toISOString())
          .eq("status", "done"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", prevStart.toISOString())
          .lte("start_time", prevEnd.toISOString())
          .eq("status", "done"),
        // Activity in period: any non-cancelled appointment
        supabase
          .from("appointments")
          .select("client_id")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .neq("status", "cancelled"),
        // Activity in period: package with sessions consumed in the period
        // (proxied via appointments with package_id done in period)
        supabase
          .from("appointments")
          .select("client_id, package_id")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .not("package_id", "is", null)
          .eq("status", "done"),
      ]);

      // ===== Métrica 1: Tasa de ocupación =====
      const physios = physiosRes.data ?? [];
      const physioIds = new Set(physios.map((p) => p.id));
      const days = eachDayOfInterval({ start: range.start, end: range.end });

      let availableMinutes = 0;
      for (const p of physios) {
        if (!p.schedule_start || !p.schedule_end || !p.schedule_days?.length) continue;
        const dailyMin = timeToMinutes(p.schedule_end) - timeToMinutes(p.schedule_start);
        if (dailyMin <= 0) continue;
        const scheduleDays = (p.schedule_days as string[]).map((d) => d.toLowerCase().slice(0, 3));
        for (const d of days) {
          const dayName = DAY_NAMES[d.getDay()];
          if (scheduleDays.includes(dayName)) {
            availableMinutes += dailyMin;
          }
        }
      }

      let bookedMinutes = 0;
      for (const a of physioApptsRes.data ?? []) {
        if (!a.professional_id || !physioIds.has(a.professional_id)) continue;
        const mins = differenceInMinutes(new Date(a.end_time), new Date(a.start_time));
        if (mins > 0) bookedMinutes += mins;
      }

      const occupancy = availableMinutes > 0 ? (bookedMinutes / availableMinutes) * 100 : null;

      // ===== Retención =====
      const prevClients = new Set((prevApptsRes.data ?? []).map((a) => a.client_id));
      const curClients = new Set((curMonthApptsRes.data ?? []).map((a) => a.client_id));
      let retained = 0;
      prevClients.forEach((c) => {
        if (curClients.has(c)) retained += 1;
      });
      const retention = prevClients.size > 0 ? (retained / prevClients.size) * 100 : null;

      // ===== Ingreso promedio por cliente =====
      const packagesPeriod = packagesPeriodRes.data ?? [];
      const soloAppts = soloApptsPeriodRes.data ?? [];

      const totalPackagesPaid = packagesPeriod.reduce((s, p) => s + Number(p.total_paid ?? 0), 0);
      const totalSoloRevenue = soloAppts.reduce((s, a) => s + Number(a.revenue_amount ?? 0), 0);
      const totalRevenueAll = totalPackagesPaid + totalSoloRevenue;

      const activeClients = new Set<string>();
      (apptsPeriodAllRes.data ?? []).forEach((a) => a.client_id && activeClients.add(a.client_id));
      (pkgsActivityPeriodRes.data ?? []).forEach(
        (a) => a.client_id && activeClients.add(a.client_id),
      );
      // also include clients who bought a package within the period
      packagesPeriod.forEach((p) => p.client_id && activeClients.add(p.client_id));

      const avgRevenuePerClient =
        activeClients.size > 0 ? totalRevenueAll / activeClients.size : null;

      // ===== Crecimiento =====
      const curRevenue = (revenuePeriodRes.data ?? []).reduce(
        (s, r) => s + Number(r.amount ?? 0),
        0,
      );
      const prevRevenue = (revenuePrevRes.data ?? []).reduce(
        (s, r) => s + Number(r.amount ?? 0),
        0,
      );
      const curNewClients = clientsPeriodRes.count ?? 0;
      const prevNewClients = clientsPrevRes.count ?? 0;
      const curSessions = sessionsPeriodRes.count ?? 0;
      const prevSessions = sessionsPrevRes.count ?? 0;

      const growthOf = (cur: number, prev: number): number | null => {
        if (prev === 0) return null;
        return ((cur - prev) / prev) * 100;
      };

      return {
        occupancy,
        retention,
        avgRevenuePerClient,
        growth: {
          revenue: { cur: curRevenue, prev: prevRevenue, pct: growthOf(curRevenue, prevRevenue) },
          clients: {
            cur: curNewClients,
            prev: prevNewClients,
            pct: growthOf(curNewClients, prevNewClients),
          },
          sessions: {
            cur: curSessions,
            prev: prevSessions,
            pct: growthOf(curSessions, prevSessions),
          },
        },
      };
    },
  });

  const dash = "—";

  const retentionColor =
    data?.retention == null
      ? "text-foreground"
      : data.retention > 70
        ? "text-emerald-600"
        : data.retention >= 50
          ? "text-amber-600"
          : "text-red-600";

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-card rounded-lg border p-5">{children}</div>
  );

  const GrowthCard = ({
    title,
    cur,
    pct,
    formatter,
  }: {
    title: string;
    cur: number;
    pct: number | null;
    formatter: (n: number) => string;
  }) => {
    const hasPrev = pct !== null;
    const flat = pct === 0;
    const up = (pct ?? 0) > 0;
    const Icon = !hasPrev ? Minus : flat ? Minus : up ? ArrowUp : ArrowDown;
    const color = !hasPrev
      ? "text-muted-foreground"
      : flat
        ? "text-muted-foreground"
        : up
          ? "text-emerald-600"
          : "text-red-600";
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">{formatter(cur)}</p>
        {hasPrev ? (
          <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${color}`}>
            <Icon className="h-3.5 w-3.5" />
            {Math.abs(pct!).toFixed(1)}% vs mes anterior
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">Sin datos previos</p>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border p-5 h-[110px] animate-pulse" />
        ))}
      </div>
    );
  }

  const intFmt = (n: number) => new Intl.NumberFormat("es-PE").format(n);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Tasa de ocupación */}
      <Card>
        <p className="text-sm text-muted-foreground">Tasa de ocupación · Solo fisios</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">
          {data?.occupancy == null ? dash : `${Math.round(data.occupancy)}%`}
        </p>
      </Card>

      {/* 2. Retención */}
      <Card>
        <p className="text-sm text-muted-foreground">Retención de clientes</p>
        <p className={`text-3xl font-bold mt-1 tabular-nums ${retentionColor}`}>
          {data?.retention == null ? dash : `${data.retention.toFixed(1)}%`}
        </p>
        <p className="text-xs text-muted-foreground mt-2">vs mes anterior</p>
      </Card>

      {/* 3. Ingreso promedio por cliente */}
      <Card>
        <p className="text-sm text-muted-foreground">Ingreso promedio por cliente</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">
          {data?.avgRevenuePerClient == null ? dash : formatPEN(data.avgRevenuePerClient)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">clientes con actividad</p>
      </Card>

      {/* 4. Ingresos vs mes anterior */}
      <GrowthCard
        title="Ingresos vs mes anterior"
        cur={data?.growth?.revenue?.cur ?? 0}
        pct={data?.growth?.revenue?.pct ?? null}
        formatter={formatPEN}
      />

      {/* 5. Clientes vs mes anterior */}
      <GrowthCard
        title="Clientes vs mes anterior"
        cur={data?.growth?.clients?.cur ?? 0}
        pct={data?.growth?.clients?.pct ?? null}
        formatter={intFmt}
      />

      {/* 6. Sesiones vs mes anterior */}
      <GrowthCard
        title="Sesiones vs mes anterior"
        cur={data?.growth?.sessions?.cur ?? 0}
        pct={data?.growth?.sessions?.pct ?? null}
        formatter={intFmt}
      />
    </div>
  );
}
