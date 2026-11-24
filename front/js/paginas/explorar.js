import { get } from '../api/cliente.js';
import { carrusel } from '../servicios/carrusel.js';
import { avisoDeError, el, fichaVehiculo } from '../servicios/vistas.js';
import { poner } from '../servicios/corazones.js';
import * as sesion from '../servicios/sesion.js';
import * as favoritos from '../api/favoritos.js';

async function explorar() {
    const params = new URLSearchParams(location.search);
    if (Number(params.get('page')) > 1 ||
        ['q', 'marca', 'combustible', 'precio_max', 'vendedor', 'orden'].some(f => params.get(f))) return;
    const caja = document.getElementById('colecciones');
    const { filas } = await get('/api/explorar');
    if (!filas.length) return;
    let guardados = new Set();
    if (sesion.iniciada() && sesion.compraYVende()) {
        try { guardados = new Set((await favoritos.listar()).items.map(f => String(f.id))); } catch { /* permite reintentar al tocar */ }
    }
    filas.forEach(({ tipo, nombre, items }, i) => {
        if (!items.length) {
            if (tipo === 'verificados') caja.append(el('section', { class: 'carrusel' },
                el('div', { class: 'carrusel__cabecera' }, el('h2', {}, nombre)),
                el('p', { class: 'suave' }, 'Todavía no hay autos disponibles con verificación mecánica vigente.')));
            return;
        }
        const titulo = tipo === 'localidad' ? 'Cerca tuyo en ' + nombre : tipo === 'marca' ? 'Autos de ' + nombre : nombre;
        const seccion = carrusel(titulo, items.map(fichaVehiculo), { id: 'coleccion-' + i });
        caja.append(seccion);
        poner(seccion.querySelector('ul'), items, { guardados });
    });
    caja.hidden = !caja.childElementCount;
    document.getElementById('catalogo-titulo').hidden = caja.hidden;
}
explorar().catch(() => {
    const caja = document.getElementById('colecciones');
    caja.replaceChildren(avisoDeError(new Error('No pudimos cargar los carruseles de Explorar.')));
    caja.hidden = false;
});
