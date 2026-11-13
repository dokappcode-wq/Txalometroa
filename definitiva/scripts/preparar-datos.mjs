// Genera solo agregados públicos con el mismo núcleo del prototipo; no publica respuestas individuales.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const raiz = path.resolve(import.meta.dirname, '../..');
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, 'config.json'), 'utf8'));
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'app/catalogo.json'), 'utf8'));
const nombre = '_Lab_Material_Hika-Teatroa_txalometroa_data_20261020.xls';
const contexto = vm.createContext({ cfg, exportacion: fs.readFileSync(path.join(raiz, 'datos', nombre), 'utf8') });
vm.runInContext(fs.readFileSync(path.join(raiz, 'app/nucleo.js'), 'utf8') + '\n globalThis.resultado = analizar(aObjetos(parsearTexto(exportacion)), cfg);', contexto);
const resultado = contexto.resultado;
const estadisticas = {
  fuente: nombre, hasta: '2026-10-19', validas: resultado.validas.length,
  minimo: cfg.publicacion.min_respuestas_obra,
  obras: resultado.obras.map(o => ({ id: o.id, n: o.n, nota: o.nota, preguntas: o.preguntas, recomendaria: o.pct_recomendaria }))
};
const salida = path.resolve(import.meta.dirname, '../src/datos');
fs.mkdirSync(salida, { recursive: true });
fs.writeFileSync(path.join(salida, 'catalogo.json'), JSON.stringify(catalogo, null, 2) + '\n');
fs.writeFileSync(path.join(salida, 'estadisticas.json'), JSON.stringify(estadisticas, null, 2) + '\n');
fs.writeFileSync(path.join(salida, 'preguntas.json'), JSON.stringify(cfg.preguntas, null, 2) + '\n');
console.log(`${estadisticas.validas} respuestas históricas; ${catalogo.obras.length} obras; solo agregados públicos.`);
