// Temporary seed runner — executes raw SQL using service role.
// SECURITY: protected by a shared secret header. Delete after seeding.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = req.headers.get("x-seed-token");
  const expected = Deno.env.get("SEED_RUNNER_TOKEN");
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let body: { sql?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let sql = body.sql ?? "";
  if (!sql && body.url) {
    const r = await fetch(body.url);
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "fetch failed", status: r.status }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    sql = await r.text();
  }
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
  return new Response(JSON.stringify({ ok: true, result: data }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
