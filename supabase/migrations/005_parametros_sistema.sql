-- ============================================================
-- Migración 005: Parámetros del sistema
-- ============================================================
CREATE TABLE parametros_sistema (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       VARCHAR(100) UNIQUE NOT NULL,
  valor       TEXT NOT NULL DEFAULT '',
  tipo        VARCHAR(20) NOT NULL DEFAULT 'texto'
              CHECK (tipo IN ('numero', 'texto')),
  descripcion TEXT,
  es_sistema  BOOLEAN NOT NULL DEFAULT false,  -- true = no se puede borrar
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Parámetros iniciales del negocio
INSERT INTO parametros_sistema (clave, valor, tipo, descripcion, es_sistema) VALUES
  ('multa_pago_tardio',
   '0',
   'numero',
   'Monto de la multa por pago realizado fuera de la primera semana del mes',
   true),
  ('dias_gracia_pago',
   '7',
   'numero',
   'Días al inicio del mes en que se acepta el pago sin aplicar multa',
   true),
  ('nombre_centro',
   'Centro Acuático Chihuahua',
   'texto',
   'Nombre oficial del centro (aparece en documentos y reportes)',
   true);

-- RLS: solo admin puede leer/escribir parámetros
ALTER TABLE parametros_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_parametros" ON parametros_sistema
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') IN ('admin', 'superadmin')
  );
