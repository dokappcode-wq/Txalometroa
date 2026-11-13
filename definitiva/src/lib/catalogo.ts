import datos from '../datos/catalogo.json';
export type Idioma = 'es' | 'eu';
export type Obra = typeof datos.obras[number];
export const catalogo = datos;
export function filtrarObras(obras: Obra[], busqueda: string, genero: string, grupo: string): Obra[] {
  const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  const q = normalizar(busqueda);
  return obras.filter(o => (!q || normalizar(`${o.es} ${o.eu}`).includes(q)) &&
    (genero === 'todos' || o.genero === genero) &&
    (grupo === 'todas' || (grupo === 'activas' ? Boolean(o.txalometroa) : !o.txalometroa)));
}
export function anioMadrid(fecha: Date): number {
  return Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Madrid' }).format(fecha));
}
export function aniosWrapped(actual: number, inicial = 2024): number[] {
  return Array.from({ length: Math.max(1, actual - inicial + 1) }, (_, i) => actual - i);
}
