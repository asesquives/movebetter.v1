import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { getSessionTypeConfig } from "@/lib/agenda-constants";
import { formatCurrency } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type FilterType = "month" | "week" | "custom";

// Map appointment.type → program label
const PROGRAM_BY_TYPE: Record<string, string> = {
  recovery: "Recovery",
  prehabilitation: "Prehabilitation",
  rehabilitation: "Rehabilitación",
  physio_diagnosis: "Evaluación",
  medical_diagnosis: "Evaluación",
};

const STANDALONE_PRICES: Record<string, number> = {
  medical_diagnosis: 200,
  physio_diagnosis: 150,
  recovery: 70,
};

type DoneAppt = {
  id: string;
  scheduled_at: string;
  type: string | null;
  price: number | null;
  package_id: string | null;
  service_id: string | null;
  staff_id: string | null;
  client_id: string | null;
};

type EnrichedAppt = DoneAppt & {
  amount: number;
  program: string;
  client_name: string;
  staff_name: string;
  package_name: string | null;
};

async function fetchDoneAppointments(startIso?: string, endIso?: string): Promise<EnrichedAppt[]> {
  let q = supabase
    .from("appointments")
    .select("id, scheduled_at, type, price, package_id, service_id, staff_id, client_id")
    .eq("status", "done");
  if (startIso) q = q.gte("scheduled_at", startIso);
  if (endIso) q = q.lte("scheduled_at", endIso);
  const { data: appts, error } = await q.order("scheduled_at", { ascending: false });
  if (error) throw error;
  const rows = (appts ?? []) as DoneAppt[];
  if (rows.length === 0) return [];

  const pkgIds = Array.from(new Set(rows.map((a) => a.package_id).filter(Boolean) as string[]));
  const svcIds = Array.from(new Set(rows.map((a) => a.service_id).filter(Boolean) as string[]));
  const clientIds = Array.from(new Set(rows.map((a) => a.client_id).filter(Boolean) as string[]));
  const staffIds = Array.from(new Set(rows.map((a) => a.staff_id).filter(Boolean) as string[]));

  const [pkgRes, svcRes, clientRes, staffRes] = await Promise.all([
    pkgIds.length
      ? supabase.from("packages").select("id, name, price_per_session, price_paid, total_sessions").in("id", pkgIds)
      : Promise.resolve({ data: [], error: null } as any),
    svcIds.length
      ? supabase.from("services").select("id, price, price_per_session, program").in("id", svcIds)
      : Promise.resolve({ data: [], error: null } as any),
    clientIds.length
      ? supabase.from("clients").select("id, name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null } as any),
    staffIds.length
      ? supabase.from("staff").select("id, name").in("id", staffIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const pkgMap = new Map<string, any>();
  for (const p of pkgRes.data ?? []) pkgMap.set(p.id, p);
  const svcMap = new Map<string, any>();
  for (const s of svcRes.data ?? []) svcMap.set(s.id, s);
  const clientMap = new Map<string, string>();
  for (const c of clientRes.data ?? []) clientMap.set(c.id, c.name);
  const staffMap = new Map<string, string>();
  for (const s of staffRes.data ?? []) staffMap.set(s.id, s.name);

  return rows.map((a) => {
    let amount = 0;
    let packageName: string | null = null;
    let svcProgram: string | null = null;
    if (a.package_id) {
      const p = pkgMap.get(a.package_id);
      if (p) {
        packageName = p.name ?? null;
        let pps = Number(p.price_per_session ?? 0);
        if (!pps && p.total_sessions && Number(p.total_sessions) > 0) {
          pps = Number(p.price_paid ?? 0) / Number(p.total_sessions);
        }
        amount = pps || 0;
      }
    } else if (a.price != null && Number(a.price) > 0) {
      amount = Number(a.price);
    }
    if (a.service_id) {
      const s = svcMap.get(a.service_id);
      if (s) {
        if (!amount) amount = Number(s.price_per_session ?? s.price ?? 0);
        svcProgram = (s as any).program ?? null;
      }
    }
    if (!amount && a.type) amount = STANDALONE_PRICES[a.type] ?? 0;

    // Infer type from appointment.type, service.program, or package name
    let inferredType: string | null = a.type ?? null;
    if (!inferredType && svcProgram) inferredType = svcProgram.toLowerCase();
    if (!inferredType) {
      const src = `${packageName ?? ""}`.toLowerCase();
      if (src.includes("prehab")) inferredType = "prehabilitation";
      else if (src.includes("rehab")) inferredType = "rehabilitation";
      else if (src.includes("recovery") || src.includes("recuper")) inferredType = "recovery";
      else if (src.includes("diagnós") || src.includes("evalua")) inferredType = "physio_diagnosis";
    }

    return {
      ...a,
      type: inferredType,
      amount,
      program: inferredType ? PROGRAM_BY_TYPE[inferredType] ?? "Otro" : "Otro",
      client_name: a.client_id ? clientMap.get(a.client_id) ?? "—" : "—",
      staff_name: a.staff_id ? staffMap.get(a.staff_id) ?? "—" : "—",
      package_name: packageName,
    };
  });
}

export default function IngresosPage() {
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [customStart, setCustomStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  const { start, end } = useMemo(() => {
    const LIMA_OFFSET = "-05:00";
    const pad = (n: number) => String(n).padStart(2, "0");
    const toLimaIso = (d: Date, endOfDay = false) => {
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
      return `${y}-${m}-${day}T${time}${LIMA_OFFSET}`;
    };

    const fallback = new Date();

    if (filterType === "month") {
      const base = month ? new Date(`${month}-01T12:00:00${LIMA_OFFSET}`) : fallback;
      const safeBase = isNaN(base.getTime()) ? fallback : base;
      return {
        start: toLimaIso(startOfMonth(safeBase), false),
        end: toLimaIso(endOfMonth(safeBase), true),
      };
    } else if (filterType === "week") {
      const base = month ? new Date(`${month}-01T12:00:00${LIMA_OFFSET}`) : fallback;
      const safeBase = isNaN(base.getTime()) ? fallback : base;
      return {
        start: toLimaIso(startOfWeek(safeBase, { weekStartsOn: 1 }), false),
        end: toLimaIso(endOfWeek(safeBase, { weekStartsOn: 1 }), true),
      };
    }
    const s = customStart ? new Date(`${customStart}T12:00:00${LIMA_OFFSET}`) : fallback;
    const e = customEnd ? new Date(`${customEnd}T12:00:00${LIMA_OFFSET}`) : fallback;
    return {
      start: toLimaIso(isNaN(s.getTime()) ? fallback : s, false),
      end: toLimaIso(isNaN(e.getTime()) ? fallback : e, true),
    };
  }, [filterType, month, customStart, customEnd]);

  // Devengado (period): completed appointments in [start, end]
  const { data: doneAppts, isLoading: doneLoading } = useQuery({
    queryKey: ["devengado-appts", start, end],
    queryFn: () => fetchDoneAppointments(start, end),
  });

  // Devengado by month: last 12 months, independent of period
  const last12Start = useMemo(() => {
    const d = startOfMonth(subMonths(new Date(), 11));
    return d.toISOString();
  }, []);
  const { data: yearAppts } = useQuery({
    queryKey: ["devengado-12m", last12Start],
    queryFn: () => fetchDoneAppointments(last12Start, undefined),
  });

  // Packages created in period (cobrado)
  const { data: periodPackages } = useQuery({
    queryKey: ["packages-period", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("total_paid")
        .gte("created_at", start)
        .lte("created_at", end);
      if (error) throw error;
      return data;
    },
  });

  const cobrado = periodPackages?.reduce((s, p) => s + Number(p.total_paid ?? 0), 0) || 0;
  const devengado = doneAppts?.reduce((s, a) => s + a.amount, 0) || 0;
  const diferido = cobrado - devengado;

  // By month chart data
  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i));
      map.set(format(d, "yyyy-MM"), 0);
    }
    for (const a of yearAppts ?? []) {
      const key = format(new Date(a.scheduled_at), "yyyy-MM");
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + a.amount);
    }
    return Array.from(map.entries()).map(([k, v]) => ({
      month: format(new Date(`${k}-01T12:00:00`), "MMM yy", { locale: es }),
      total: Number(v.toFixed(2)),
    }));
  }, [yearAppts]);

  // By professional
  const byStaff = useMemo(() => {
    const map = new Map<string, { name: string; total: number; sessions: number }>();
    for (const a of doneAppts ?? []) {
      const key = a.staff_id ?? "unknown";
      const prev = map.get(key) ?? { name: a.staff_name, total: 0, sessions: 0 };
      map.set(key, { name: a.staff_name, total: prev.total + a.amount, sessions: prev.sessions + 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [doneAppts]);

  // By program
  const byProgram = useMemo(() => {
    const map = new Map<string, { total: number; sessions: number }>();
    for (const a of doneAppts ?? []) {
      const prev = map.get(a.program) ?? { total: 0, sessions: 0 };
      map.set(a.program, { total: prev.total + a.amount, sessions: prev.sessions + 1 });
    }
    return Array.from(map.entries())
      .map(([program, v]) => ({ program, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [doneAppts]);

  const exportCSV = () => {
    if (!doneAppts?.length) return;
    const headers = ["Fecha", "Cliente", "Tipo de sesión", "Profesional", "Paquete", "Monto"];
    const rows = doneAppts.map((a) => {
      const typeConfig = getSessionTypeConfig(a.type);
      return [
        format(new Date(a.scheduled_at), "dd/MM/yyyy"),
        a.client_name,
        a.type ? typeConfig.label : "—",
        a.staff_name,
        a.package_name || "Sesión suelta",
        a.amount.toFixed(2),
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingresos_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Ingresos</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {filterType === "month" && <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />}
          {filterType === "week" && <Input type="week" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />}
          {filterType === "custom" && (
            <>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-auto" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-auto" />
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!doneAppts?.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="mictio-card">
          <p className="text-sm text-muted-foreground">Cobrado</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(cobrado, { decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">Paquetes vendidos en el período</p>
        </div>
        <div className="mictio-card">
          <p className="text-sm text-muted-foreground">Devengado</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(devengado, { decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">Sesiones realizadas en el período</p>
        </div>
        <div className="mictio-card">
          <p className="text-sm text-muted-foreground">Saldo diferido</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(diferido, { decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">Cobrado − Devengado</p>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="mictio-card">
        <h2 className="font-semibold mb-3">Devengado por mes (últimos 12 meses)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatCurrency(v, { decimals: 2 })}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="mictio-card">
          <h2 className="font-semibold mb-3">Devengado por fisio / evaluador</h2>
          {byStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
          ) : (
            <ul className="space-y-2">
              {byStaff.map((s) => (
                <li key={s.name} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.sessions} {s.sessions === 1 ? "sesión" : "sesiones"}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(s.total, { decimals: 2 })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mictio-card">
          <h2 className="font-semibold mb-3">Devengado por programa</h2>
          {byProgram.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
          ) : (
            <ul className="space-y-2">
              {byProgram.map((p) => (
                <li key={p.program} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{p.program}</p>
                    <p className="text-xs text-muted-foreground">{p.sessions} {p.sessions === 1 ? "sesión" : "sesiones"}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.total, { decimals: 2 })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Devengo por sesión</h2>
        </div>
        {doneLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : !doneAppts?.length ? (
          <div className="p-8 text-center text-muted-foreground">No hay sesiones realizadas en este período</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Paquete</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doneAppts.map((a) => {
                const typeConfig = a.type ? getSessionTypeConfig(a.type) : null;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{format(new Date(a.scheduled_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{a.client_name}</TableCell>
                    <TableCell>
                      {typeConfig ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className={`w-2 h-2 rounded-full ${typeConfig.bg}`} />
                          {typeConfig.label}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{a.staff_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.package_name || <span className="italic">Sesión suelta</span>}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(a.amount, { decimals: 2 })}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
