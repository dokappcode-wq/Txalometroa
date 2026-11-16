export function estadistica(valores) {
 const v=valores.filter(x=>typeof x==='number'&&Number.isFinite(x)).sort((a,b)=>a-b);
 if(!v.length)return {n:0,media:null,mediana:null,q1:null,q3:null,desviacion:null,min:null,max:null};
 const media=v.reduce((a,b)=>a+b,0)/v.length;
 const cuantil=p=>{const i=(v.length-1)*p,b=Math.floor(i);return v[b]+(v[Math.ceil(i)]-v[b])*(i-b);};
 const r=x=>Math.round(x*100)/100;
 return {n:v.length,media:r(media),mediana:r(cuantil(.5)),q1:r(cuantil(.25)),q3:r(cuantil(.75)),desviacion:r(Math.sqrt(v.reduce((s,x)=>s+(x-media)**2,0)/v.length)),min:r(v[0]),max:r(v.at(-1))};
}
export function resumirObra(filas){
 const global=estadistica(filas.map(r=>r.media));
 const preguntas=Object.fromEntries(Array.from({length:7},(_,i)=>'GAL'+(i+1)).map(g=>{
  const valores=filas.map(r=>r.notas[g]).filter(v=>typeof v==='number'&&v>=1&&v<=10);
  const distribucion=Array.from({length:10},(_,i)=>valores.filter(v=>v===i+1).length);
  return [g,{...estadistica(valores),omitidas:filas.length-valores.length,distribucion,bajas:valores.filter(v=>v<=6).length,intermedias:valores.filter(v=>v>=7&&v<=8).length,altas:valores.filter(v=>v>=9).length}];
 }));
 const agrupados=new Map();
 for(const r of filas){const mes=`${r.cuando.getFullYear()}-${String(r.cuando.getMonth()+1).padStart(2,'0')}`;if(!agrupados.has(mes))agrupados.set(mes,[]);agrupados.get(mes).push(r);}
 const meses=[];
 if(filas.length){const fechas=[...agrupados.keys()].sort();let [y,m]=fechas[0].split('-').map(Number);while(`${y}-${String(m).padStart(2,'0')}`<=fechas.at(-1)){const mes=`${y}-${String(m).padStart(2,'0')}`,rs=agrupados.get(mes)||[];meses.push({mes,n:rs.length,nota:rs.length>=5?estadistica(rs.map(r=>r.media)).media:null});if(++m>12){m=1;y++;}}}
 const grupos=new Map();for(const r of filas){if(!grupos.has(r.funcion))grupos.set(r.funcion,[]);grupos.get(r.funcion).push(r);}
 const funciones=[...grupos.values()].map(rs=>({fecha:`${rs[0].cuando.getFullYear()}-${String(rs[0].cuando.getMonth()+1).padStart(2,'0')}-${String(rs[0].cuando.getDate()).padStart(2,'0')}`,n:rs.length,nota:rs.length>=5?estadistica(rs.map(r=>r.media)).media:null})).sort((a,b)=>a.fecha.localeCompare(b.fecha));
 return {n:filas.length,global,preguntas,meses,funciones,idiomas:{eu:filas.filter(r=>r.idioma==='eu').length,es:filas.filter(r=>r.idioma==='es').length,otros:filas.filter(r=>!['eu','es'].includes(r.idioma)).length},completas:filas.filter(r=>Object.values(r.notas).every(v=>v!==null)).length};
}
