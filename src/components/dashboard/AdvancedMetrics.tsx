import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  eachDayOfInterval,
  differenceInMinutes,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";
import { DashboardPeriod, getPeriodRange } from "@/lib/dashboard-period";

interface Props {
  period: DashboardPeriod;
}

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const formatPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const formatPEN0 = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(n);

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

export default function AdvancedMetrics({ period }: Props) {
  const range = getPeriodRange(period);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  // Previous period (mes anterior) for retention & growth
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
        activePackagesRes,
        revenuePeriodRes,
        revenuePrevRes,
        clientsPeriodRes,
        clientsPrevRes,
        sessionsPeriodRes,
        sessionsPrevRes,
        apptsPeriodAllRes,
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
        // Retention: previous month appointments (any status != cancelled)
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
        // Ticket promedio: paquetes comprados en el período
        supabase
          .from("packages")
          .select("client_id, total_paid, total_sessions, sessions_used, price_per_session, status")
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        // Citas sueltas done sin package_id
        supabase
          .from("appointments")
          .select("client_id, revenue_amount, package_id, status")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .eq("status", "done")
          .is("package_id", null),
        // Pipeline: todos los paquetes activos
        supabase
          .from("packages")
          .select("total_sessions, sessions_used, price_per_session, status")
          .eq("status", "active"),
        // Crecimiento - ingresos
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
        // Crecimiento - clientes nuevos
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
        // Crecimiento - sesiones realizadas (status = done)
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
        // Ingreso promedio: clientes únicos con actividad en período
        supabase
          .from("appointments")
          .select("client_id")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .neq("status", "cancelled"),
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

      // ===== Métrica 2: Retención =====
      const prevClients = new Set((prevApptsRes.data ?? []).map((a) => a.client_id));
      const curClients = new Set((curMonthApptsRes.data ?? []).map((a) => a.client_id));
      let retained = 0;
      prevClients.forEach((c) => {
        if (curClients.has(c)) retained += 1;
      });
      const retention = prevClients.size > 0 ? (retained / prevClients.size) * 100 : null;

      // ===== Métrica 3 & 6: Ticket promedio / Ingreso promedio =====
      const packagesPeriod = packagesPeriodRes.data ?? [];
      const soloAppts = soloApptsPeriodRes.data ?? [];

      const totalPackagesPaid = packagesPeriod.reduce((s, p) => s + Number(p.total_paid ?? 0), 0);
      const totalSoloRevenue = soloAppts.reduce((s, a) => s + Number(a.revenue_amount ?? 0), 0);
      const totalRevenueAll = totalPackagesPaid + totalSoloRevenue;

      const payingClients = new Set<string>();
      packagesPeriod.forEach((p) => p.client_id && payingClients.add(p.client_id));
      soloAppts.forEach((a) => a.client_id && payingClients.add(a.client_id));

      const ticketAvg = payingClients.size > 0 ? totalRevenueAll / payingClients.size : null;

      // Ingreso promedio: clientes únicos con actividad (cita o compra)
      const activeClients = new Set<string>(payingClients);
      (apptsPeriodAllRes.data ?? []).forEach((a) => a.client_id && activeClients.add(a.client_id));
      const avgRevenuePerClient =
        activeClients.size > 0 ? totalRevenueAll / activeClients.size : null;

      // ===== Métrica 4: Pipeline =====
      const activePkgs = activePackagesRes.data ?? [];
      let pendingSessions = 0;
      let guaranteedRevenue = 0;
      for (const p of activePkgs) {
        const remaining = (p.total_sessions ?? 0) - (p.sessions_used ?? 0);
        if (remaining > 0) {
          pendingSessions += remaining;
          guaranteedRevenue += remaining * Number(p.price_per_session ?? 0);
        }
      }

      // ===== Métrica 5: Crecimiento =====
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
        ticketAvg,
        pendingSessions,
        guaranteedRevenue,
        avgRevenuePerClient,
        growth: {
          revenue: growthOf(curRevenue, prevRevenue),
          clients: growthOf(curNewClients, prevNewClients),
          sessions: growthOf(curSessions, prevSessions),
          hasPrevData: prevRevenue > 0 || prevNewClients > 0 || prevSessions > 0,
        },
        prevMonthLabel: format(prevStart, "MMM yyyy"),
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

  const GrowthRow = ({ label, value }: { label: string; value: number | null }) => {
    if (value == null) {
      return (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">—</span>
        </div>
      );
    }
    const up = value > 0;
    const flat = value === 0;
    const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;
    const color = flat ? "text-muted-foreground" : up ? "text-emerald-600" : "text-red-600";
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`flex items-center gap-1 font-semibold tabular-nums ${color}`}>
          <Icon className="h-3.5 w-3.5" />
          {Math.abs(value).toFixed(1)}%
        </span>
      </div>
    );
  };

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-card rounded-lg border p-5">{children}</div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border p-5 h-[110px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Tasa de ocupación */}
      <Card>
        <p className="text-sm text-muted-foreground">Tasa de ocupación · Solo fisios</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">
          {data?.occupancy == null ? dash : `${data.occupancy.toFixed(1)}%`}
        </p>
        <Progress
          value={data?.occupancy == null ? 0 : Math.min(100, data.occupancy)}
          className="h-2 mt-3"
        />
      </Card>

      {/* 2. Retención */}
      <Card>
        <p className="text-sm text-muted-foreground">Retención de clientes</p>
        <p className={`text-3xl font-bold mt-1 tabular-nums ${retentionColor}`}>
          {data?.retention == null ? dash : `${data.retention.toFixed(1)}%`}
        </p>
        <p className="text-xs text-muted-foreground mt-2">vs mes anterior</p>
      </Card>

      {/* 3. Ticket promedio */}
      <Card>
        <p className="text-sm text-muted-foreground">Ticket promedio</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">
          {data?.ticketAvg == null ? dash : formatPEN(data.ticketAvg)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">por cliente que pagó</p>
      </Card>

      {/* 4. Pipeline */}
      <Card>
        <p className="text-sm text-muted-foreground">Pipeline de sesiones</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">
          {data && data.pendingSessions > 0 ? `${data.pendingSessions} sesiones` : dash}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {data && data.pendingSessions > 0
            ? `${formatPEN0(data.guaranteedRevenue)} garantizados`
            : "sin paquetes activos"}
        </p>
      </Card>

      {/* 5. Crecimiento */}
      <Card>
        <p className="text-sm text-muted-foreground">Crecimiento vs mes anterior</p>
        {data?.growth.hasPrevData ? (
          <div className="mt-2 space-y-1.5">
            <GrowthRow label="Ingresos" value={data.growth.revenue} />
            <GrowthRow label="Clientes nuevos" value={data.growth.clients} />
            <GrowthRow label="Sesiones realizadas" value={data.growth.sessions} />
          </div>
        ) : (
          <p className="text-3xl font-bold mt-1">{dash}</p>
        )}
        {!data?.growth.hasPrevData && (
          <p className="text-xs text-muted-foreground mt-2">Sin datos previos</p>
        )}
      </Card>

      {/* 6. Ingreso promedio por cliente */}
      <Card>
        <p className="text-sm text-muted-foreground">Ingreso promedio por cliente</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">
          {data?.avgRevenuePerClient == null ? dash : formatPEN(data.avgRevenuePerClient)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">clientes con actividad</p>
      </Card>
    </div>
  );
}
