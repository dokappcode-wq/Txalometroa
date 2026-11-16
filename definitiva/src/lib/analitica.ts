import datos from '../datos/analitica-obras.json';
export type Estadistica = {n:number;media:number|null;mediana:number|null;q1:number|null;q3:number|null;desviacion:number|null;min:number|null;max:number|null};
export type Pregunta = Estadistica & {omitidas:number;distribucion:number[];bajas:number;intermedias:number;altas:number};
export type Detalle = {n:number;global:Estadistica;preguntas:Record<string,Pregunta>;meses:{mes:string;n:number;nota:number|null}[];funciones:{fecha:string;n:number;nota:number|null}[];idiomas:{eu:number;es:number;otros:number};completas:number};
export type Corte = {n:number;detalle:Detalle|null};
export const analitica=datos as {hasta:string;anios:string[];filas:number;validas:number;descartes:Record<string,number>;minimoDetalle:number;obras:{id:string;cortes:Record<string,Corte>}[]};
export function corteObra(id:string,anio:string,idioma:string):Corte{return analitica.obras.find(o=>o.id===id)?.cortes[`${anio}:${idioma}`]??{n:0,detalle:null};}
export function porcentaje(n:number,total:number){return total?n/total*100:null;}
export function csvPreguntas(d:Detalle){
 const cabecera='pregunta;respuestas;sin_respuesta;media;mediana;desviacion;1;2;3;4;5;6;7;8;9;10';
 return '\uFEFF'+[cabecera,...Object.entries(d.preguntas).map(([id,p])=>[id,p.n,p.omitidas,p.media,p.mediana,p.desviacion,...p.distribucion].join(';'))].join('\r\n');
}
