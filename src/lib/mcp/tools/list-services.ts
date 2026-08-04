import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_services",
  title: "Catálogo de servicios",
  description: "Lista el catálogo de servicios/paquetes con su programa, número de sesiones y precios.",
  inputSchema: {
    program: z.string().optional().describe("Filtrar por programa, p. ej. Rehabilitación o Recovery."),
    only_active: z.boolean().optional().describe("Solo servicios activos (por defecto true)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ program, only_active }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("services")
      .select("id, name, program, category, sessions, price, price_per_session, duration_minutes, active")
      .order("program", { ascending: true });
    if (only_active !== false) query = query.eq("active", true);
    if (program) query = query.eq("program", program);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { services: data ?? [] },
    };
  },
});
