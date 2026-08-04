import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_appointment",
  title: "Agendar cita",
  description:
    "Crea una nueva cita agendada para un cliente con un profesional en una fecha y hora determinadas.",
  inputSchema: {
    client_id: z.string().describe("UUID del cliente."),
    staff_id: z.string().describe("UUID del profesional que atenderá."),
    scheduled_at: z.string().describe("Fecha y hora de inicio en ISO 8601."),
    duration_minutes: z.number().int().optional().describe("Duración en minutos (por defecto 60)."),
    type: z
      .string()
      .optional()
      .describe("Tipo: rehabilitation, prehabilitation, recovery, medical_diagnosis, physio_diagnosis."),
    package_id: z.string().optional().describe("UUID del paquete al que se descuenta la sesión."),
    notes: z.string().optional().describe("Notas de la cita."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const start = new Date(input.scheduled_at);
    if (Number.isNaN(start.getTime())) {
      return { content: [{ type: "text", text: "scheduled_at inválido" }], isError: true };
    }
    const duration = Math.min(Math.max(input.duration_minutes ?? 60, 15), 240);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        client_id: input.client_id,
        staff_id: input.staff_id,
        scheduled_at: start.toISOString(),
        start_time: start.toISOString(),
        end_time: new Date(start.getTime() + duration * 60000).toISOString(),
        duration_minutes: duration,
        status: "scheduled",
        type: input.type ?? null,
        package_id: input.package_id ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { appointment: data },
    };
  },
});
