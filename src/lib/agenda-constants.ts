import { Database } from "@/integrations/supabase/types";

export type AppointmentType = Database["public"]["Enums"]["appointment_type"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export type SessionTypeConfig = { bg: string; text: string; label: string };

export const UNKNOWN_SESSION_TYPE_CONFIG: SessionTypeConfig = {
  bg: "bg-muted",
  text: "text-muted-foreground",
  label: "Tipo desconocido",
};

export const SESSION_TYPE_COLORS: Record<AppointmentType, SessionTypeConfig> = {
  medical_diagnosis: { bg: "bg-blue-500", text: "text-blue-700", label: "Diagnóstico médico" },
  physio_diagnosis: { bg: "bg-sky-400", text: "text-sky-700", label: "Diagnóstico fisio" },
  rehabilitation: { bg: "bg-emerald-500", text: "text-emerald-700", label: "Rehabilitación" },
  prehabilitation: { bg: "bg-amber-400", text: "text-amber-700", label: "Prehabilitación" },
  recovery: { bg: "bg-gray-400", text: "text-gray-600", label: "Recuperación" },
};

export function getSessionTypeConfig(type: AppointmentType | string | null | undefined): SessionTypeConfig {
  if (!type) return UNKNOWN_SESSION_TYPE_CONFIG;
  return SESSION_TYPE_COLORS[type as AppointmentType] ?? {
    ...UNKNOWN_SESSION_TYPE_CONFIG,
    label: String(type),
  };
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  done: "Realizada",
  cancelled: "Cancelada",
  no_show: "No-show",
  pending: "Pendiente",
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  done: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
  pending: "bg-amber-100 text-amber-700",
};

export const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am to 7pm

export const PACKAGE_TYPE_MAP: Record<string, string[]> = {
  rehabilitation: ["rehabilitation"],
  prehabilitation: ["prehabilitation"],
  recovery: ["recovery"],
};
