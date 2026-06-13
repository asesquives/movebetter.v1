CREATE OR REPLACE FUNCTION public.audit_clinical_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_campos jsonb;
  v_staff_id uuid;
  v_client_id uuid;
  v_tenant_id uuid;
BEGIN
  v_new := to_jsonb(NEW);
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_campos := v_new - v_old;
  END IF;

  v_staff_id := NULLIF(v_new->>'staff_id','')::uuid;
  IF v_staff_id IS NULL THEN
    v_staff_id := NULLIF(v_new->>'created_by','')::uuid;
  END IF;
  v_client_id := NULLIF(v_new->>'client_id','')::uuid;
  v_tenant_id := COALESCE(NULLIF(v_new->>'tenant_id','')::uuid, public.current_tenant_id());

  IF v_tenant_id IS NULL THEN
    RETURN NEW; -- skip audit if tenant cannot be resolved (e.g. backfill)
  END IF;

  INSERT INTO public.clinical_audit_log (
    tenant_id, action, table_name, record_id,
    client_id, staff_id, campos_modificados, valores_anteriores
  ) VALUES (
    v_tenant_id, LOWER(TG_OP), TG_TABLE_NAME, NEW.id,
    v_client_id, v_staff_id, v_campos, v_old
  );
  RETURN NEW;
END;
$function$;