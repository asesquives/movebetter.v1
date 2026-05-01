import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  /** Optional content below the value (delta badge, hint, badge row, etc.) */
  footer?: ReactNode;
  /** Optional override for the main value color (e.g. retention thresholds). */
  valueClassName?: string;
  className?: string;
}

/**
 * Mictio MetricCard — single source of truth for dashboard cards.
 * - Surface, border, radius, padding from `.mictio-card`
 * - Label: 11px / 600 / uppercase / muted
 * - Value: 28px / 800 / -0.03em / text color
 */
export default function MetricCard({
  label,
  value,
  footer,
  valueClassName,
  className,
}: Props) {
  return (
    <div className={cn("mictio-card bg-card border border-border rounded-[10px]", className)} style={{ padding: "20px 22px" }}>
      <p className="mictio-card-label">{label}</p>
      <p className={cn("mictio-card-value mt-2 tabular-nums", valueClassName)}>
        {value}
      </p>
      {footer != null && <div className="mt-3">{footer}</div>}
    </div>
  );
}
