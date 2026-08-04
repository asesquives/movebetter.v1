import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const STANDALONE_PRICE: Record<string, number> = {
  medical_diagnosis: 120,
  physio_diagnosis: 100,
  rehabilitation: 90,
  prehabilitation: 90,
  recovery: 70,
};

export default defineTool({
  name: "revenue_summary",
  title: "Resumen de ingresos",
  description:
    "Resume los ingresos de un periodo: cobrado (pagos registrados) y devengado (sesiones realizadas valorizadas).",
  inputSchema: {
    from: z.string().describe("Fecha inicial ISO (YYYY-MM-DD)."),
    to: z.string().describe("Fecha final ISO (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { content: [{ type: "text", text: "Fechas inválidas" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const [{ data: payments, error: payErr }, { data: appointments, error: apptErr }] = await Promise.all([
      supabase
        .from("payments")
        .select("amount, paid_at, status")
        .gte("paid_at", start.toISOString())
        .lte("paid_at", end.toISOString()),
      supabase
        .from("appointments")
        .select("id, scheduled_at, type, price, package_id")
        .eq("status", "done")
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString()),
    ]);
    if (payErr) return { content: [{ type: "text", text: payErr.message }], isError: true };
    if (apptErr) return { content: [{ type: "text", text: apptErr.message }], isError: true };

    const packageIds = [...new Set((appointments ?? []).map((a) => a.package_id).filter(Boolean))] as string[];
    let packagePrices: Record<string, number> = {};
    if (packageIds.length) {
      const { data: pkgs } = await supabase
        .from("packages")
        .select("id, price_per_session, total_paid, total_sessions")
        .in("id", packageIds);
      packagePrices = Object.fromEntries(
        (pkgs ?? []).map((p) => [
          p.id,
          Number(p.price_per_session) ||
            (p.total_sessions ? Number(p.total_paid ?? 0) / Number(p.total_sessions) : 0),
        ]),
      );
    }

    const collected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const accrued = (appointments ?? []).reduce((sum, a) => {
      const fromPackage = a.package_id ? packagePrices[a.package_id] ?? 0 : 0;
      const value = fromPackage || Number(a.price ?? 0) || STANDALONE_PRICE[a.type ?? ""] || 0;
      return sum + value;
    }, 0);

    const payload = {
      from: start.toISOString(),
      to: end.toISOString(),
      collected: Math.round(collected * 100) / 100,
      accrued: Math.round(accrued * 100) / 100,
      sessions_done: appointments?.length ?? 0,
      payments_count: payments?.length ?? 0,
      currency: "PEN",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
