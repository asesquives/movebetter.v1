import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface Props {
  title: string;
  cur: number | null | undefined;
  prev: number | null | undefined;
  unit?: { singular: string; plural: string };
  formatter?: (n: number) => string;
  previousLabel: string;
}

export default function DiffCard({
  title,
  cur,
  prev,
  formatter,
  previousLabel,
}: Props) {
  const hasData = cur != null && prev != null;
  const diff = hasData ? (cur as number) - (prev as number) : null;
  const pct =
    hasData && (prev as number) !== 0 ? ((diff as number) / (prev as number)) * 100 : null;

  const sign = diff == null ? 0 : diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const Icon = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;

  // Mictio: principal value coloured by delta sign
  const valueColor =
    !hasData
      ? "text-muted-foreground"
      : sign > 0
        ? "text-[#22C55E]"
        : sign < 0
          ? "text-[#EF4444]"
          : "text-foreground";

  const pillClass =
    sign > 0
      ? "mictio-delta mictio-delta-pos"
      : sign < 0
        ? "mictio-delta mictio-delta-neg"
        : "mictio-delta mictio-delta-neu";

  const formatDiff = (n: number) => {
    const abs = Math.abs(n);
    const body = formatter ? formatter(abs) : formatNumber(abs);
    const prefix = n > 0 ? "+" : n < 0 ? "−" : "";
    return `${prefix}${body}`;
  };

  return (
    <div className="mictio-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-muted-foreground">
        {title}
      </p>
      <p className={`text-[28px] font-extrabold mt-2 tabular-nums tracking-[-0.03em] ${valueColor}`}>
        {!hasData ? "—" : formatDiff(diff as number)}
      </p>
      {!hasData ? (
        <p className="text-xs text-muted-foreground mt-2">Sin datos previos</p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <span className={pillClass}>
            <Icon className="h-3 w-3" />
            {pct == null ? "—" : `${Math.abs(pct).toFixed(1)}%`}
          </span>
          <span className="text-[12px] text-muted-foreground">vs {previousLabel}</span>
        </div>
      )}
    </div>
  );
}
