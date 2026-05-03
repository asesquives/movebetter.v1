import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
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


const DIAGNOSIS_TYPES = ["medical_diagnosis", "physio_diagnosis"] as const;

async function computeConversion(startIso: string, endIso: string) {
  // Diagnosed clients: those with a 'done' diagnosis appointment in the period
  const { data: diags, error: e1 } = await supabase
    .from("appointments")
    .select("client_id, start_time, type, status")
    .gte("start_time", startIso)
    .lte("start_time", endIso)
    .eq("status", "done")
    .in("type", DIAGNOSIS_TYPES);
  if (e1) throw e1;

  // Earliest diagnosis date per client in period
  const firstDiag = new Map<string, number>();
  (diags ?? []).forEach((d) => {
    if (!d.client_id) return;
    const t = new Date(d.start_time).getTime();
    const prev = firstDiag.get(d.client_id);
    if (prev === undefined || t < prev) firstDiag.set(d.client_id, t);
  });

  if (firstDiag.size === 0) {
    return { numerator: 0, denominator: 0 };
  }

  // Get all packages for these clients (any non-diagnosis package)
  const clientIds = Array.from(firstDiag.keys());
  const { data: pkgs, error: e2 } = await supabase
    .from("packages")
    .select("client_id, type, created_at")
    .in("client_id", clientIds);
  if (e2) throw e2;

  let converted = 0;
  for (const [cid, diagTs] of firstDiag) {
    const has = (pkgs ?? []).some(
      (p) =>
        p.client_id === cid &&
        p.type !== "diagnosis" &&
        new Date(p.created_at).getTime() >= diagTs,
    );
    if (has) converted += 1;
  }

  return { numerator: converted, denominator: firstDiag.size };
}

export default function AcquisitionMetrics({ period }: Props) {
  const range = getPeriodRange(period);
  const prevRange = getPreviousPeriodRange(period);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  const prevStartIso = prevRange.start.toISOString();
  const prevEndIso = prevRange.end.toISOString();

  const { data: conv } = useQuery({
    queryKey: ["acq-conversion", startIso, endIso, prevStartIso, prevEndIso],
    queryFn: async () => {
      const [cur, prev] = await Promise.all([
        computeConversion(startIso, endIso),
        computeConversion(prevStartIso, prevEndIso),
      ]);
      const pctOf = (n: number, d: number) => (d > 0 ? (n / d) * 100 : null);
      return {
        cur,
        prev,
        curPct: pctOf(cur.numerator, cur.denominator),
        prevPct: pctOf(prev.numerator, prev.denominator),
      };
    },
  });

  // LTV: average for clients active in current period + cohort table (all-time)
  const { data: ltv } = useQuery({
    queryKey: ["acq-ltv", startIso, endIso],
    queryFn: async () => {
      const [pkgsRes, soloRes, apptsActivityRes] = await Promise.all([
        supabase.from("packages").select("client_id, total_paid"),
        // citas sueltas (sin package) realizadas
        supabase
          .from("appointments")
          .select("client_id, revenue_amount")
          .eq("status", "done")
          .is("package_id", null),
        // actividad en el período
        supabase
          .from("appointments")
          .select("client_id")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .neq("status", "cancelled"),
      ]);
      if (pkgsRes.error) throw pkgsRes.error;
      if (soloRes.error) throw soloRes.error;
      if (apptsActivityRes.error) throw apptsActivityRes.error;

      // Sum LTV per client
      const ltvByClient = new Map<string, number>();
      (pkgsRes.data ?? []).forEach((p) => {
        if (!p.client_id) return;
        ltvByClient.set(
          p.client_id,
          (ltvByClient.get(p.client_id) ?? 0) + Number(p.total_paid ?? 0),
        );
      });
      (soloRes.data ?? []).forEach((a) => {
        if (!a.client_id) return;
        ltvByClient.set(
          a.client_id,
          (ltvByClient.get(a.client_id) ?? 0) + Number(a.revenue_amount ?? 0),
        );
      });

      // LTV promedio general (clientes activos en el período)
      const activeInPeriod = new Set<string>();
      (apptsActivityRes.data ?? []).forEach(
        (a) => a.client_id && activeInPeriod.add(a.client_id),
      );
      let activeLtvSum = 0;
      let activeLtvCount = 0;
      activeInPeriod.forEach((cid) => {
        if (ltvByClient.has(cid)) {
          activeLtvSum += ltvByClient.get(cid) ?? 0;
          activeLtvCount += 1;
        } else {
          activeLtvCount += 1; // include with 0 LTV
        }
      });
      const avgLtv = activeLtvCount > 0 ? activeLtvSum / activeLtvCount : null;

      return { avgLtv };
    },
  });

  // Conversion card visuals
  const curPct = conv?.curPct ?? null;
  const prevPct = conv?.prevPct ?? null;
  const convColor =
    curPct == null
      ? undefined
      : curPct > 60
        ? "var(--mictio-green)"
        : curPct >= 40
          ? "var(--mictio-amber)"
          : "var(--mictio-red)";

  const diff =
    curPct != null && prevPct != null ? curPct - prevPct : null;
  const sign = diff == null ? 0 : diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const Icon = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;
  const deltaClass =
    sign > 0 ? "mictio-delta mictio-delta--pos"
    : sign < 0 ? "mictio-delta mictio-delta--neg"
    : "mictio-delta mictio-delta--neu";

  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-semibold tracking-tight">Adquisición de clientes</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mictio-stagger">
        {/* Métrica 1: Conversión diagnóstico → paquete */}
        <div className="mictio-card">
          <p className="mictio-card-label">Conversión diagnóstico → paquete</p>
          <p
            className="mictio-card-value mt-2 tabular-nums"
            style={{ color: convColor }}
          >
            {curPct == null ? "—" : `${curPct.toFixed(1)}%`}
          </p>
          <p className="text-[12px] text-[color:var(--mictio-text-sec)] mt-2">
            {conv == null
              ? "—"
              : `${conv.cur.numerator} de ${conv.cur.denominator} clientes evaluados compraron un paquete`}
          </p>
          {diff == null ? (
            <p className="text-[12px] text-[color:var(--mictio-muted)] mt-3">Sin datos previos</p>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <span className={deltaClass}>
                <Icon className="h-3 w-3" />
                {Math.abs(diff).toFixed(1)} pts
              </span>
              <span className="text-[12px] text-[color:var(--mictio-text-sec)]">
                vs {prevRange.shortLabel}
              </span>
            </div>
          )}
        </div>

        {/* Métrica 2: LTV promedio */}
        <div className="mictio-card">
          <p className="mictio-card-label">LTV promedio (clientes activos del período)</p>
          <p className="mictio-card-value mt-2 tabular-nums">
            {ltv?.avgLtv == null ? "—" : formatCurrency(ltv.avgLtv)}
          </p>
          <p className="text-[12px] text-[color:var(--mictio-text-sec)] mt-3">
            promedio de gasto total por cliente activo
          </p>
        </div>
      </div>
    </div>
  );
}
