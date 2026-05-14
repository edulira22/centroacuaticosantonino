-- Migración 006: Activar Realtime en tabla asistencias
-- Necesario para que el Monitor de Fila reciba eventos en tiempo real.

ALTER PUBLICATION supabase_realtime ADD TABLE asistencias;
