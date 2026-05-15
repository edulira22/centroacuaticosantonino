-- ============================================================
-- Migration 008: Recálculo automático de estatus de usuarios
--
-- Problema que resuelve:
--   El campo `estatus` en la tabla `usuarios` puede quedar
--   desactualizado porque solo se actualiza al registrar un pago.
--   Los reportes y listas muestran estatus obsoleto.
--
-- Solución:
--   1. Función que recalcula el estatus de UN usuario (replica
--      la lógica de lib/vigencia.ts, ahora con baja automática).
--   2. Trigger en `pagos`: recalcula el usuario afectado al
--      insertar, actualizar o cancelar un pago.
--   3. Función para recalcular TODOS los usuarios (para cron diario).
--   4. Recálculo inicial al aplicar la migración.
-- ============================================================


-- ── 1. Función: recalcular estatus de UN usuario ─────────────────────────────

CREATE OR REPLACE FUNCTION recalcular_estatus_usuario(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estatus_actual  TEXT;
  v_dias_para_baja  INTEGER;
  v_primer_dia_mes  DATE;
  v_tiene_pago_mes  BOOLEAN;
  v_ultimo_pago     DATE;
  v_dias_sin_pago   INTEGER;
  v_nuevo_estatus   TEXT;
BEGIN
  -- Leer estatus actual del usuario
  SELECT estatus INTO v_estatus_actual
  FROM usuarios WHERE id = p_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Estatus permanentes (baja y suspendido) nunca se tocan automáticamente
  IF v_estatus_actual IN ('baja', 'suspendido') THEN RETURN; END IF;

  -- Leer parámetro dias_sin_pago_para_baja (default: 60)
  SELECT COALESCE(valor::INTEGER, 60)
  INTO v_dias_para_baja
  FROM parametros_sistema
  WHERE clave = 'dias_sin_pago_para_baja';

  IF v_dias_para_baja IS NULL THEN
    v_dias_para_baja := 60;
  END IF;

  -- Primer día del mes actual
  v_primer_dia_mes := date_trunc('month', CURRENT_DATE)::DATE;

  -- ¿Tiene pago vigente este mes (no anulado)?
  SELECT EXISTS (
    SELECT 1 FROM pagos
    WHERE usuario_id = p_id
      AND anulado   = false
      AND periodo_mes >= v_primer_dia_mes
  ) INTO v_tiene_pago_mes;

  IF v_tiene_pago_mes THEN
    -- ──────────────── ACTIVO ────────────────
    v_nuevo_estatus := 'activo';

  ELSE
    -- Buscar fecha del último pago válido
    SELECT fecha_pago INTO v_ultimo_pago
    FROM pagos
    WHERE usuario_id = p_id AND anulado = false
    ORDER BY fecha_pago DESC
    LIMIT 1;

    IF v_ultimo_pago IS NULL THEN
      -- Nunca ha pagado → pendiente
      v_nuevo_estatus := 'pendiente';

    ELSE
      -- Días transcurridos desde el último pago
      v_dias_sin_pago := (CURRENT_DATE - v_ultimo_pago);

      IF v_dias_sin_pago >= v_dias_para_baja THEN
        -- ──── BAJA AUTOMÁTICA por no pago ────
        v_nuevo_estatus := 'baja';
      ELSE
        -- ──────────────── VENCIDO ────────────
        v_nuevo_estatus := 'vencido';
      END IF;
    END IF;
  END IF;

  -- Solo escribir si cambió (evitar escrituras innecesarias)
  IF v_nuevo_estatus IS DISTINCT FROM v_estatus_actual THEN
    UPDATE usuarios
    SET estatus = v_nuevo_estatus
    WHERE id = p_id;
  END IF;
END;
$$;


-- ── 2. Función trigger: se dispara al cambiar la tabla pagos ─────────────────

CREATE OR REPLACE FUNCTION _trg_recalcular_estatus_por_pago()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalcular_estatus_usuario(OLD.usuario_id);
  ELSE
    PERFORM recalcular_estatus_usuario(NEW.usuario_id);
  END IF;
  RETURN NULL;
END;
$$;


-- ── 3. Trigger en pagos (INSERT, UPDATE, DELETE) ─────────────────────────────

DROP TRIGGER IF EXISTS trg_pagos_recalcular_estatus ON pagos;

CREATE TRIGGER trg_pagos_recalcular_estatus
  AFTER INSERT OR UPDATE OR DELETE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION _trg_recalcular_estatus_por_pago();


-- ── 4. Función: recalcular TODOS los usuarios activos ────────────────────────
--    Llamar diariamente via cron o manualmente cuando se requiera.

CREATE OR REPLACE FUNCTION recalcular_todos_los_estatus()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usuario RECORD;
  v_count   INTEGER := 0;
BEGIN
  FOR v_usuario IN
    SELECT id FROM usuarios
    WHERE estatus NOT IN ('baja', 'suspendido')
  LOOP
    PERFORM recalcular_estatus_usuario(v_usuario.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;


-- ── 5. Cron job diario a las 3:00 AM ─────────────────────────────────────────
--    Requiere tener la extensión pg_cron activada en Supabase:
--    Dashboard → Database → Extensions → pg_cron → Enable
--
--    Una vez activada, ejecutar manualmente:
--
--    SELECT cron.schedule(
--      'recalcular-estatus-diario',
--      '0 3 * * *',
--      'SELECT recalcular_todos_los_estatus()'
--    );


-- ── 6. Recálculo inicial al aplicar la migración ─────────────────────────────

SELECT recalcular_todos_los_estatus();
