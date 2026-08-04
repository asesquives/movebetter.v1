import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_client",
  title: "Detalle de cliente",
  description:
    "Devuelve el detalle de un cliente: datos de contacto, paquetes contratados y próximas citas.",
  inputSchema: { client_id: z.string().describe("UUID del cliente.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: client, error } = await supabase
      .from("clients")
      .select("id, full_name, email, phone, notes, total_visits, first_visit_at, last_visit_at, lifetime_value")
      .eq("id", client_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!client) return { content: [{ type: "text", text: "Cliente no encontrado" }], isError: true };

    const [{ data: packages }, { data: appointments }] = await Promise.all([
      supabase
        .from("packages")
        .select("id, name, total_sessions, sessions_used, price_paid, price_per_session, status, expires_at")
        .eq("client_id", client_id),
      supabase
        .from("appointments")
        .select("id, scheduled_at, status, type, staff_id, package_id, price")
        .eq("client_id", client_id)
        .order("scheduled_at", { ascending: false })
        .limit(20),
    ]);

    const payload = { client, packages: packages ?? [], appointments: appointments ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
