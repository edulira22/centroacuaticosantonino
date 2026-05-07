-- AquaControl — Centro Acuático Chihuahua
-- Migración 002: Datos semilla (catálogos reales del cliente)

-- ============================================================
-- HORARIOS (del Excel real del cliente)
-- ============================================================
INSERT INTO horarios (nombre, hora_inicio, hora_fin) VALUES
  ('06:00-07:00', '06:00', '07:00'),
  ('07:00-08:00', '07:00', '08:00'),
  ('08:00-09:00', '08:00', '09:00'),
  ('09:00-10:00', '09:00', '10:00'),
  ('10:00-11:00', '10:00', '11:00'),
  ('11:00-12:00', '11:00', '12:00'),
  ('15:00-16:00', '15:00', '16:00'),
  ('15:00-17:00', '15:00', '17:00'),
  ('16:00-17:00', '16:00', '17:00'),
  ('17:00-18:00', '17:00', '18:00'),
  ('17:00-19:00', '17:00', '19:00'),
  ('18:00-19:00', '18:00', '19:00'),
  ('18:00-20:00', '18:00', '20:00'),
  ('19:00-20:00', '19:00', '20:00'),
  ('20:00-21:00', '20:00', '21:00'),
  ('21:00-22:00', '21:00', '22:00'),
  ('02:00-03:00', '02:00', '03:00');

-- ============================================================
-- PAQUETES / TARIFAS (del Excel real del cliente)
-- ============================================================
INSERT INTO paquetes (nombre, codigo, precio_base, duracion_dias, requiere_autorizacion) VALUES
  ('Mensualidad Regular',        'A',             621.94, 30, false),
  ('Descuento Gobierno',         'A.E.GOB',       491.90, 30, false),
  ('INAPAM',                     'A.INAPAM',      424.05, 30, false),
  ('AcuaInapam',                 'A.ACUA.INAPAM', 424.05, 30, false),
  ('Paquete Familiar Nivel 2',   'A.P2',          520.17, 30, false),
  ('Paquete Familiar Nivel 3',   'A.P3',          480.59, 30, false),
  ('Paquete Familiar Nivel 4',   'A.P4',          445.25, 30, false),
  ('Paquete Maternal',           'P.MATERNAL',    950.00, 30, false),
  ('Capacidades Diferentes',     'A.CAP.DIF',     424.05, 30, false),
  ('Becado',                     'BECADO',          0.00, 30, true);

-- ============================================================
-- MÉTODOS DE PAGO
-- ============================================================
INSERT INTO metodos_pago (nombre) VALUES
  ('Efectivo'),
  ('Transferencia'),
  ('Tarjeta débito'),
  ('Tarjeta crédito'),
  ('Otro');

-- ============================================================
-- MOTIVOS DE BAJA
-- ============================================================
INSERT INTO motivos_baja (nombre) VALUES
  ('Solicitud del usuario'),
  ('Falta de pago prolongada'),
  ('Cambio de domicilio'),
  ('Motivos médicos'),
  ('Fin de convenio'),
  ('Otro');
