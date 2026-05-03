import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { SESSION_TYPE_COLORS } from "@/lib/agenda-constants";
import { formatCurrency } from "@/lib/format";

type FilterType = "month" | "week" | "custom";

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
      // Anchor month at noon Lima to avoid TZ drift in date-fns calculations
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

  // Revenue entries (devengado)
  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ["revenue-entries", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_entries")
        .select("*, clients(name), packages(name)")
        .gte("recognized_at", start)
        .lte("recognized_at", end)
        .order("recognized_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Revenue entries with appointment + package details for the table
  const { data: detailedEntries } = useQuery({
    queryKey: ["revenue-detailed", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_entries")
        .select("*, clients(name), packages(name), appointments(type, professionals(name))")
        .gte("recognized_at", start)
        .lte("recognized_at", end)
        .order("recognized_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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

  const cobrado = periodPackages?.reduce((s, p) => s + Number(p.total_paid), 0) || 0;
  const devengado = entries?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const diferido = cobrado - devengado;

  const exportCSV = () => {
    if (!detailedEntries?.length) return;
    const headers = ["Fecha", "Cliente", "Tipo de sesión", "Profesional", "Paquete", "Monto"];
    const rows = detailedEntries.map((e) => {
      const appt = e.appointments as any;
      const typeConfig = appt?.type ? SESSION_TYPE_COLORS[appt.type as keyof typeof SESSION_TYPE_COLORS] : null;
      return [
        format(new Date(e.recognized_at), "dd/MM/yyyy"),
        (e.clients as any)?.name || "—",
        typeConfig?.label || appt?.type || "—",
        appt?.professionals?.name || "—",
        (e.packages as any)?.name || "Sesión suelta",
        Number(e.amount).toFixed(2),
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
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!detailedEntries?.length}>
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

      {/* Detail table */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Devengo por sesión</h2>
        </div>
        {entriesLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : !detailedEntries?.length ? (
          <div className="p-8 text-center text-muted-foreground">No hay ingresos devengados en este período</div>
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
              {detailedEntries.map((e) => {
                const appt = e.appointments as any;
                const pkg = e.packages as any;
                const typeConfig = appt?.type ? SESSION_TYPE_COLORS[appt.type as keyof typeof SESSION_TYPE_COLORS] : null;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{format(new Date(e.recognized_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{(e.clients as any)?.name || "—"}</TableCell>
                    <TableCell>
                      {typeConfig ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className={`w-2 h-2 rounded-full ${typeConfig.bg}`} />
                          {typeConfig.label}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{appt?.professionals?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pkg?.name || <span className="italic">Sesión suelta</span>}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(Number(e.amount), { decimals: 2 })}</TableCell>
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
