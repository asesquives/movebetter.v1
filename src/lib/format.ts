/**
 * Global number & currency formatting helpers.
 *
 * Rule: any number ≥ 1,000 must be displayed with thousands separator (comma).
 * Decimals: integers render without decimals; non-integers render with up to 2.
 *
 * Usage:
 *   formatNumber(7160)      → "7,160"
 *   formatNumber(663.46)    → "663.46"
 *   formatCurrency(1200)    → "S/ 1,200"
 *   formatCurrency(663.46)  → "S/ 663.46"
 *
 * `decimals` lets you force a specific decimal count (e.g. always 2 for prices).
 */

interface FormatOptions {
  /** Force a specific decimal count. If omitted, integers show no decimals and floats up to 2. */
  decimals?: number;
}

const buildFormatter = (decimals?: number) =>
  new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
    useGrouping: true,
  });

export function formatNumber(n: number | null | undefined, opts: FormatOptions = {}): string {
  if (n == null || Number.isNaN(n)) return "—";
  return buildFormatter(opts.decimals).format(n);
}

export function formatCurrency(n: number | null | undefined, opts: FormatOptions = {}): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `S/ ${buildFormatter(opts.decimals).format(n)}`;
}
