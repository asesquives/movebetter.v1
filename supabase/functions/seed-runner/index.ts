// Temporary seed runner — fetches a SQL file from a URL and runs it via service role.
// Delete after seeding.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  if (!body.url || !/^https:\/\/paste\.rs\//.test(body.url)) {
    return new Response(JSON.stringify({ error: "url must be https://paste.rs/..." }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  const r = await fetch(body.url);
  if (!r.ok) {
    return new Response(JSON.stringify({ error: "fetch failed", status: r.status }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  const sql = await r.text();
  if (!sql.trim()) {
    return new Response(JSON.stringify({ error: "empty sql" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.rpc("exec_seed_sql", { p_sql: sql });
  if (error) {
    return new Response(JSON.stringify({ error: error.message, details: error }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, bytes: sql.length, result: data }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
