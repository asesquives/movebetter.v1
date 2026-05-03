import { formatNumber } from "@/lib/format";
import MetricCard from "./MetricCard";

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
  formatter,
  previousLabel,
}: Props) {
  const hasData = cur != null && prev != null;
  const diff = hasData ? (cur as number) - (prev as number) : null;
  const pct =
    hasData && (prev as number) !== 0 ? ((diff as number) / (prev as number)) * 100 : null;

  const sign = diff == null ? 0 : diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const deltaClass =
    sign > 0 ? "mictio-delta mictio-delta--pos"
    : sign < 0 ? "mictio-delta mictio-delta--neg"
    : "mictio-delta mictio-delta--neu";
  const valueColor =
    sign > 0 ? "var(--mictio-green)"
    : sign < 0 ? "var(--mictio-red)"
    : "var(--mictio-text-sec)";

  const formatDiff = (n: number) => {
    const abs = Math.abs(n);
    const body = formatter ? formatter(abs) : formatNumber(abs);
    const prefix = n > 0 ? "+" : n < 0 ? "−" : "";
    return `${prefix}${body}`;
  };

  const formatAbsolute = (n: number) => formatter ? formatter(n) : formatNumber(n);

  return (
    <MetricCard
      label={title}
      value={!hasData ? "—" : formatAbsolute(cur as number)}
      valueStyle={{ color: valueColor }}
      footer={
        !hasData ? (
          <p className="text-[12px] text-[color:var(--mictio-muted)]">Sin datos previos</p>
        ) : (
          <div className="flex items-center gap-2">
            <span className={deltaClass}>
              {formatDiff(diff as number)}
              {pct != null && (
                <>
                  <span aria-hidden="true">·</span>
                  {`${diff! < 0 ? "−" : diff! > 0 ? "+" : ""}${Math.abs(pct).toFixed(0)}%`}
                </>
              )}
            </span>
            <span className="text-[12px] text-[color:var(--mictio-text-sec)]">
              vs {previousLabel}
            </span>
          </div>
        )
      }
    />
  );
}
