import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, differenceInMinutes, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DashboardPeriod, getPeriodRange } from "@/lib/dashboard-period";

const BRAND_RED = "#CC2222";

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

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

interface Props {
  period: DashboardPeriod;
}

interface PhysioOccupancy {
  id: string;
  name: string;
  pct: number;
}

interface ExpiringPackage {
  id: string;
  clientName: string;
  daysLeft: number;
  pendingSessions: number;
}

export default function OccupancyAndExpiringPackages({ period }: Props) {
  const range = getPeriodRange(period);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const { data: occupancy } = useQuery({
    queryKey: ["physio-occupancy-per-pro", startIso, endIso],
    queryFn: async (): Promise<PhysioOccupancy[]> => {
      const [physiosRes, apptsRes] = await Promise.all([
        supabase
          .from("professionals")
          .select("id, name, schedule_days, schedule_start, schedule_end")
          .eq("type", "physio")
          .eq("is_active", true),
        supabase
          .from("appointments")
          .select("professional_id, start_time, end_time")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .neq("status", "cancelled"),
      ]);
      if (physiosRes.error) throw physiosRes.error;
      if (apptsRes.error) throw apptsRes.error;

      const days = eachDayOfInterval({ start: range.start, end: range.end });
      const booked = new Map<string, number>();
      for (const a of apptsRes.data ?? []) {
        if (!a.professional_id) continue;
        const m = differenceInMinutes(new Date(a.end_time), new Date(a.start_time));
        if (m > 0) booked.set(a.professional_id, (booked.get(a.professional_id) ?? 0) + m);
      }

      return (physiosRes.data ?? [])
        .map((p) => {
          let availMin = 0;
          if (p.schedule_start && p.schedule_end && p.schedule_days?.length) {
            const daily = timeToMinutes(p.schedule_end) - timeToMinutes(p.schedule_start);
            if (daily > 0) {
              const set = new Set((p.schedule_days as string[]).map(normalizeDay));
              for (const d of days) {
                if (DAY_TOKENS[d.getDay()].some((t) => set.has(t))) availMin += daily;
              }
            }
          }
          const used = booked.get(p.id) ?? 0;
          const pct = availMin > 0 ? (used / availMin) * 100 : 0;
          return { id: p.id, name: p.name, pct };
        })
        .sort((a, b) => b.pct - a.pct);
    },
  });

  const { data: expiring } = useQuery({
    queryKey: ["expiring-packages-14d"],
    queryFn: async (): Promise<ExpiringPackage[]> => {
      const now = new Date();
      const in14 = new Date();
      in14.setDate(in14.getDate() + 14);

      const { data, error } = await supabase
        .from("packages")
        .select("id, client_id, total_sessions, sessions_used, expires_at, status")
        .eq("status", "active")
        .not("expires_at", "is", null)
        .gte("expires_at", now.toISOString())
        .lte("expires_at", in14.toISOString())
        .order("expires_at", { ascending: true });
      if (error) throw error;

      const filtered = (data ?? []).filter(
        (p) => (p.sessions_used ?? 0) < (p.total_sessions ?? 0),
      );
      const clientIds = Array.from(new Set(filtered.map((p) => p.client_id)));
      let clientMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]));
      }

      return filtered.map((p) => ({
        id: p.id,
        clientName: clientMap.get(p.client_id) ?? "Cliente",
        daysLeft: Math.max(0, differenceInDays(new Date(p.expires_at!), now)),
        pendingSessions: (p.total_sessions ?? 0) - (p.sessions_used ?? 0),
      }));
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Ocupación fisios */}
      <div className="bg-card rounded-lg border p-4">
        <p className="text-sm text-muted-foreground mb-3">Ocupación fisios</p>
        {!occupancy || occupancy.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sin fisioterapeutas activos
          </p>
        ) : (
          <div className="divide-y">
            {occupancy.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="text-sm font-medium w-28 truncate">{p.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, p.pct)}%`,
                      backgroundColor: BRAND_RED,
                    }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {Math.round(p.pct)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paquetes por vencer */}
      <div className="bg-card rounded-lg border p-4">
        <p className="text-sm text-muted-foreground mb-3">Paquetes por vencer</p>
        {!expiring || expiring.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sin paquetes próximos a vencer
          </p>
        ) : (
          <div className="divide-y">
            {expiring.slice(0, 4).map((p) => {
              const isUrgent = p.daysLeft < 7;
              return (
                <div key={p.id} className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: isUrgent ? BRAND_RED : "#EAB308" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold truncate">{p.clientName}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {p.daysLeft} {p.daysLeft === 1 ? "día" : "días"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.pendingSessions} {p.pendingSessions === 1 ? "sesión pendiente" : "sesiones pendientes"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
