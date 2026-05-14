-- Migración 007: Corregir RLS + nuevo parámetro de baja automática
-- ============================================================

-- ── 1. Corregir get_user_role() ──────────────────────────────
-- user_metadata es editable por el propio usuario → inseguro en RLS.
-- app_metadata solo puede ser modificado por el servidor (service role) → seguro.

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'rol'),
    'recepcion'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── 2. Corregir política de parametros_sistema ───────────────
-- La política creada en migración 005 usaba user_metadata directamente.

DROP POLICY IF EXISTS "admin_parametros" ON parametros_sistema;

CREATE POLICY "admin_parametros" ON parametros_sistema
  FOR ALL USING (get_user_role() IN ('admin', 'superadmin'));

-- ── 3. Nuevo parámetro: días sin pago para baja automática ───

INSERT INTO parametros_sistema (clave, valor, tipo, descripcion, es_sistema)
VALUES (
  'dias_sin_pago_para_baja',
  '60',
  'numero',
  'Días sin pago acumulados a partir de los cuales el usuario puede ser dado de baja automáticamente (por defecto 2 meses = 60 días)',
  true
)
ON CONFLICT (clave) DO NOTHING;
