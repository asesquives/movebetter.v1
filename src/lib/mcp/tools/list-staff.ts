import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_staff",
  title: "Listar equipo",
  description: "Lista los profesionales del equipo con su rol, tipo y horario de disponibilidad.",
  inputSchema: {
    only_active: z.boolean().optional().describe("Solo profesionales activos (por defecto true)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_active }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("staff")
      .select("id, name, role, type, is_active, schedule_days, schedule_start, schedule_end")
      .order("name", { ascending: true });
    if (only_active !== false) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { staff: data ?? [] },
    };
  },
});
