import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowRight, Lock, Unlock, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  clientId: string;
}

interface SessionNote {
  id: string;
  appointment_id: string;
  staff_id: string;
  eva_inicial: number | null;
  eva_final: number | null;
  tecnicas_aplicadas: string[] | null;
  evolucion: string | null;
  observaciones: string;
  plan_siguiente: string | null;
  firmado: boolean | null;
  numero_colegiatura: string | null;
  fecha_firma: string | null;
  created_at: string | null;
  appointments: { scheduled_at: string | null } | null;
  staff: { name: string; metadata: any } | null;
}

const TECHNIQUE_LABELS: Record<string, string> = {
  AF: "Agentes Físicos",
  K: "Kinesioterapia",
  TR: "Tec. de Recuperación",
};

export function ClinicalSessionsHistory({ clientId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["session-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_notes")
        .select(
          "id, appointment_id, staff_id, eva_inicial, eva_final, tecnicas_aplicadas, evolucion, observaciones, plan_siguiente, firmado, numero_colegiatura, fecha_firma, created_at, appointments(scheduled_at), staff(name, metadata)",
        )
        .eq("client_id", clientId);
      if (error) throw error;
      return (data ?? []) as unknown as SessionNote[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando sesiones...</p>;
  if (!notes || notes.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Aún no hay sesiones registradas para este cliente.
      </div>
    );
  }

  // Sort ascending for chart, descending for timeline
  const dateOf = (n: SessionNote) =>
    n.appointments?.scheduled_at || n.fecha_firma || n.created_at || new Date().toISOString();

  const sortedAsc = [...notes].sort(
    (a, b) => new Date(dateOf(a)).getTime() - new Date(dateOf(b)).getTime(),
  );
  const sortedDesc = [...sortedAsc].reverse();

  const chartData = sortedAsc.map((n, i) => ({
    label: format(new Date(dateOf(n)), "dd MMM", { locale: es }),
    sesion: i + 1,
    inicial: n.eva_inicial,
    final: n.eva_final,
  }));

  return (
    <div className="space-y-6">
      {/* Pain evolution chart */}
      <div className="bg-card rounded-lg border p-5">
        <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-4">
          Evolución del dolor (EVA)
        </h4>
        {chartData.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Se necesitan al menos 2 sesiones para ver la evolución
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="inicial"
                  name="EVA inicial"
                  stroke="var(--mictio-red)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="final"
                  name="EVA final"
                  stroke="var(--mictio-green)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Línea de tiempo de sesiones ({notes.length})
        </h4>
        <div className="space-y-2">
          {sortedDesc.map((n) => {
            const idxAsc = sortedAsc.findIndex((x) => x.id === n.id);
            const sessionNumber = idxAsc + 1;
            const isOpen = expanded === n.id;
            const evaI = n.eva_inicial ?? 0;
            const evaF = n.eva_final ?? 0;
            const diff = evaF - evaI;
            const deltaColor =
              diff < 0
                ? "var(--mictio-green)"
                : diff > 0
                  ? "var(--mictio-red)"
                  : "hsl(var(--muted-foreground))";
            const colegiatura =
              n.numero_colegiatura ||
              (n.staff?.metadata as any)?.numero_colegiatura ||
              (n.staff?.metadata as any)?.colegiatura ||
              null;

            return (
              <div key={n.id} className="bg-card rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : n.id)}
                  className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">Sesión #{sessionNumber}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {format(new Date(dateOf(n)), "d MMM yyyy, HH:mm", { locale: es })}
                        </span>
                        {n.firmado ? (
                          <Lock className="h-3.5 w-3.5 text-[color:var(--mictio-green)]" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {n.staff?.name || "—"}
                        {colegiatura ? ` · Col. ${colegiatura}` : ""}
                      </p>
                      <div className="flex items-center gap-2 text-sm pt-1">
                        <span className="tabular-nums">{evaI}</span>
                        <ArrowRight className="h-3.5 w-3.5" style={{ color: deltaColor }} />
                        <span className="tabular-nums font-semibold" style={{ color: deltaColor }}>
                          {evaF}
                        </span>
                        <span className="text-xs text-muted-foreground">EVA</span>
                      </div>
                      {n.tecnicas_aplicadas && n.tecnicas_aplicadas.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {n.tecnicas_aplicadas.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded-full border bg-muted/40 font-medium"
                            >
                              {TECHNIQUE_LABELS[t] || t}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm pt-2 text-foreground/90 whitespace-pre-wrap">
                        {n.observaciones}
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t bg-muted/20 p-4 space-y-3 text-sm">
                    {n.evolucion && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Evolución vs sesión anterior
                        </p>
                        <p className="whitespace-pre-wrap">{n.evolucion}</p>
                      </div>
                    )}
                    {n.plan_siguiente && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Plan para próxima sesión
                        </p>
                        <p className="whitespace-pre-wrap">{n.plan_siguiente}</p>
                      </div>
                    )}
                    {n.firmado && n.fecha_firma && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Firmado el {format(new Date(n.fecha_firma), "d MMM yyyy, HH:mm", { locale: es })}
                        {colegiatura ? ` · Col. ${colegiatura}` : ""}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
