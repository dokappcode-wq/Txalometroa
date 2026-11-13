import { describe, expect, it } from 'vitest';
import { anioMadrid, aniosWrapped, catalogo, filtrarObras } from './catalogo';
import estadisticas from '../datos/estadisticas.json';
describe('Catálogo bilingüe', () => {
  it('encuentra una obra por cualquiera de sus títulos sin distinguir acentos', () => {
    expect(filtrarObras(catalogo.obras, 'MI DEUDA', 'todos', 'todas').map(o=>o.id)).toEqual(['zorretan']);
    expect(filtrarObras(catalogo.obras, 'zorretan', 'todos', 'todas').map(o=>o.id)).toEqual(['zorretan']);
    expect(filtrarObras(catalogo.obras, 'tombola', 'todos', 'todas').map(o=>o.id)).toEqual(['tonbola']);
  });
  it('combina búsqueda, género y repertorio', () => {
    expect(filtrarObras(catalogo.obras, '', 'todos', 'activas')).toHaveLength(4);
    expect(filtrarObras(catalogo.obras, '', 'todos', 'repertorio')).toHaveLength(9);
    expect(filtrarObras(catalogo.obras, 'tarara', 'drama', 'repertorio')).toHaveLength(1);
    expect(filtrarObras(catalogo.obras, 'tarara', 'komedia', 'repertorio')).toHaveLength(0);
  });
});
describe('Referencia histórica del núcleo original', () => {
  it('mantiene las cifras y el mínimo público', () => {
    expect(estadisticas.validas).toBe(546);
    expect(estadisticas.minimo).toBe(10);
    const esperado: Record<string,[number,number]> = {'atearen-bestaldean':[304,9.56],zorretan:[227,9.16],bidaia:[9,9.58],makilhotsak:[6,9.25]};
    for (const o of estadisticas.obras) expect([o.n,o.nota]).toEqual(esperado[o.id]);
  });
});
describe('Wrapped por año natural en Europe/Madrid', () => {
  it('separa el cambio de año con el horario de Hika', () => {
    expect(anioMadrid(new Date('2026-12-31T22:59:59Z'))).toBe(2026);
    expect(anioMadrid(new Date('2026-12-31T23:00:00Z'))).toBe(2027);
  });
  it('ofrece años independientes sin mezclar periodos', () => {
    expect(aniosWrapped(2026)).toEqual([2026,2025,2024]);
  });
});
