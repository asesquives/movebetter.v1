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
  formatter,
  previousLabel,
}: Props) {
  const hasData = cur != null && prev != null;
  const diff = hasData ? (cur as number) - (prev as number) : null;
  const pct =
    hasData && (prev as number) !== 0 ? ((diff as number) / (prev as number)) * 100 : null;

  const sign = diff == null ? 0 : diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const Icon = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;
  const deltaClass =
    sign > 0 ? "mictio-delta mictio-delta--pos"
    : sign < 0 ? "mictio-delta mictio-delta--neg"
    : "mictio-delta mictio-delta--neu";

  const formatDiff = (n: number) => {
    const abs = Math.abs(n);
    const body = formatter ? formatter(abs) : formatNumber(abs);
    const prefix = n > 0 ? "+" : n < 0 ? "−" : "";
    return `${prefix}${body}`;
  };

  const valueColor =
    sign > 0 ? 'var(--mictio-green)'
    : sign < 0 ? 'var(--mictio-red)'
    : 'var(--mictio-text)';

  return (
    <div
      className="mictio-card"
      style={{
        background: 'var(--mictio-surface)',
        border: '1px solid var(--mictio-border)',
        borderRadius: '10px',
        padding: '20px 22px',
      }}
    >
      <p className="mictio-card-label">{title}</p>
      <p className="mictio-card-value mt-2 tabular-nums" style={{ color: valueColor }}>
        {!hasData ? "—" : formatDiff(diff as number)}
      </p>
      {!hasData ? (
        <p className="text-[12px] text-[color:var(--mictio-muted)] mt-3">Sin datos previos</p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <span className={deltaClass}>
            <Icon className="h-3 w-3" />
            {pct == null ? "—" : `${Math.abs(pct).toFixed(1)}%`}
          </span>
          <span className="text-[12px] text-[color:var(--mictio-text-sec)]">
            vs {previousLabel}
          </span>
        </div>
      )}
    </div>
  );
}
