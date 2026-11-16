// @vitest-environment jsdom
import {it,expect,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalisisObra from './AnalisisObra';
afterEach(cleanup);
it('permite seleccionar obras sin datos, comparar y distinguir actividad no disponible',async()=>{
 const u=userEvent.setup();render(<AnalisisObra idioma="es" t={s=>s} social={null} dias={30}/>);
 expect(screen.getByText('304 respuestas en la selección')).toBeTruthy();
 await u.selectOptions(screen.getByLabelText('Obra de comparación'),'zorretan');expect(screen.getByRole('columnheader',{name:'Mi deuda'})).toBeTruthy();
 await u.selectOptions(screen.getByLabelText('Obra'),'toto');expect(screen.getByText('Sin respuestas para esta selección')).toBeTruthy();
 expect(screen.getByText(/Actividad aún no disponible/)).toBeTruthy();expect(screen.queryByRole('button',{name:'Exportar preguntas · CSV'})).toBeNull();
});
it('filtra por idioma y advierte las muestras pequeñas',async()=>{
 const u=userEvent.setup();render(<AnalisisObra idioma="es" t={s=>s} social={[]} dias={7}/>);
 await u.selectOptions(screen.getByLabelText('Obra'),'bidaia');expect(screen.getByText(/Muestra pequeña/)).toBeTruthy();
 await u.selectOptions(screen.getByLabelText('Idioma del formulario'),'es');expect(screen.getByLabelText('Idioma del formulario')).toHaveProperty('value','es');
 expect(screen.getByText(/Publicaciones creadas en los últimos 7 días/)).toBeTruthy();
});
