import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  DashboardPeriod,
  getPeriodRange,
  getPreviousPeriodRange,
} from "@/lib/dashboard-period";

interface Props {
  period: DashboardPeriod;
}

const formatPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const DIAGNOSIS_TYPES = ["medical_diagnosis", "physio_diagnosis"] as const;

const COHORT_START = new Date("2025-12-01T00:00:00Z");

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
        p.type !== "medical_diagnosis" &&
        p.type !== "physio_diagnosis" &&
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
      const [pkgsRes, soloRes, apptsActivityRes, allClientsRes] = await Promise.all([
        supabase
          .from("packages")
          .select("client_id, total_paid, created_at"),
        // citas sueltas (sin package) realizadas
        supabase
          .from("appointments")
          .select("client_id, revenue_amount, start_time, status, package_id")
          .eq("status", "done")
          .is("package_id", null),
        // actividad en el período (cualquier cita no cancelada o paquete creado)
        supabase
          .from("appointments")
          .select("client_id, start_time")
          .gte("start_time", startIso)
          .lte("start_time", endIso)
          .neq("status", "cancelled"),
        // todos los clientes con timestamp de creación
        supabase
          .from("clients")
          .select("id, created_at"),
      ]);
      if (pkgsRes.error) throw pkgsRes.error;
      if (soloRes.error) throw soloRes.error;
      if (apptsActivityRes.error) throw apptsActivityRes.error;
      if (allClientsRes.error) throw allClientsRes.error;

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

      // First-activity per client (cita o paquete) — define cohorte
      const firstAct = new Map<string, number>();
      const consider = (cid: string | null, ts: string | null) => {
        if (!cid || !ts) return;
        const t = new Date(ts).getTime();
        const prev = firstAct.get(cid);
        if (prev === undefined || t < prev) firstAct.set(cid, t);
      };
      // Use packages.created_at and a single read for all appointments (status non-cancelled)
      // We already have packages above for paid amounts — reuse for date.
      (pkgsRes.data ?? []).forEach((p) => consider(p.client_id, p.created_at));
      // Need ALL appointments (not only the period ones) for first activity
      const { data: allAppts, error: eAll } = await supabase
        .from("appointments")
        .select("client_id, start_time, status")
        .neq("status", "cancelled");
      if (eAll) throw eAll;
      (allAppts ?? []).forEach((a) => consider(a.client_id, a.start_time));

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

      // Tabla de cohortes desde diciembre 2025 hasta el mes actual
      const cohortMap = new Map<string, { count: number; sum: number }>();
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      // Inicializar todos los meses del rango
      let cursor = new Date(COHORT_START);
      while (cursor <= currentMonthStart) {
        const key = format(cursor, "yyyy-MM");
        cohortMap.set(key, { count: 0, sum: 0 });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }

      firstAct.forEach((ts, cid) => {
        if (ts < COHORT_START.getTime()) return;
        const d = new Date(ts);
        const key = format(startOfMonth(d), "yyyy-MM");
        const bucket = cohortMap.get(key);
        if (!bucket) return;
        bucket.count += 1;
        bucket.sum += ltvByClient.get(cid) ?? 0;
      });

      const cohorts = Array.from(cohortMap.entries())
        .map(([key, v]) => ({
          key,
          date: new Date(`${key}-01T00:00:00Z`),
          count: v.count,
          avg: v.count > 0 ? v.sum / v.count : null,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return { avgLtv, cohorts };
    },
  });

  // Conversion card visuals
  const curPct = conv?.curPct ?? null;
  const prevPct = conv?.prevPct ?? null;
  const convColor =
    curPct == null
      ? "text-foreground"
      : curPct > 60
        ? "text-emerald-600"
        : curPct >= 40
          ? "text-amber-600"
          : "text-red-600";

  const diff =
    curPct != null && prevPct != null ? curPct - prevPct : null;
  const sign = diff == null ? 0 : diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const Icon = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;
  const diffColor =
    diff == null
      ? "text-muted-foreground"
      : sign > 0
        ? "text-emerald-600"
        : sign < 0
          ? "text-red-600"
          : "text-muted-foreground";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Adquisición de clientes</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Métrica 1: Conversión diagnóstico → paquete */}
        <div className="bg-card rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">
            Conversión diagnóstico → paquete
          </p>
          <p className={`text-3xl font-bold mt-1 tabular-nums ${convColor}`}>
            {curPct == null ? "—" : `${curPct.toFixed(1)}%`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {conv == null
              ? "—"
              : `${conv.cur.numerator} de ${conv.cur.denominator} clientes evaluados compraron un paquete`}
          </p>
          {diff == null ? (
            <p className="text-xs text-muted-foreground mt-2">Sin datos previos</p>
          ) : (
            <p
              className={`text-xs mt-2 flex items-center gap-1 font-medium ${diffColor}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {Math.abs(diff).toFixed(1)} pts vs {prevRange.shortLabel}
            </p>
          )}
        </div>

        {/* Métrica 2: LTV promedio + cohortes */}
        <div className="bg-card rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">
            LTV promedio (clientes activos del período)
          </p>
          <p className="text-3xl font-bold mt-1 tabular-nums">
            {ltv?.avgLtv == null ? "—" : formatPEN(ltv.avgLtv)}
          </p>

          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              LTV por cohorte mensual
            </p>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Mes</th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      Clientes
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      LTV promedio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(ltv?.cohorts ?? []).map((c) => (
                    <tr key={c.key} className="border-t">
                      <td className="px-3 py-1.5 capitalize">
                        {format(c.date, "MMMM yyyy", { locale: es })}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {c.count}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {c.avg == null ? "—" : formatPEN(c.avg)}
                      </td>
                    </tr>
                  ))}
                  {(!ltv?.cohorts || ltv.cohorts.length === 0) && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-3 text-center text-muted-foreground"
                      >
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
