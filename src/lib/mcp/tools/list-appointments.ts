import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_appointments",
  title: "Listar citas",
  description:
    "Lista las citas de la agenda en un rango de fechas, opcionalmente filtradas por estado o por profesional.",
  inputSchema: {
    from: z.string().optional().describe("Fecha inicial ISO (YYYY-MM-DD). Por defecto hoy."),
    to: z.string().optional().describe("Fecha final ISO (YYYY-MM-DD). Por defecto 7 días después."),
    status: z.string().optional().describe("Estado: scheduled, done, cancelled, no_show, pending."),
    staff_id: z.string().optional().describe("UUID del profesional."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, status, staff_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const start = from ? new Date(from) : new Date();
    const end = to ? new Date(to) : new Date(start.getTime() + 7 * 86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { content: [{ type: "text", text: "Fechas inválidas" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("appointments")
      .select("id, client_id, staff_id, package_id, service_id, scheduled_at, duration_minutes, status, type, price, notes")
      .gte("scheduled_at", start.toISOString())
      .lte("scheduled_at", end.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(200);
    if (status) query = query.eq("status", status);
    if (staff_id) query = query.eq("staff_id", staff_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
