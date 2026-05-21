import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import { DashboardPeriod, getPeriodRange } from "@/lib/dashboard-period";
import { formatCurrency } from "@/lib/format";

interface ClientPayment {
  client_id: string;
  client_name: string;
  total: number;
  sessions: number;
}

const STANDALONE_PRICES: Record<string, number> = {
  medical_diagnosis: 200,
  physio_diagnosis: 150,
  recovery: 70,
};

/**
 * Ranks clients by revenue actually realized in the period:
 * for each completed appointment (status='done') in [start, end],
 * add price_per_session of its package, or the appointment's own price
 * (falling back to STANDALONE_PRICES by type) if it has no package.
 */
async function fetchTopClientsByPaid(
  startIso: string | undefined,
  endIso: string | undefined,
  limit = 3,
): Promise<ClientPayment[]> {
  let apptQuery = supabase
    .from("appointments")
    .select("client_id, type, scheduled_at, price, package_id")
    .eq("status", "done");
  if (startIso) apptQuery = apptQuery.gte("scheduled_at", startIso);
  if (endIso) apptQuery = apptQuery.lte("scheduled_at", endIso);
  const { data: appts, error: apptErr } = await apptQuery;
  if (apptErr) throw apptErr;

  const pkgIds = Array.from(
    new Set((appts ?? []).map((a) => a.package_id).filter(Boolean) as string[]),
  );
  const pkgPriceById = new Map<string, number>();
  if (pkgIds.length > 0) {
    const { data: pkgs, error: pkgErr } = await supabase
      .from("packages")
      .select("id, price_per_session, price_paid, total_sessions")
      .in("id", pkgIds);
    if (pkgErr) throw pkgErr;
    for (const p of pkgs ?? []) {
      let pps = Number(p.price_per_session ?? 0);
      if (!pps && p.total_sessions && Number(p.total_sessions) > 0) {
        pps = Number(p.price_paid ?? 0) / Number(p.total_sessions);
      }
      pkgPriceById.set(p.id, pps);
    }
  }

  const totals = new Map<string, { total: number; sessions: number }>();
  for (const a of appts ?? []) {
    if (!a.client_id) continue;
    let price = 0;
    if (a.package_id) {
      price = pkgPriceById.get(a.package_id) ?? 0;
    } else {
      price = Number(a.price ?? 0) || STANDALONE_PRICES[a.type as string] || 0;
    }
    const prev = totals.get(a.client_id) ?? { total: 0, sessions: 0 };
    totals.set(a.client_id, {
      total: prev.total + price,
      sessions: prev.sessions + 1,
    });
  }

  const ids = Array.from(totals.keys());
  if (ids.length === 0) return [];

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", ids);

  return ids
    .map((id) => ({
      client_id: id,
      client_name: clients?.find((c) => c.id === id)?.name ?? "Desconocido",
      total: totals.get(id)!.total,
      sessions: totals.get(id)!.sessions,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

const rankIcons = [Crown, Medal, Award];
const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-700"];

function RankingList({
  data,
  loading,
  emptyText,
}: {
  data: ClientPayment[] | undefined;
  loading: boolean;
  emptyText: string;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ol className="space-y-2">
      {data.map((c, idx) => {
        const Icon = rankIcons[idx] ?? Trophy;
        return (
          <li
            key={c.client_id}
            className="flex items-center justify-between gap-3 bg-muted/30 rounded-md px-3 py-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={`h-4 w-4 shrink-0 ${rankColors[idx] ?? "text-muted-foreground"}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.sessions} {c.sessions === 1 ? "sesión realizada" : "sesiones realizadas"}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(c.total)}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface TopClientsProps {
  period: DashboardPeriod;
}

export default function TopClients({ period }: TopClientsProps) {
  const range = getPeriodRange(period);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  const last30Iso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: periodTop, isLoading: loadingPeriod } = useQuery({
    queryKey: ["top-clients-paid-period", startIso, endIso],
    queryFn: () => fetchTopClientsByPaid(startIso, endIso, 3),
  });

  const { data: allTime, isLoading: loadingAll } = useQuery({
    queryKey: ["top-clients-paid-all-time"],
    queryFn: () => fetchTopClientsByPaid(undefined, undefined, 3),
  });

  const { data: monthly, isLoading: loadingMonthly } = useQuery({
    queryKey: ["top-clients-paid-30d"],
    queryFn: () => fetchTopClientsByPaid(last30Iso, undefined, 3),
  });

  const featured = periodTop?.[0];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mejores clientes</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Featured card — #1 of selected period */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Cliente destacado</span>
            </div>
            {loadingPeriod ? (
              <p className="text-sm text-muted-foreground mt-3">Cargando...</p>
            ) : featured ? (
              <>
                <p className="text-xl font-bold mt-3 truncate">{featured.client_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {featured.sessions} {featured.sessions === 1 ? "sesión realizada" : "sesiones realizadas"} en el período
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">Sin pagos en el período</p>
            )}
          </div>
          {featured && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Total pagado</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(featured.total)}</p>
            </div>
          )}
        </div>

        {/* All-time top 3 */}
        <div className="mictio-card">
          <h3 className="text-sm font-semibold mb-3">Top 3 histórico</h3>
          <RankingList
            data={allTime}
            loading={loadingAll}
            emptyText="Aún no hay pagos registrados."
          />
        </div>

        {/* Last 30 days */}
        <div className="mictio-card">
          <h3 className="text-sm font-semibold mb-3">Top 3 últimos 30 días</h3>
          <RankingList
            data={monthly}
            loading={loadingMonthly}
            emptyText="Sin pagos en los últimos 30 días."
          />
        </div>
      </div>
    </div>
  );
}
