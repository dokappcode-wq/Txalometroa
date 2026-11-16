import {it,expect} from 'vitest';
import {analitica,corteObra,csvPreguntas,porcentaje} from './analitica';
import referencia from '../datos/estadisticas.json';
import {redireccionCuenta,URL_PUBLICA} from './redireccion';
it('conserva las notas históricas de referencia y 546 respuestas',()=>{
 expect(analitica.validas).toBe(546);
 for(const obra of referencia.obras){const c=corteObra(obra.id,'todos','todos');expect(c.n).toBe(obra.n);expect(c.detalle?.global.media).toBe(obra.nota);}
});
it('los filtros particionan los totales y cada distribución conserva el denominador',()=>{
 for(const obra of analitica.obras){const total=corteObra(obra.id,'todos','todos');expect(analitica.anios.reduce((s,a)=>s+corteObra(obra.id,a,'todos').n,0)).toBe(total.n);for(const c of Object.values(obra.cortes)){if(c.n<5)expect(c.detalle).toBeNull();if(c.detalle){for(const p of Object.values(c.detalle.preguntas)){expect(p.distribucion.reduce((a,b)=>a+b,0)).toBe(p.n);expect(p.n+p.omitidas).toBe(c.n);}expect(c.detalle.meses.reduce((s,m)=>s+m.n,0)).toBe(c.n);}}}
});
it('no presenta datos de obras inexistentes ni porcentajes sin respuestas',()=>{expect(corteObra('toto','todos','todos')).toEqual({n:0,detalle:null});expect(porcentaje(0,0)).toBeNull();});
it('exporta las diez categorías y los datos filtrados',()=>{const d=corteObra('zorretan','todos','eu').detalle!;const csv=csvPreguntas(d);expect(csv.split('\r\n')).toHaveLength(8);expect(csv).toContain('GAL1;'+d.preguntas.GAL1.n+';');});
it('los enlaces públicos nunca regresan a ChatGPT ni a un dominio arbitrario',()=>{
 for(const origen of ['https://antiguo.chatgpt.site','https://otro.example','https://txalometroa-escenario.netlify.app'])expect(redireccionCuenta(origen)).toBe(URL_PUBLICA+'/perfil');
 expect(redireccionCuenta('http://localhost:5173')).toBe('http://localhost:5173/perfil');
});
