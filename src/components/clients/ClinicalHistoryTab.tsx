import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Pencil } from "lucide-react";

interface Props {
  clientId: string;
}

interface FormState {
  dni_paciente: string;
  motivo_consulta: string;
  antecedentes_medicos: string;
  diagnostico_inicial: string;
  plan_tratamiento: string;
  consentimiento_firmado: boolean;
  fecha_consentimiento: string; // yyyy-mm-dd
}

const emptyForm: FormState = {
  dni_paciente: "",
  motivo_consulta: "",
  antecedentes_medicos: "",
  diagnostico_inicial: "",
  plan_tratamiento: "",
  consentimiento_firmado: false,
  fecha_consentimiento: format(new Date(), "yyyy-MM-dd"),
};

export function ClinicalHistoryTab({ clientId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: record, isLoading } = useQuery({
    queryKey: ["clinical-record", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_records")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Resolve current user's staff_id by matching profile full_name to staff.name within tenant
  const { data: staffId } = useQuery({
    queryKey: ["current-staff-id", user?.id],
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
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("name", profile.full_name ?? "")
        .maybeSingle();
      if (byName?.id) return byName.id;
      const { data: anyStaff } = await supabase
        .from("staff")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return anyStaff?.id ?? null;
    },
    enabled: !!user,
  });

  const startCreate = () => {
    setForm(emptyForm);
    setEditing(true);
  };

  const startEdit = () => {
    if (!record) return;
    setForm({
      dni_paciente: record.dni_paciente ?? "",
      motivo_consulta: record.motivo_consulta ?? "",
      antecedentes_medicos: record.antecedentes_medicos ?? "",
      diagnostico_inicial: record.diagnostico_inicial ?? "",
      plan_tratamiento: record.plan_tratamiento ?? "",
      consentimiento_firmado: !!record.consentimiento_firmado,
      fecha_consentimiento: record.fecha_consentimiento
        ? format(new Date(record.fecha_consentimiento), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    });
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!staffId) throw new Error("No se pudo identificar al profesional logueado");
      if (!form.consentimiento_firmado) throw new Error("Debes marcar el consentimiento informado");

      const consentDate = new Date(form.fecha_consentimiento + "T12:00:00").toISOString();

      if (record) {
        // Edit mode — do not modify signed consent fields
        const updatePayload: any = {
          dni_paciente: form.dni_paciente,
          motivo_consulta: form.motivo_consulta,
          antecedentes_medicos: form.antecedentes_medicos || null,
          diagnostico_inicial: form.diagnostico_inicial,
          plan_tratamiento: form.plan_tratamiento,
        };
        if (!record.consentimiento_firmado) {
          updatePayload.consentimiento_firmado = form.consentimiento_firmado;
          updatePayload.fecha_consentimiento = consentDate;
          updatePayload.consentimiento_recibido_por = staffId;
        }
        const { error } = await supabase
          .from("clinical_records")
          .update(updatePayload)
          .eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clinical_records").insert({
          client_id: clientId,
          dni_paciente: form.dni_paciente,
          motivo_consulta: form.motivo_consulta,
          antecedentes_medicos: form.antecedentes_medicos || null,
          diagnostico_inicial: form.diagnostico_inicial,
          plan_tratamiento: form.plan_tratamiento,
          consentimiento_firmado: form.consentimiento_firmado,
          fecha_consentimiento: consentDate,
          consentimiento_recibido_por: staffId,
          created_by: staffId,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinical-record", clientId] });
      setEditing(false);
      toast.success(record ? "Historia clínica actualizada" : "Historia clínica creada correctamente");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  // Form view (create or edit)
  if (editing) {
    const consentLocked = !!record?.consentimiento_firmado;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <Label>DNI del paciente *</Label>
          <Input
            value={form.dni_paciente}
            onChange={(e) => setForm({ ...form, dni_paciente: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Motivo de consulta *</Label>
          <Textarea
            value={form.motivo_consulta}
            onChange={(e) => setForm({ ...form, motivo_consulta: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Antecedentes médicos relevantes</Label>
          <Textarea
            value={form.antecedentes_medicos}
            onChange={(e) => setForm({ ...form, antecedentes_medicos: e.target.value })}
          />
        </div>
        <div>
          <Label>Diagnóstico fisioterapéutico inicial *</Label>
          <Textarea
            value={form.diagnostico_inicial}
            onChange={(e) => setForm({ ...form, diagnostico_inicial: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Plan de tratamiento *</Label>
          <Textarea
            value={form.plan_tratamiento}
            onChange={(e) => setForm({ ...form, plan_tratamiento: e.target.value })}
            required
          />
        </div>

        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="flex items-start gap-2">
            <Checkbox
              id="consent"
              checked={form.consentimiento_firmado}
              disabled={consentLocked}
              onCheckedChange={(c) => setForm({ ...form, consentimiento_firmado: c === true })}
            />
            <Label htmlFor="consent" className="text-sm leading-snug cursor-pointer">
              El paciente ha leído y firmado el consentimiento informado
            </Label>
          </div>
          <div>
            <Label>Fecha de firma *</Label>
            <Input
              type="date"
              value={form.fecha_consentimiento}
              disabled={consentLocked}
              onChange={(e) => setForm({ ...form, fecha_consentimiento: e.target.value })}
              required
            />
          </div>
          {consentLocked && (
            <p className="text-xs text-muted-foreground">
              El consentimiento ya está firmado y no puede modificarse.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  // Empty state
  if (!record) {
    return (
      <div className="bg-card rounded-lg border p-6 text-center space-y-3">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Este cliente aún no tiene historia clínica.</p>
        <Button onClick={startCreate}>Crear historia clínica</Button>
      </div>
    );
  }

  // Read-only view
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={startEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
        </Button>
      </div>
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <Row label="DNI del paciente" value={record.dni_paciente} />
        <Row label="Motivo de consulta" value={record.motivo_consulta} />
        <Row label="Antecedentes médicos" value={record.antecedentes_medicos} />
        <Row label="Diagnóstico inicial" value={record.diagnostico_inicial} />
        <Row label="Plan de tratamiento" value={record.plan_tratamiento} />
        <Row
          label="Consentimiento informado"
          value={
            record.consentimiento_firmado
              ? `Firmado el ${
                  record.fecha_consentimiento
                    ? format(new Date(record.fecha_consentimiento), "dd/MM/yyyy")
                    : "—"
                }`
              : "Pendiente"
          }
        />
      </div>
      <ClinicalSessionsHistory clientId={clientId} />
    </div>
  );
}
