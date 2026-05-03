import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import {
  DashboardPeriod,
  getPeriodRange,
  getPreviousPeriodRange,
} from "@/lib/dashboard-period";

interface Props {
  period: DashboardPeriod;
}

type ApptType =
  | "medical_diagnosis"
  | "physio_diagnosis"
  | "rehabilitation"
  | "prehabilitation"
  | "recovery";

const TYPE_LABEL: Record<ApptType, string> = {
  medical_diagnosis: "Diagnóstico médico",
  physio_diagnosis: "Diagnóstico fisio",
  rehabilitation: "Rehabilitación",
  prehabilitation: "Prehabilitación",
  recovery: "Recovery",
};

const TYPE_FALLBACK_PRICE: Record<ApptType, number> = {
  medical_diagnosis: 200,
  physio_diagnosis: 150,
  recovery: 70,
  rehabilitation: 80,
  prehabilitation: 60,
};

export default function NoShowsSection({ period }: Props) {
  const range = getPeriodRange(period);
  const prevRange = getPreviousPeriodRange(period);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  const prevStartIso = prevRange.start.toISOString();
  const prevEndIso = prevRange.end.toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["noshows-section", startIso, endIso, prevStartIso, prevEndIso],
    queryFn: async () => {
      const [curRes, prevRes, totalCurRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, type, package_id, start_time")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .eq("status", "no_show"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", prevStartIso)
          .lte("start_time", prevEndIso)
          .eq("status", "no_show"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .neq("status", "cancelled"),
      ]);
      if (curRes.error) throw curRes.error;
      if (prevRes.error) throw prevRes.error;
      if (totalCurRes.error) throw totalCurRes.error;

      const noShows = curRes.data ?? [];
      const pkgIds = Array.from(
        new Set(noShows.map((a) => a.package_id).filter(Boolean) as string[]),
      );

      const pkgPrice = new Map<string, number>();
      if (pkgIds.length > 0) {
        const { data: pkgs, error } = await supabase
          .from("packages")
          .select("id, total_paid, total_sessions")
          .in("id", pkgIds);
        if (error) throw error;
        (pkgs ?? []).forEach((p) => {
          const sessions = Number(p.total_sessions ?? 0);
          const paid = Number(p.total_paid ?? 0);
          pkgPrice.set(p.id, sessions > 0 ? paid / sessions : 0);
        });
      }

      // Aggregate by type
      const byType = new Map<ApptType, { count: number; lost: number }>();
      let totalLost = 0;
      for (const a of noShows) {
        const t = a.type as ApptType;
        const fallback = TYPE_FALLBACK_PRICE[t] ?? 0;
        const amount = a.package_id ? pkgPrice.get(a.package_id) ?? 0 : fallback;
        totalLost += amount;
        const cur = byType.get(t) ?? { count: 0, lost: 0 };
        cur.count += 1;
        cur.lost += amount;
        byType.set(t, cur);
      }

      const rows = Array.from(byType.entries())
        .map(([type, v]) => ({ type, ...v }))
        .sort((a, b) => b.lost - a.lost);

      const totalAppts = totalCurRes.count ?? 0;
      const noShowRate =
        totalAppts > 0 ? (noShows.length / totalAppts) * 100 : null;

      return {
        curCount: noShows.length,
        prevCount: prevRes.count ?? 0,
        totalLost,
        noShowRate,
        rows,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">No-shows del período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mictio-card h-[110px] animate-pulse" />
          ))}
        </div>
        <div className="mictio-card h-[180px] animate-pulse" />
      </div>
    );
  }

  const cur = data?.curCount ?? 0;
  const prev = data?.prevCount ?? 0;
  const diff = cur - prev;
  const pct = prev !== 0 ? (diff / prev) * 100 : null;
  // For no-shows: down = good (green), up = bad (red)
  const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const Icon = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;
  const diffColor =
    prev === 0 && cur === 0
      ? "text-muted-foreground"
      : sign > 0
        ? "text-red-600"
        : sign < 0
          ? "text-emerald-600"
          : "text-muted-foreground";

  const rate = data?.noShowRate;
  const rateColor =
    rate == null
      ? "text-foreground"
      : rate < 5
        ? "text-emerald-600"
        : rate <= 10
          ? "text-amber-600"
          : "text-red-600";

  const maxLost = data?.rows?.[0]?.lost ?? 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">No-shows del período</h2>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="mictio-card">
          <p className="text-sm text-muted-foreground">No-shows del período</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{cur}</p>
          {prev === 0 && cur === 0 ? (
            <p className="text-xs text-muted-foreground mt-2">Sin datos previos</p>
          ) : (
            <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${diffColor}`}>
              <Icon className="h-3.5 w-3.5" />
              {pct == null ? `${diff > 0 ? "+" : ""}${diff}` : `${Math.abs(pct).toFixed(1)}%`}{" "}
              vs {prevRange.shortLabel}
            </p>
          )}
        </div>

        <div className="mictio-card">
          <p className="text-sm text-muted-foreground">Ingreso perdido</p>
          <p className="text-3xl font-bold mt-1 tabular-nums text-red-600">
            {formatCurrency(data?.totalLost ?? 0, { decimals: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            por citas no-show del período
          </p>
        </div>

        <div className="mictio-card">
          <p className="text-sm text-muted-foreground">Tasa de no-show</p>
          <p className={`text-3xl font-bold mt-1 tabular-nums ${rateColor}`}>
            {rate == null ? "—" : `${rate.toFixed(1)}%`}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            no-shows / citas del período
          </p>
        </div>
      </div>

      {/* Breakdown by type */}
      <div className="mictio-card">
        <h3 className="text-sm font-semibold mb-4">Ingreso perdido por tipo de sesión</h3>
        {!data?.rows || data.rows.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Sin no-shows en este período
          </div>
        ) : (
          <div className="space-y-3">
            {data.rows.map((r) => {
              const widthPct = maxLost > 0 ? (r.lost / maxLost) * 100 : 0;
              return (
                <div key={r.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{TYPE_LABEL[r.type]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {r.count} · {formatCurrency(r.lost)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: "#CC2222",
                      }}
                    />
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
