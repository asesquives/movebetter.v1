import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, Package, DollarSign, Clock, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import TopClients from "@/components/dashboard/TopClients";
import BusinessTrends from "@/components/dashboard/BusinessTrends";
import OccupancyAndExpiringPackages from "@/components/dashboard/OccupancyAndExpiringPackages";
import PeriodSelector from "@/components/dashboard/PeriodSelector";
import AdvancedMetrics from "@/components/dashboard/AdvancedMetrics";
import { DashboardPeriod, getPeriodRange } from "@/lib/dashboard-period";

export default function Dashboard() {
  const today = new Date();
  const [period, setPeriod] = useState<DashboardPeriod>({
    mode: "month",
    date: new Date(),
  });
  const range = getPeriodRange(period);
  const rangeStartIso = range.start.toISOString();
  const rangeEndIso = range.end.toISOString();

  const { data: periodAppointments } = useQuery({
    queryKey: ["appointments-period", rangeStartIso, rangeEndIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id")
        .gte("start_time", rangeStartIso)
        .lte("start_time", rangeEndIso)
        .neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
  });

  const { data: clientCount } = useQuery({
    queryKey: ["clients-new-by-first-activity", rangeStartIso, rangeEndIso],
    queryFn: async () => {
      // Un cliente es "nuevo en el período" si su primera cita o primer paquete
      // ocurrió dentro del rango seleccionado.
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

      const startMs = range.start.getTime();
      const endMs = range.end.getTime();
      let count = 0;
      firstActivity.forEach((t) => {
        if (t >= startMs && t <= endMs) count += 1;
      });
      return count;
    },
  });

  const { data: activePackages } = useQuery({
    queryKey: ["packages-period", rangeStartIso, rangeEndIso],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("packages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", rangeStartIso)
        .lte("created_at", rangeEndIso);
      if (error) throw error;
      return count || 0;
    },
  });

  const quickLinks = [
    { title: "Agenda", icon: Calendar, href: "/agenda", description: "Ver citas del día" },
    { title: "Clientes", icon: Users, href: "/clientes", description: "Gestionar pacientes" },
    { title: "Paquetes", icon: Package, href: "/paquetes", description: "Planes activos" },
    { title: "Ingresos", icon: DollarSign, href: "/ingresos", description: "Resumen financiero" },
    { title: "Disponibilidad", icon: Clock, href: "/disponibilidad", description: "Horarios del equipo" },
    { title: "Equipo", icon: UserCog, href: "/equipo", description: "Profesionales" },
  ];

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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">Citas del período</p>
          <p className="text-3xl font-bold mt-1">{periodAppointments?.length ?? 0}</p>
        </div>
        <div className="bg-card rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">Clientes nuevos del período</p>
          <p className="text-3xl font-bold mt-1">{clientCount ?? 0}</p>
        </div>
        <div className="bg-card rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">Paquetes vendidos del período</p>
          <p className="text-3xl font-bold mt-1">{activePackages ?? 0}</p>
        </div>
      </div>

      {/* Advanced metrics */}
      <AdvancedMetrics period={period} />

      {/* Business trends */}
      <BusinessTrends period={period} />

      {/* Occupancy + expiring packages */}
      <OccupancyAndExpiringPackages period={period} />

      {/* Top clients */}
      <TopClients period={period} />

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="bg-card rounded-lg border p-4 hover:border-primary/50 transition-colors group"
            >
              <link.icon className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium text-sm">{link.title}</p>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
