-- Agrega número de servicio médico (NSS / afiliación) al perfil del usuario
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS numero_servicio_medico VARCHAR(30);
