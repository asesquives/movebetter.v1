import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, Package, Clock, UserCog, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import TopClients from "@/components/dashboard/TopClients";
import BusinessTrends from "@/components/dashboard/BusinessTrends";
import OccupancyAndExpiringPackages from "@/components/dashboard/OccupancyAndExpiringPackages";
import PeriodSelector from "@/components/dashboard/PeriodSelector";
import AdvancedMetrics from "@/components/dashboard/AdvancedMetrics";
import DiffCard from "@/components/dashboard/DiffCard";
import {
  DashboardPeriod,
  getPeriodRange,
  getPreviousPeriodRange,
} from "@/lib/dashboard-period";

export default function Dashboard() {
  const today = new Date();
  const [period, setPeriod] = useState<DashboardPeriod>({
    mode: "month",
    date: new Date(),
  });
  const range = getPeriodRange(period);
  const prevRange = getPreviousPeriodRange(period);
  const rangeStartIso = range.start.toISOString();
  const rangeEndIso = range.end.toISOString();
  const prevStartIso = prevRange.start.toISOString();
  const prevEndIso = prevRange.end.toISOString();

  const { data: apptsCounts } = useQuery({
    queryKey: ["appointments-diff", rangeStartIso, rangeEndIso, prevStartIso, prevEndIso],
    queryFn: async () => {
      const [curRes, prevRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", rangeStartIso)
          .lte("start_time", rangeEndIso)
          .neq("status", "cancelled"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", prevStartIso)
          .lte("start_time", prevEndIso)
          .neq("status", "cancelled"),
      ]);
      if (curRes.error) throw curRes.error;
      if (prevRes.error) throw prevRes.error;
      return { cur: curRes.count ?? 0, prev: prevRes.count ?? 0 };
    },
  });

  const { data: clientsCounts } = useQuery({
    queryKey: [
      "clients-new-diff",
      rangeStartIso,
      rangeEndIso,
      prevStartIso,
      prevEndIso,
    ],
    queryFn: async () => {
      // Cliente "nuevo en período X" = primera actividad (cita o paquete) cae dentro de X.
      const [apptsRes, pkgsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("client_id, start_time")
          .neq("status", "cancelled")
          .order("start_time", { ascending: true }),
        supabase
          .from("packages")
          .select("client_id, created_at")
          .order("created_at", { ascending: true }),
      ]);
      if (apptsRes.error) throw apptsRes.error;
      if (pkgsRes.error) throw pkgsRes.error;

      const firstActivity = new Map<string, number>();
      const consider = (clientId: string | null, ts: string | null) => {
        if (!clientId || !ts) return;
        const t = new Date(ts).getTime();
        const prev = firstActivity.get(clientId);
        if (prev === undefined || t < prev) firstActivity.set(clientId, t);
      };
      (apptsRes.data ?? []).forEach((a) => consider(a.client_id, a.start_time));
      (pkgsRes.data ?? []).forEach((p) => consider(p.client_id, p.created_at));

      const curStart = range.start.getTime();
      const curEnd = range.end.getTime();
      const prevStart = prevRange.start.getTime();
      const prevEnd = prevRange.end.getTime();
      let cur = 0;
      let prev = 0;
      firstActivity.forEach((t) => {
        if (t >= curStart && t <= curEnd) cur += 1;
        if (t >= prevStart && t <= prevEnd) prev += 1;
      });
      return { cur, prev };
    },
  });

  const { data: pkgCounts } = useQuery({
    queryKey: ["packages-diff", rangeStartIso, rangeEndIso, prevStartIso, prevEndIso],
    queryFn: async () => {
      const [curRes, prevRes] = await Promise.all([
        supabase
          .from("packages")
          .select("*", { count: "exact", head: true })
          .gte("created_at", rangeStartIso)
          .lte("created_at", rangeEndIso),
        supabase
          .from("packages")
          .select("*", { count: "exact", head: true })
          .gte("created_at", prevStartIso)
          .lte("created_at", prevEndIso),
      ]);
      if (curRes.error) throw curRes.error;
      if (prevRes.error) throw prevRes.error;
      return { cur: curRes.count ?? 0, prev: prevRes.count ?? 0 };
    },
  });


  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground capitalize">
            {format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-1">
          <PeriodSelector value={period} onChange={setPeriod} />
          <p className="text-xs text-muted-foreground capitalize">
            Período: {range.label}
          </p>
        </div>
      </div>

      {/* Stats — diferencia vs período anterior */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DiffCard
          title="Citas vs período anterior"
          cur={apptsCounts?.cur}
          prev={apptsCounts?.prev}
          unit={{ singular: "cita", plural: "citas" }}
          previousLabel={prevRange.shortLabel}
        />
        <DiffCard
          title="Clientes vs período anterior"
          cur={clientsCounts?.cur}
          prev={clientsCounts?.prev}
          unit={{ singular: "cliente", plural: "clientes" }}
          previousLabel={prevRange.shortLabel}
        />
        <DiffCard
          title="Paquetes vs período anterior"
          cur={pkgCounts?.cur}
          prev={pkgCounts?.prev}
          unit={{ singular: "paquete", plural: "paquetes" }}
          previousLabel={prevRange.shortLabel}
        />
      </div>

      {/* Advanced metrics */}
      <AdvancedMetrics period={period} />

      {/* Business trends */}
      <BusinessTrends period={period} />

      {/* Occupancy + expiring packages */}
      <OccupancyAndExpiringPackages period={period} />

      {/* Top clients */}
      <TopClients period={period} />

      {/* No-shows del período */}
      <NoShowsSection period={period} />
    </div>
  );
}
