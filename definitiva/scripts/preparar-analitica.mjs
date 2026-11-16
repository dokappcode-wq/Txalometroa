// Solo agregados sin identificadores ni registros individuales. Nunca exporta texto libre.
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
import { resumirObra } from './agregados-obras.mjs';
process.env.TZ='Europe/Madrid';
const raiz=path.resolve(import.meta.dirname,'../..');
const cfg=JSON.parse(fs.readFileSync(path.join(raiz,'config.json'),'utf8'));
const contexto=vm.createContext({cfg,exportacion:fs.readFileSync(path.join(raiz,'datos/_Lab_Material_Hika-Teatroa_txalometroa_data_20261020.xls'),'utf8')});
vm.runInContext(fs.readFileSync(path.join(raiz,'app/nucleo.js'),'utf8')+'\nglobalThis.resultado=analizar(aObjetos(parsearTexto(exportacion)),cfg);',contexto);
const res=contexto.resultado,anios=[...new Set(res.validas.map(r=>String(r.cuando.getFullYear())))].sort();
const obras=res.obras.map(o=>{
 const filas=res.validas.filter(r=>r.obra===o.id),cortes={};
 for(const anio of ['todos',...anios])for(const idioma of ['todos','eu','es']){
  const rs=filas.filter(r=>(anio==='todos'||String(r.cuando.getFullYear())===anio)&&(idioma==='todos'||r.idioma===idioma));
  cortes[`${anio}:${idioma}`]={n:rs.length,detalle:rs.length>=5?resumirObra(rs):null};
 }
 return {id:o.id,cortes};
});
const datos={hasta:'2026-10-19',anios,filas:res.filas,validas:res.validas.length,descartes:res.descartes,minimoDetalle:5,obras};
fs.writeFileSync(path.resolve(import.meta.dirname,'../src/datos/analitica-obras.json'),JSON.stringify(datos)+'\n');
console.log(`${datos.validas} respuestas; ${obras.length} obras; agregados sin filas individuales.`);
