// AquaControl — tipos TypeScript completos para todas las tablas
// Regla: sin `any`. Todo tipado estrictamente.

export type EstatusUsuario = 'activo' | 'vencido' | 'baja' | 'suspendido' | 'pendiente' | 'prorroga';
export type MetodoRegistro = 'manual' | 'qr' | 'nfc' | 'biometrico' | 'lector_codigo';
export type RolSistema = 'superadmin' | 'admin' | 'recepcion';
export type TipoNota = 'operativa' | 'bitacora';

// ============================================================
// Catálogos
// ============================================================

export interface Horario {
  id: string;
  nombre: string;
  hora_inicio: string;        // "HH:MM"
  hora_fin: string;           // "HH:MM"
  cupo_maximo: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paquete {
  id: string;
  nombre: string;
  codigo: string | null;
  precio_base: number;
  duracion_dias: number;
  descripcion: string | null;
  requiere_autorizacion: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetodoPago {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MotivoBaja {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla principal: usuarios
// ============================================================

export interface Usuario {
  id: string;
  numero_credencial: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;    // ISO date "YYYY-MM-DD"
  sexo: string | null;
  celular: string | null;
  servicio_medico: string | null;
  numero_servicio_medico: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_celular: string | null;
  contacto_emergencia_parentesco: string | null;
  horario_id: string | null;
  paquete_id: string | null;
  estatus: EstatusUsuario;
  observaciones: string | null;
  foto_url: string | null;            // Reservado — Supabase Storage
  qr_token: string | null;           // Reservado — fase QR
  biometric_id: string | null;       // Reservado — fase biométrica
  fecha_inscripcion: string;          // ISO date
  fecha_baja: string | null;
  motivo_baja: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

// Usuario con relaciones expandidas (para ficha completa)
export interface UsuarioConRelaciones extends Usuario {
  horarios: Horario | null;
  paquetes: Paquete | null;
}

// ============================================================
// Pagos
// ============================================================

export interface Pago {
  id: string;
  usuario_id: string;
  fecha_pago: string;             // ISO date
  monto: number;
  paquete_id: string;
  periodo_mes: string;            // ISO date: primer día del mes cubierto (ej. "2025-05-01")
  fecha_inicio: string;           // ISO date
  fecha_fin: string;              // ISO date
  numero_recibo: string | null;
  metodo_pago_id: string | null;
  registrado_por: string;
  observaciones: string | null;
  anulado: boolean;
  anulado_por: string | null;
  anulado_at: string | null;
  motivo_anulacion: string | null;
  created_at: string;
}

export interface PagoConRelaciones extends Pago {
  paquetes: Paquete | null;
  metodos_pago: MetodoPago | null;
}

// ============================================================
// Asistencias
// ============================================================

export interface Asistencia {
  id: string;
  usuario_id: string;
  fecha: string;                  // ISO date
  hora_entrada: string;           // HH:MM:SS+TZ
  estatus_al_momento: string;
  metodo_registro: MetodoRegistro;
  registrado_por: string;
  es_duplicado_autorizado: boolean;
  observaciones: string | null;
  created_at: string;
}

// ============================================================
// Bajas
// ============================================================

export interface Baja {
  id: string;
  usuario_id: string;
  fecha_baja: string;             // ISO date
  motivo: string;
  registrado_por: string;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Incidentes de enfermería
// ============================================================

export interface IncidenteEnfermeria {
  id: string;
  usuario_id: string;
  fecha: string;                  // ISO date
  descripcion: string;
  accion_tomada: string | null;
  contacto_avisado: string | null;
  registrado_por: string;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Notas
// ============================================================

export interface Nota {
  id: string;
  usuario_id: string;
  modulo: string | null;
  tipo_nota: TipoNota;
  contenido: string;
  creada_por: string;
  fecha: string;                  // ISO date
  created_at: string;
  updated_at: string;
}

// ============================================================
// Bitácora de auditoría
// ============================================================

export interface BitacoraEntry {
  id: string;
  usuario_sistema: string;
  accion: string;
  tabla_afectada: string;
  id_registro: string;
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  fecha_hora: string;
  motivo: string | null;
}

// ============================================================
// Tipos de UI / negocio (no son tablas)
// ============================================================

export interface EstatusVigencia {
  estatus: EstatusUsuario;
  vigente_hasta: string | null;
  ultimo_pago: {
    fecha: string;
    monto: number;
    numero_recibo: string | null;
  } | null;
  dias_vencido: number;
}

export interface FichaRecepcion {
  usuario: UsuarioConRelaciones;
  vigencia: EstatusVigencia;
  asistencia_hoy: Asistencia | null;
}

export interface FormularioAlta {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: string;
  celular: string;
  servicio_medico: string;
  numero_servicio_medico: string;
  contacto_emergencia_nombre: string;
  contacto_emergencia_celular: string;
  contacto_emergencia_parentesco: string;
  horario_id: string;
  paquete_id: string;
  observaciones: string;
}

export interface FormularioPago {
  usuario_id: string;
  fecha_pago: string;
  monto: number;
  paquete_id: string;
  periodo_mes: string;
  fecha_inicio: string;
  fecha_fin: string;
  numero_recibo: string;
  metodo_pago_id: string;
  observaciones: string;
}
