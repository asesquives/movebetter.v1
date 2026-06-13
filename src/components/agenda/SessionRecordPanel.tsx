import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { getSessionTypeConfig, AppointmentType, AppointmentStatus } from "@/lib/agenda-constants";
import { toast } from "sonner";

interface Appointment {
  id: string;
  start_time: string;
  type: AppointmentType;
  status: AppointmentStatus;
  package_id: string | null;
  client_id: string;
  clients: { name: string } | null;
  professionals: { name: string; type: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

const TECHNIQUES = [
  {
    key: "AF",
    label: "Agentes Físicos (AF)",
    detail: "Electroterapia, Magnetoterapia, Tecarterapia, Ondas de choque",
  },
  {
    key: "K",
    label: "Kinesioterapia (K)",
    detail: "Ejercicio terapéutico, Movilidad",
  },
  {
    key: "TR",
    label: "Tecnología de Recuperación (TR)",
    detail: "Percusión, Presoterapia, Criocompresión",
  },
];

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function SessionRecordPanel({ open, onOpenChange, appointment }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [evaInicial, setEvaInicial] = useState<number>(0);
  const [evaFinal, setEvaFinal] = useState<number>(0);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [evolucion, setEvolucion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [planSiguiente, setPlanSiguiente] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEvaInicial(0);
      setEvaFinal(0);
      setTechniques([]);
      setEvolucion("");
      setObservaciones("");
      setPlanSiguiente("");
      setPassword("");
    }
  }, [open, appointment?.id]);

  // Session number within current package
  const { data: sessionNumber } = useQuery({
    queryKey: ["session-number", appointment?.id, appointment?.package_id, appointment?.client_id],
    queryFn: async () => {
      if (!appointment) return 1;
      let q = supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("client_id", appointment.client_id)
        .eq("status", "done");
      if (appointment.package_id) q = q.eq("package_id", appointment.package_id);
      else q = q.is("package_id", null);
      const { count, error } = await q;
      if (error) throw error;
      return (count ?? 0) + 1;
    },
    enabled: open && !!appointment,
  });

  // Resolve current staff (for firmado_por + numero_colegiatura)
  const { data: staff } = useQuery({
    queryKey: ["current-staff", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, tenant_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.tenant_id) return null;
      const { data: byName } = await supabase
        .from("staff")
        .select("id, name, metadata")
        .eq("tenant_id", profile.tenant_id)
        .eq("name", profile.full_name ?? "")
        .maybeSingle();
      if (byName) return byName;
      const { data: anyStaff } = await supabase
        .from("staff")
        .select("id, name, metadata")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return anyStaff;
    },
    enabled: open && !!user,
  });

  const toggleTechnique = (key: string, checked: boolean) => {
    setTechniques((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const close = useMutation({
    mutationFn: async () => {
      if (!appointment || !user?.email) throw new Error("Sesión no válida");
      if (!staff?.id) throw new Error("No se pudo identificar al profesional logueado");
      if (techniques.length === 0) throw new Error("Selecciona al menos una técnica");
      if (!observaciones.trim()) throw new Error("Las observaciones son obligatorias");
      if (!password) throw new Error("Ingresa tu contraseña");

      // 1. Verify password
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authErr) throw new Error("Contraseña incorrecta");

      // 2. Generate firma_hash
      const ts = new Date().toISOString();
      const firmaHash = await sha256(
        `${observaciones}|${evaInicial}|${evaFinal}|${appointment.id}|${ts}`,
      );

      const numeroColegiatura =
        (staff.metadata as any)?.numero_colegiatura ??
        (staff.metadata as any)?.colegiatura ??
        null;

      // 3. Insert session_notes
      const { error: insErr } = await supabase.from("session_notes").insert({
        appointment_id: appointment.id,
        client_id: appointment.client_id,
        staff_id: staff.id,
        eva_inicial: evaInicial,
        eva_final: evaFinal,
        tecnicas_aplicadas: techniques,
        evolucion: evolucion || null,
        observaciones,
        plan_siguiente: planSiguiente || null,
        firmado: true,
        firmado_por: staff.id,
        numero_colegiatura: numeroColegiatura,
        fecha_firma: ts,
        firma_hash: firmaHash,
      } as any);
      if (insErr) throw insErr;

      // 4. Mark appointment as done
      const { error: updErr } = await supabase
        .from("appointments")
        .update({ status: "done" })
        .eq("id", appointment.id);
      if (updErr) throw updErr;
    },
    onMutate: () => setSubmitting(true),
    onSettled: () => setSubmitting(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["week-appointments"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      qc.invalidateQueries({ queryKey: ["revenue"] });
      qc.invalidateQueries({ queryKey: ["revenue-entries"] });
      qc.invalidateQueries({ queryKey: ["revenue-detailed"] });
      qc.invalidateQueries({ queryKey: ["revenue-all"] });
      toast.success("Sesión cerrada y firmada correctamente");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!appointment) return null;
  const typeConfig = getSessionTypeConfig(appointment.type);
  const canSubmit =
    techniques.length > 0 && observaciones.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registro de sesión</SheetTitle>
          <SheetDescription>Documenta y firma para cerrar la cita</SheetDescription>
        </SheetHeader>

        {/* Read-only header */}
        <div className="mt-6 rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium">{appointment.clients?.name || "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Tipo</span>
            <span className="font-medium">{typeConfig.label}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Fecha y hora</span>
            <span className="font-medium">
              {format(new Date(appointment.start_time), "EEE d MMM, HH:mm", { locale: es })}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">N° sesión</span>
            <span className="font-medium">{sessionNumber ?? "—"}</span>
          </div>
        </div>

        <form
          className="mt-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            close.mutate();
          }}
        >
          {/* EVA inicial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dolor antes de la sesión (EVA inicial)</Label>
              <span className="text-sm font-semibold tabular-nums">{evaInicial}/10</span>
            </div>
            <Slider
              value={[evaInicial]}
              min={0}
              max={10}
              step={1}
              onValueChange={(v) => setEvaInicial(v[0] ?? 0)}
            />
          </div>

          {/* EVA final */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dolor al terminar la sesión (EVA final)</Label>
              <span className="text-sm font-semibold tabular-nums">{evaFinal}/10</span>
            </div>
            <Slider
              value={[evaFinal]}
              min={0}
              max={10}
              step={1}
              onValueChange={(v) => setEvaFinal(v[0] ?? 0)}
            />
          </div>

          {/* Techniques */}
          <div className="space-y-2">
            <Label>Técnicas aplicadas *</Label>
            <div className="space-y-2">
              {TECHNIQUES.map((t) => (
                <label
                  key={t.key}
                  className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={techniques.includes(t.key)}
                    onCheckedChange={(c) => toggleTechnique(t.key, c === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Evolución vs sesión anterior</Label>
            <Textarea value={evolucion} onChange={(e) => setEvolucion(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Observaciones *</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Plan para próxima sesión</Label>
            <Textarea
              value={planSiguiente}
              onChange={(e) => setPlanSiguiente(e.target.value)}
              rows={3}
            />
          </div>

          {/* Signature */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-medium">Para cerrar esta sesión, confirme su identidad</p>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full text-white"
              style={{ backgroundColor: "#CC2222" }}
            >
              {submitting ? "Firmando..." : "Firmar y cerrar sesión"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
