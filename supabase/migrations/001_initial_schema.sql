-- AquaControl — Centro Acuático Chihuahua
-- Migración 001: Esquema inicial completo
-- Regla: NUNCA se usa DELETE. Todo cambia de estado. Todo deja rastro.

-- Función reutilizable para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================================
-- 1. HORARIOS — catálogo de horarios disponibles
-- ============================================================
CREATE TABLE horarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(50)  NOT NULL,
  hora_inicio     TIME         NOT NULL,
  hora_fin        TIME         NOT NULL,
  cupo_maximo     INTEGER,
  activo          BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_horarios_updated_at
  BEFORE UPDATE ON horarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. PAQUETES — catálogo de tarifas/paquetes
-- ============================================================
CREATE TABLE paquetes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  VARCHAR(100) NOT NULL,
  codigo                  VARCHAR(30),
  precio_base             DECIMAL(10,2) NOT NULL,
  duracion_dias           INTEGER      NOT NULL DEFAULT 30,
  descripcion             TEXT,
  requiere_autorizacion   BOOLEAN      NOT NULL DEFAULT false,
  activo                  BOOLEAN      NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_paquetes_updated_at
  BEFORE UPDATE ON paquetes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. MÉTODOS DE PAGO — catálogo
-- ============================================================
CREATE TABLE metodos_pago (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(50)  NOT NULL,
  activo      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_metodos_pago_updated_at
  BEFORE UPDATE ON metodos_pago
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. MOTIVOS DE BAJA — catálogo
-- ============================================================
CREATE TABLE motivos_baja (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(100) NOT NULL,
  activo      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_motivos_baja_updated_at
  BEFORE UPDATE ON motivos_baja
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. USUARIOS — tabla principal
-- ============================================================
CREATE TABLE usuarios (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_credencial               VARCHAR(20) UNIQUE,          -- NULL mientras se asigna
  nombre                          VARCHAR(100) NOT NULL,
  apellido_paterno                VARCHAR(100) NOT NULL,
  apellido_materno                VARCHAR(100),
  fecha_nacimiento                DATE,
  sexo                            VARCHAR(20),                 -- MASCULINO / FEMENINO / OTRO
  celular                         VARCHAR(20),
  servicio_medico                 VARCHAR(100),                -- IMSS, ISSSTE, INSABI, NINGUNO, etc.
  contacto_emergencia_nombre      VARCHAR(150),
  contacto_emergencia_celular     VARCHAR(30),
  contacto_emergencia_parentesco  VARCHAR(50),
  horario_id                      UUID REFERENCES horarios(id),
  paquete_id                      UUID REFERENCES paquetes(id),
  estatus                         VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                                  CHECK (estatus IN ('activo','vencido','baja','suspendido','pendiente','prorroga')),
  observaciones                   TEXT,
  foto_url                        TEXT,                        -- Reservado: Supabase Storage
  qr_token                        VARCHAR(100),                -- Reservado: fase QR
  biometric_id                    VARCHAR(100),                -- Reservado: fase biométrica
  fecha_inscripcion               DATE         NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja                      DATE,
  motivo_baja                     TEXT,
  registrado_por                  UUID         REFERENCES auth.users(id),
  created_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices de búsqueda para recepción
CREATE INDEX idx_usuarios_numero_credencial ON usuarios(numero_credencial);
CREATE INDEX idx_usuarios_nombre            ON usuarios(nombre, apellido_paterno);
CREATE INDEX idx_usuarios_estatus           ON usuarios(estatus);

-- ============================================================
-- 6. PAGOS — historial de pagos (nunca se borra)
-- ============================================================
CREATE TABLE pagos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID         NOT NULL REFERENCES usuarios(id),
  fecha_pago        DATE         NOT NULL,
  monto             DECIMAL(10,2) NOT NULL,
  paquete_id        UUID         NOT NULL REFERENCES paquetes(id),
  periodo_mes       DATE         NOT NULL,  -- Primer día del mes cubierto (ej. 2025-05-01)
  fecha_inicio      DATE         NOT NULL,
  fecha_fin         DATE         NOT NULL,
  numero_recibo     VARCHAR(50),
  metodo_pago_id    UUID         REFERENCES metodos_pago(id),
  registrado_por    UUID         NOT NULL REFERENCES auth.users(id),
  observaciones     TEXT,
  anulado           BOOLEAN      NOT NULL DEFAULT false,
  anulado_por       UUID         REFERENCES auth.users(id),
  anulado_at        TIMESTAMPTZ,
  motivo_anulacion  TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índices críticos para calcularEstatus() — deben ser rápidos
CREATE INDEX idx_pagos_usuario_periodo ON pagos(usuario_id, periodo_mes);
CREATE INDEX idx_pagos_anulado         ON pagos(anulado);

-- ============================================================
-- 7. ASISTENCIAS — registro de entradas (nunca se borra)
-- ============================================================
CREATE TABLE asistencias (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id              UUID        NOT NULL REFERENCES usuarios(id),
  fecha                   DATE        NOT NULL,
  hora_entrada            TIMETZ      NOT NULL DEFAULT now(),
  estatus_al_momento      VARCHAR(20) NOT NULL,  -- estatus del usuario en el momento del check-in
  metodo_registro         VARCHAR(20) NOT NULL DEFAULT 'manual'
                          CHECK (metodo_registro IN ('manual','qr','nfc','biometrico','lector_codigo')),
  registrado_por          UUID        NOT NULL REFERENCES auth.users(id),
  es_duplicado_autorizado BOOLEAN     NOT NULL DEFAULT false,
  observaciones           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asistencias_usuario_fecha ON asistencias(usuario_id, fecha);
CREATE INDEX idx_asistencias_fecha         ON asistencias(fecha);

-- ============================================================
-- 8. BAJAS — historial de bajas de usuarios
-- ============================================================
CREATE TABLE bajas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID        NOT NULL REFERENCES usuarios(id),
  fecha_baja     DATE        NOT NULL,
  motivo         TEXT        NOT NULL,
  registrado_por UUID        NOT NULL REFERENCES auth.users(id),
  observaciones  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_bajas_updated_at
  BEFORE UPDATE ON bajas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. INCIDENTES DE ENFERMERÍA
-- ============================================================
CREATE TABLE incidentes_enfermeria (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID        NOT NULL REFERENCES usuarios(id),
  fecha             DATE        NOT NULL DEFAULT CURRENT_DATE,
  descripcion       TEXT        NOT NULL,
  accion_tomada     TEXT,
  contacto_avisado  VARCHAR(200),
  registrado_por    UUID        NOT NULL REFERENCES auth.users(id),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_incidentes_updated_at
  BEFORE UPDATE ON incidentes_enfermeria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 10. NOTAS — notas y comentarios por usuario
-- ============================================================
CREATE TABLE notas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID        NOT NULL REFERENCES usuarios(id),
  modulo      VARCHAR(50),                         -- recepcion, pagos, enfermeria, etc.
  tipo_nota   VARCHAR(20) NOT NULL DEFAULT 'operativa'
              CHECK (tipo_nota IN ('operativa','bitacora')),
  contenido   TEXT        NOT NULL,
  creada_por  UUID        NOT NULL REFERENCES auth.users(id),
  fecha       DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notas_updated_at
  BEFORE UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 11. BITÁCORA — auditoría completa del sistema
-- ============================================================
CREATE TABLE bitacora (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_sistema UUID        NOT NULL REFERENCES auth.users(id),
  accion          VARCHAR(60) NOT NULL,
  tabla_afectada  VARCHAR(50) NOT NULL,
  id_registro     UUID        NOT NULL,
  valor_anterior  JSONB,
  valor_nuevo     JSONB,
  fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo          TEXT
);

CREATE INDEX idx_bitacora_tabla_registro ON bitacora(tabla_afectada, id_registro);
CREATE INDEX idx_bitacora_usuario        ON bitacora(usuario_sistema);
CREATE INDEX idx_bitacora_fecha          ON bitacora(fecha_hora DESC);
