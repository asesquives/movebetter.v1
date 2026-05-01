import { ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  /** Optional content below the value (delta badge, hint, badge row, etc.) */
  footer?: ReactNode;
  /** Optional override for the main value color (e.g. retention thresholds). */
  valueStyle?: CSSProperties;
  /** Optional class on the value (e.g. text-red-500 for state colors). */
  valueClassName?: string;
  className?: string;
}

const cardStyle: CSSProperties = {
  background: "var(--mictio-surface)",
  border: "1px solid var(--mictio-border)",
  borderRadius: "10px",
  padding: "20px 22px",
  boxShadow: "none",
};

const labelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--mictio-muted)",
  fontFamily: "Inter, sans-serif",
  margin: 0,
};

const valueStyleBase: CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "var(--mictio-text)",
  fontFamily: "Inter, sans-serif",
  lineHeight: 1.1,
  marginTop: "10px",
  fontVariantNumeric: "tabular-nums",
};

const footerStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 400,
  color: "var(--mictio-text-sec)",
  fontFamily: "Inter, sans-serif",
  marginTop: "12px",
};

/**
 * Mictio MetricCard — single source of truth for dashboard cards.
 * Hardcoded inline styles to bypass Tailwind/shadcn font-size overrides.
 */
export default function MetricCard({
  label,
  value,
  footer,
  valueStyle,
  valueClassName,
  className,
}: Props) {
  return (
    <div className={cn(className)} style={cardStyle}>
      <p style={labelStyle}>{label}</p>
      <p className={valueClassName} style={{ ...valueStyleBase, ...valueStyle }}>{value}</p>
      {footer != null && <div style={footerStyle}>{footer}</div>}
    </div>
  );
}
