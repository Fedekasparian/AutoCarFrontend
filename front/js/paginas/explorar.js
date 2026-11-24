import { get } from '../api/cliente.js';
import { carrusel } from '../servicios/carrusel.js';
import { avisoDeError, el, fichaVehiculo } from '../servicios/vistas.js';
import { poner } from '../servicios/corazones.js';
import * as sesion from '../servicios/sesion.js';
import * as favoritos from '../api/favoritos.js';

const vacios = {
    verificados: 'Todavía no hay autos disponibles con verificación mecánica vigente.',
    asociadas: 'Las concesionarias asociadas todavía no tienen autos publicados.',
};

async function explorar() {
    const params = new URLSearchParams(location.search);
    if (Number(params.get('page')) > 1 ||
        ['q', 'marca', 'combustible', 'precio_max', 'vendedor', 'orden'].some(f => params.get(f))) return;
    const caja = document.getElementById('colecciones');
    const { filas } = await get('/api/explorar', { zona: params.get('zona') });
    if (!filas.length) return;
    let guardados = new Set();
    if (sesion.iniciada() && sesion.compraYVende()) {
        try { guardados = new Set((await favoritos.listar()).items.map(f => String(f.id))); } catch { /* permite reintentar al tocar */ }
    }
    filas.forEach(({ tipo, nombre: titulo, items }, i) => {
        if (!Object.hasOwn(vacios, tipo)) return;
        let seccion;
        if (items.length) {
            seccion = carrusel(titulo, items.map(fichaVehiculo), { id: 'coleccion-' + i });
            poner(seccion.querySelector('ul'), items, { guardados });
        } else {
            seccion = el('section', { class: 'carrusel' },
                el('div', { class: 'carrusel__cabecera' }, el('h2', {}, titulo)),
                el('p', { class: 'suave' }, vacios[tipo]));
        }
        if (tipo === 'asociadas' && items.length) {
            const consulta = new URLSearchParams(params);
            consulta.set('vendedor', 'empresa');
            seccion.append(el('a', { class: 'carrusel__continuar', href: '?' + consulta }, 'Ver todos los autos de concesionarias'));
        }
        caja.append(seccion);
    });
    caja.hidden = !caja.childElementCount;
}
explorar().catch(() => {
    const caja = document.getElementById('colecciones');
    caja.replaceChildren(avisoDeError(new Error('No pudimos cargar los carruseles de Explorar.')));
    caja.hidden = false;
});
