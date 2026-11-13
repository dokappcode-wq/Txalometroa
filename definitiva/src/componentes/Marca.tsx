import { useId } from 'react';
const negro = 'M103 50 L214 50 L121 183 L217 338 L110 338 L50 246 L44 114 Z';
const rojo = 'M253 7 L292 57 L280 71 L315 122 L330 120 L366 170 L148 221 L122 186 Z';
const hueco = 'M181 173 L212 141 L217 167 Z';
export function Marca({ clase = '' }: { clase?: string }) {
  return <svg className={clase} viewBox="0 0 400 380" aria-hidden="true"><path d={negro} fill="currentColor" /><path d={`${rojo} ${hueco}`} fillRule="evenodd" fill="#e34531" /></svg>;
}
export function Medidor({ nota, idioma, grande = false }: { nota: number; idioma: 'es' | 'eu'; grande?: boolean }) {
  const id = useId().replace(/:/g, '');
  const nivel = 380 * (1 - nota / 10);
  return <div className={`medidor ${grande ? 'medidor-grande' : ''}`} aria-label={`${idioma === 'es' ? 'Nota del público' : 'Publikoaren nota'}: ${nota.toLocaleString(idioma, { maximumFractionDigits: 2 })} / 10`}>
    <svg viewBox="0 0 400 380" aria-hidden="true">
      <defs><mask id={`ola-${id}`}><rect x="0" y={nivel + 8} width="400" height="400" fill="white" /><path className="ola" d={`M-400 ${nivel} Q-350 ${nivel - 15} -300 ${nivel} T-100 ${nivel} T100 ${nivel} T300 ${nivel} T500 ${nivel} T700 ${nivel} V450 H-400Z`} fill="white" /></mask></defs>
      <path d={negro} fill="#c9c2ae" /><path d={`${rojo} ${hueco}`} fill="#d7cfb9" fillRule="evenodd" />
      <g mask={`url(#ola-${id})`}><path d={negro} fill="#242421" /><path d={`${rojo} ${hueco}`} fill="#c8361b" fillRule="evenodd" /></g>
    </svg><span aria-hidden="true">{nota.toLocaleString(idioma, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}<small>/10</small></span>
  </div>;
}
export function Mascaras({ nota }: { nota: number }) {
  const id = useId().replace(/:/g, '');
  return <div className="mascaras" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => {
    const porcentaje = Math.min(1, Math.max(0, nota / 2 - i)) * 100;
    return <svg key={i} viewBox="0 0 32 36"><defs><linearGradient id={`${id}-${i}`}><stop offset={`${porcentaje}%`} stopColor="#e64734" /><stop offset={`${porcentaje}%`} stopColor="#6d6a60" /></linearGradient></defs><path d="M3 3Q16-1 29 3V15C29 27 22 34 16 35C10 34 3 27 3 15Z" fill={`url(#${id}-${i})`} /><path d="M8 12Q11 9 14 12M19 12Q22 9 25 12" stroke="#242421" strokeWidth="2.4" fill="none" /><path d={`M9 23Q16 ${17 + i * 3} 23 23`} stroke="#242421" strokeWidth="2.4" fill="none" /></svg>;
  })}</div>;
}
