export const URL_PUBLICA='https://txalometroa-escenario.netlify.app';
export function redireccionCuenta(origen:string){
 const url=new URL(origen);
 return (['localhost','127.0.0.1','[::1]'].includes(url.hostname)?url.origin:URL_PUBLICA)+'/perfil';
}
