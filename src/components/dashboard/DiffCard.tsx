import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface Props {
  title: string;
  cur: number | null | undefined;
  prev: number | null | undefined;
  /** Singular/plural unit suffix for the absolute diff (e.g. "cita" / "citas"). Optional. */
  unit?: { singular: string; plural: string };
  /** Formatter for the absolute diff. Defaults to integer with sign. */
  formatter?: (n: number) => string;
  /** Short label for the previous period (e.g. "marzo 2026", "semana anterior"). */
  previousLabel: string;
}

export default function DiffCard({
  title,
  cur,
  prev,
  unit,
  formatter,
  previousLabel,
}: Props) {
  const hasData = cur != null && prev != null;
  const diff = hasData ? (cur as number) - (prev as number) : null;
  const pct =
    hasData && (prev as number) !== 0 ? ((diff as number) / (prev as number)) * 100 : null;

  const sign = diff == null ? 0 : diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const Icon = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;
  const color =
    !hasData
      ? "text-muted-foreground"
      : sign > 0
        ? "text-emerald-600"
        : sign < 0
          ? "text-red-600"
          : "text-muted-foreground";

  const formatDiff = (n: number) => {
    const abs = Math.abs(n);
    const body = formatter ? formatter(abs) : intFmt.format(abs);
    const prefix = n > 0 ? "+" : n < 0 ? "−" : "";
    return `${prefix}${body}`;
  };

  return (
    <div className="bg-card rounded-lg border p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`text-3xl font-bold mt-1 tabular-nums ${color}`}>
        {!hasData ? "—" : formatDiff(diff as number)}
      </p>
      {!hasData ? (
        <p className="text-xs text-muted-foreground mt-2">Sin datos previos</p>
      ) : (
        <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${color}`}>
          <Icon className="h-3.5 w-3.5" />
          {pct == null ? "—" : `${Math.abs(pct).toFixed(1)}%`} vs {previousLabel}
        </p>
      )}
    </div>
  );
}
