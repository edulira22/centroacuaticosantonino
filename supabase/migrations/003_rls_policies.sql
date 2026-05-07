-- AquaControl — Centro Acuático Chihuahua
-- Migración 003: Row Level Security (RLS) — activar desde el inicio

-- ============================================================
-- Habilitar RLS en todas las tablas
-- ============================================================
ALTER TABLE usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bajas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidentes_enfermeria ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora            ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE paquetes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pago        ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivos_baja        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: obtener rol del usuario autenticado desde JWT
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'rol'),
    'recepcion'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- CATÁLOGOS: lectura para todos, escritura solo admin+
-- ============================================================

-- Horarios
CREATE POLICY "horarios_lectura"
  ON horarios FOR SELECT USING (true);
CREATE POLICY "horarios_admin"
  ON horarios FOR ALL USING (get_user_role() IN ('admin', 'superadmin'));

-- Paquetes
CREATE POLICY "paquetes_lectura"
  ON paquetes FOR SELECT USING (true);
CREATE POLICY "paquetes_admin"
  ON paquetes FOR ALL USING (get_user_role() IN ('admin', 'superadmin'));

-- Métodos de pago
CREATE POLICY "metodos_pago_lectura"
  ON metodos_pago FOR SELECT USING (true);
CREATE POLICY "metodos_pago_admin"
  ON metodos_pago FOR ALL USING (get_user_role() IN ('admin', 'superadmin'));

-- Motivos de baja
CREATE POLICY "motivos_baja_lectura"
  ON motivos_baja FOR SELECT USING (true);
CREATE POLICY "motivos_baja_admin"
  ON motivos_baja FOR ALL USING (get_user_role() IN ('admin', 'superadmin'));

-- ============================================================
-- USUARIOS: lectura y creación para todos, edición solo admin+
-- ============================================================
CREATE POLICY "usuarios_lectura"
  ON usuarios FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "usuarios_insertar"
  ON usuarios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "usuarios_editar"
  ON usuarios FOR UPDATE USING (get_user_role() IN ('admin', 'superadmin'));

-- ============================================================
-- PAGOS: lectura e inserción para todos, anulación solo admin+
-- ============================================================
CREATE POLICY "pagos_lectura"
  ON pagos FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "pagos_insertar"
  ON pagos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "pagos_editar"
  ON pagos FOR UPDATE USING (get_user_role() IN ('admin', 'superadmin'));

-- ============================================================
-- ASISTENCIAS: lectura e inserción para todos
-- ============================================================
CREATE POLICY "asistencias_lectura"
  ON asistencias FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "asistencias_insertar"
  ON asistencias FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- BITÁCORA: inserción para todos, lectura solo admin+
-- ============================================================
CREATE POLICY "bitacora_insertar"
  ON bitacora FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bitacora_lectura"
  ON bitacora FOR SELECT USING (get_user_role() IN ('admin', 'superadmin'));

-- ============================================================
-- NOTAS, BAJAS, INCIDENTES: autenticación requerida para todo
-- ============================================================
CREATE POLICY "notas_auth"
  ON notas FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "bajas_auth"
  ON bajas FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "incidentes_auth"
  ON incidentes_enfermeria FOR ALL USING (auth.uid() IS NOT NULL);
