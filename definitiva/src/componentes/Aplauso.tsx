/** Dos manos aplaudiendo; el botón que lo contiene aporta el nombre accesible. */
export default function Aplauso({size=20}:{size?:number}){
 return <span className="icono-aplauso" style={{fontSize:size,lineHeight:1}} aria-hidden="true">👏</span>;
}
