import {it,expect} from 'vitest';
import {resumirObra,estadistica} from './agregados-obras.mjs';
const fila=(media,notas={},fecha='2026-01-10T12:00:00',funcion='a')=>({media,notas:{GAL1:null,GAL2:null,GAL3:null,GAL4:null,GAL5:null,GAL6:null,GAL7:null,...notas},cuando:new Date(fecha),funcion,idioma:'eu'});
it('pondera a cada respuesta igual, excluye ceros y conserva denominadores por pregunta',()=>{
 const d=resumirObra([fila(10,{GAL1:10}),fila(5,{GAL1:5,GAL2:5,GAL3:5,GAL4:5}),fila(null,{GAL1:0})]);
 expect(d.global.media).toBe(7.5);expect(d.global.n).toBe(2);expect(d.preguntas.GAL1.n).toBe(2);expect(d.preguntas.GAL1.omitidas).toBe(1);expect(d.preguntas.GAL4.n).toBe(1);expect(d.preguntas.GAL1.distribucion.reduce((a,b)=>a+b,0)).toBe(2);
});
it('no inventa notas en meses vacíos o grupos pequeños',()=>{
 const filas=[...Array.from({length:5},()=>fila(9,{GAL1:9})),fila(8,{GAL1:8},'2026-03-10T12:00:00','b')];const d=resumirObra(filas);
 expect(d.meses).toEqual([{mes:'2026-01',n:5,nota:9},{mes:'2026-02',n:0,nota:null},{mes:'2026-03',n:1,nota:null}]);expect(d.funciones[1].nota).toBeNull();
});
it('calcula mediana, cuartiles y dispersión sin convertir ausencias a cero',()=>{expect(estadistica([null,2,4,6,8])).toMatchObject({n:4,media:5,mediana:5,q1:3.5,q3:6.5,desviacion:2.24});expect(estadistica([]).media).toBeNull();});
