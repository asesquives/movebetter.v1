import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClientsTool from "./tools/list-clients";
import getClientTool from "./tools/get-client";
import listAppointmentsTool from "./tools/list-appointments";
import createAppointmentTool from "./tools/create-appointment";
import listServicesTool from "./tools/list-services";
import listStaffTool from "./tools/list-staff";
import revenueSummaryTool from "./tools/revenue-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "movebetter-v1",
  title: "movebetter.v1",
  version: "0.1.0",
  instructions:
    "Herramientas del CRM de la clínica de fisioterapia Move Better: consultar clientes, agenda, catálogo de servicios, equipo e ingresos (cobrado y devengado), y agendar nuevas citas. Todo opera con la identidad del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listClientsTool,
    getClientTool,
    listAppointmentsTool,
    createAppointmentTool,
    listServicesTool,
    listStaffTool,
    revenueSummaryTool,
  ],
});
