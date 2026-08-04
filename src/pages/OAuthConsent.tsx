import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MictioLogo } from "@/components/MictioLogo";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Falta el parámetro authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("El servidor de autorización no devolvió una URL de redirección.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "la aplicación";

  return (
    <main className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-popover p-8">
        <div className="flex items-center gap-2 mb-6">
          <MictioLogo size={28} />
          <div>
            <h2 className="text-sm font-bold tracking-tight">Move Better</h2>
            <p className="text-[11px] text-muted-foreground">Autorización de acceso</p>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar esta solicitud: {error}</p>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-2">Conectar {clientName} a tu cuenta</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {clientName} podrá consultar y crear información en Move Better actuando como tú.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                Aprobar
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Denegar
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
