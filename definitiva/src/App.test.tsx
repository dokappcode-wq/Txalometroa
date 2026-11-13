// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
function abrir(ruta='/'){return render(<MemoryRouter initialEntries={[ruta]}><App/></MemoryRouter>);}
beforeEach(()=>{localStorage.clear();window.scrollTo=vi.fn();});
afterEach(cleanup);
describe('Recorridos de la fase 1',()=>{
  it('busca por título en euskera y recupera el catálogo al quitar filtros',async()=>{
    const u=userEvent.setup();abrir();
    await u.type(screen.getByRole('textbox',{name:'Buscar obra'}),'Zorretan');
    expect(screen.getAllByRole('heading',{level:3}).map(x=>x.textContent)).toEqual(['Mi deuda']);
    await u.clear(screen.getByRole('textbox',{name:'Buscar obra'}));
    await u.type(screen.getByRole('textbox',{name:'Buscar obra'}),'inexistente');
    expect(screen.getByRole('heading',{name:'Esa historia aún no aparece.'})).toBeTruthy();
    await u.click(screen.getByRole('button',{name:'Ver todas las obras'}));
    expect(screen.getAllByRole('heading',{level:3})).toHaveLength(13);
  });
  it('combina repertorio y género sin perder el filtro al cambiar idioma',async()=>{
    const u=userEvent.setup();abrir();
    await u.click(screen.getByRole('button',{name:'Repertorio'}));
    await u.selectOptions(screen.getByRole('combobox',{name:'Filtrar por género'}),'drama');
    expect(screen.getAllByRole('heading',{level:3})).toHaveLength(3);
    await u.click(screen.getByRole('button',{name:'EU'}));
    expect(document.documentElement.lang).toBe('eu');
    expect(localStorage.getItem('txalo-definitiva-idioma')).toBe('eu');
    expect(screen.getByRole('heading',{name:'Koadernoa zuri'})).toBeTruthy();
    expect((screen.getByRole('combobox',{name:'Generoaren arabera iragazi'}) as HTMLSelectElement).value).toBe('drama');
  });
  it('muestra el histórico suficiente y oculta la nota de muestras pequeñas',()=>{
    const r=abrir('/obra/bidaia');
    expect(screen.getByText('Publicaremos la nota cuando esta obra reúna al menos 10 valoraciones.')).toBeTruthy();
    expect(screen.queryByLabelText('Nota del público: 9,58 / 10')).toBeNull();
    r.unmount();abrir('/obra/atearen-bestaldean');
    expect(screen.getByLabelText('Nota del público: 9,56 / 10')).toBeTruthy();
    expect(screen.getByText('304 valoraciones')).toBeTruthy();
  });
  it('presenta Wrapped como anual y cambia su periodo con el selector',async()=>{
    const u=userEvent.setup();abrir('/wrapped');
    await u.selectOptions(screen.getByRole('combobox',{name:'Tu año de teatro'}),'2025');
    expect(screen.getByText('Del 1 de enero al 31 de diciembre de 2025')).toBeTruthy();
    expect(screen.getByText('El resumen de este año estará disponible en la fase 5.')).toBeTruthy();
  });
  it('mantiene butacas como pendiente sin simulación ni asignación de asientos',()=>{
    abrir('/butacas');const principal=within(screen.getByRole('main'));
    expect(principal.getByRole('heading',{name:'Tu sitio está por llegar.'})).toBeTruthy();
    expect(principal.queryAllByRole('button')).toHaveLength(0);
    expect(principal.queryByRole('grid')).toBeNull();
  });
  it('ofrece una salida al catálogo para una ruta inexistente',()=>{
    abrir('/no-existe');expect(screen.getByRole('heading',{name:'Aquí ha caído el telón.'})).toBeTruthy();
    expect(screen.getByRole('link',{name:'Volver a las obras'}).getAttribute('href')).toBe('/');
  });
});
