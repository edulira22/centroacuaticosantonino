-- ============================================================
-- Migración 009: Recálculo automático de estatus sin cron externo
--
-- Estrategia:
--   El layout del dashboard verifica si el estatus ya fue
--   recalculado hoy. Si no, muestra una pantalla de carga,
--   llama al recálculo completo y refresca la página.
--   Sin pg_cron, sin servicios externos.
-- ============================================================


-- ── 1. Parámetro para rastrear el último recálculo ───────────────────────────

INSERT INTO parametros_sistema (clave, valor, tipo, descripcion, es_sistema)
VALUES (
  'ultimo_recalculo_estatus',
  '2000-01-01',
  'texto',
  'Fecha del último recálculo automático de estatus (YYYY-MM-DD). Gestionado internamente.',
  true
)
ON CONFLICT (clave) DO NOTHING;


-- ── 2. Función: ¿necesita recalcularse hoy? (consulta rápida) ───────────────
--    SECURITY DEFINER para que funcione con cualquier rol (recepcion, admin…)

CREATE OR REPLACE FUNCTION necesita_recalculo_hoy()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT valor != CURRENT_DATE::TEXT
     FROM parametros_sistema
     WHERE clave = 'ultimo_recalculo_estatus'),
    true  -- Si no existe el parámetro, sí necesita recalcular
  );
$$;


-- ── 3. Función: recalcula solo si es un día nuevo ────────────────────────────
--    Llamada desde el API route /api/recalcular (POST)

CREATE OR REPLACE FUNCTION recalcular_si_es_nuevo_dia()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hoy TEXT := CURRENT_DATE::TEXT;
BEGIN
  -- Verificación final dentro de la transacción (evita doble ejecución)
  IF NOT necesita_recalculo_hoy() THEN
    RETURN false;
  END IF;

  -- Recalcular todos los socios (excluye baja y suspendido)
  PERFORM recalcular_todos_los_estatus();

  -- Registrar que ya se hizo hoy
  UPDATE parametros_sistema
  SET valor      = v_hoy,
      updated_at = now()
  WHERE clave = 'ultimo_recalculo_estatus';

  RETURN true;
END;
$$;
