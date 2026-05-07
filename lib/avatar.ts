/**
 * Genera un color de fondo consistente y accesible para avatares de iniciales.
 * El mismo nombre siempre produce el mismo color — determinístico.
 */
const AVATAR_COLORS = [
  '#1A4F8A', '#2B7CC1', '#0369A1', '#0E7490',
  '#0F766E', '#047857', '#1D4ED8', '#4338CA',
  '#6D28D9', '#7C3AED', '#BE185D', '#B45309',
];

export function getAvatarColor(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(nombre: string, apellido: string): string {
  const n = nombre.trim().charAt(0).toUpperCase();
  const a = apellido.trim().charAt(0).toUpperCase();
  return `${n}${a}`;
}
