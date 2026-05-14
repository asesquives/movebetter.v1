import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInMinutes,
  subMonths,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

function abbreviate(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

interface Row {
  id: string;
  name: string;
  pct: number;
  hasSchedule: boolean;
}

export default function PhysioOccupancyChart() {
  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }).map((_, i) => {
      const d = startOfMonth(subMonths(now, i));
      return {
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy", { locale: es }),
        date: d,
      };
    });
  }, []);

  const [monthValue, setMonthValue] = useState(monthOptions[0].value);
  const selected = monthOptions.find((o) => o.value === monthValue) ?? monthOptions[0];
  const start = selected.date;
  const end = endOfMonth(start);

  const { data } = useQuery({
    queryKey: ["physio-occupancy-equipo", monthValue],
    queryFn: async (): Promise<Row[]> => {
      const [physiosRes, apptsRes] = await Promise.all([
        supabase
          .from("professionals")
          .select("id, name, schedule_days, schedule_start, schedule_end")
          .eq("type", "physio")
          .eq("is_active", true),
        supabase
          .from("appointments")
          .select("professional_id, start_time, end_time, status")
          .gte("start_time", start.toISOString())
          .lte("start_time", end.toISOString())
          .eq("status", "done"),
      ]);
      if (physiosRes.error) throw physiosRes.error;
      if (apptsRes.error) throw apptsRes.error;

      const days = eachDayOfInterval({ start, end });
      const booked = new Map<string, number>();
      for (const a of apptsRes.data ?? []) {
        if (!a.professional_id) continue;
        const m = differenceInMinutes(new Date(a.end_time), new Date(a.start_time));
        if (m > 0)
          booked.set(a.professional_id, (booked.get(a.professional_id) ?? 0) + m);
      }

      return (physiosRes.data ?? [])
        .map((p) => {
          const hasSchedule =
            !!p.schedule_start && !!p.schedule_end && (p.schedule_days?.length ?? 0) > 0;
          let availMin = 0;
          if (hasSchedule) {
            const daily =
              timeToMinutes(p.schedule_end!) - timeToMinutes(p.schedule_start!);
            if (daily > 0) {
              const set = new Set((p.schedule_days as string[]).map(normalizeDay));
              for (const d of days) {
                if (DAY_TOKENS[d.getDay()].some((t) => set.has(t))) availMin += daily;
              }
            }
          }
          const used = booked.get(p.id) ?? 0;
          const pct = availMin > 0 ? (used / availMin) * 100 : 0;
          return { id: p.id, name: p.name, pct, hasSchedule };
        })
        .sort((a, b) => b.pct - a.pct);
    },
  });

  const monthLabel =
    selected.label.charAt(0).toUpperCase() + selected.label.slice(1);

  return (
    <div
      className="mictio-card"
      style={{
        backgroundColor: "var(--mictio-surface)",
        border: "1px solid var(--mictio-border)",
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--mictio-text)" }}
        >
          Horas trabajadas este mes (sesiones realizadas)
        </h2>
        <Select value={monthValue} onValueChange={setMonthValue}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs capitalize">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!data || data.length === 0 ? (
        <p
          className="text-sm py-6 text-center"
          style={{ color: "var(--mictio-text-secondary)" }}
        >
          Sin fisioterapeutas activos
        </p>
      ) : (
        <div className="space-y-2.5">
          <TooltipProvider delayDuration={150}>
            {data.map((p) => {
              const widthPct = p.hasSchedule ? Math.min(100, p.pct) : 100;
              const fillColor = p.hasSchedule
                ? "var(--mictio-accent)"
                : "var(--mictio-border)";
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span
                    className="text-xs font-medium w-28 truncate shrink-0"
                    style={{ color: "var(--mictio-text)" }}
                    title={p.name}
                  >
                    {abbreviate(p.name)}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-1 relative overflow-hidden"
                        style={{
                          height: 28,
                          borderRadius: 4,
                          backgroundColor: "var(--mictio-border)",
                        }}
                      >
                        <div
                          className="h-full flex items-center justify-end px-2 transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: fillColor,
                            borderRadius: 4,
                            minWidth: p.hasSchedule && p.pct > 0 ? 36 : undefined,
                          }}
                        >
                          {p.hasSchedule && (
                            <span
                              style={{
                                color: "#FFFFFF",
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 700,
                                fontSize: 12,
                                lineHeight: 1,
                              }}
                            >
                              {Math.round(p.pct)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    {!p.hasSchedule && (
                      <TooltipContent>Sin horario configurado</TooltipContent>
                    )}
                  </Tooltip>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      )}

      <p
        className="text-xs mt-4"
        style={{ color: "var(--mictio-text-secondary)" }}
      >
        Basado en citas marcadas como realizadas · {monthLabel}
      </p>
    </div>
  );
}
