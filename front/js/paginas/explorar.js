import { get } from '../api/cliente.js';
import { carrusel } from '../servicios/carrusel.js';
import { avisoDeError, el, fichaVehiculo } from '../servicios/vistas.js';
import { poner } from '../servicios/corazones.js';
import * as sesion from '../servicios/sesion.js';
import * as favoritos from '../api/favoritos.js';

function selectorDeZona(localidades, actual) {
    const opciones = [...new Set([actual, ...localidades].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const selector = el('select', { class: 'campo__input' },
        ...opciones.map(nombre => el('option', { value: nombre, selected: nombre === actual }, nombre)));
    selector.addEventListener('change', () => {
        const url = new URL(location.href);
        url.searchParams.set('zona', selector.value);
        url.hash = 'explorar-zona';
        location.assign(url);
    });
    return el('label', { class: 'explorar-zona' }, 'Localidad', selector);
}

const vacios = {
    verificados: 'Todavía no hay autos disponibles con verificación mecánica vigente.',
    localidad: 'Todavía no hay publicaciones en esta zona.',
    asociadas: 'Las concesionarias asociadas todavía no tienen autos publicados.',
};

async function explorar() {
    const params = new URLSearchParams(location.search);
    if (Number(params.get('page')) > 1 ||
        ['q', 'marca', 'combustible', 'precio_max', 'vendedor', 'orden'].some(f => params.get(f))) return;
    const caja = document.getElementById('colecciones');
    const { filas, localidades = [], zona_personalizada } = await get('/api/explorar', { zona: params.get('zona') });
    if (!filas.length) return;
    let guardados = new Set();
    if (sesion.iniciada() && sesion.compraYVende()) {
        try { guardados = new Set((await favoritos.listar()).items.map(f => String(f.id))); } catch { /* permite reintentar al tocar */ }
    }
    filas.forEach(({ tipo, nombre, items }, i) => {
        if (tipo === 'marca') return;
        const esZona = tipo === 'localidad';
        const titulo = esZona ? (zona_personalizada ? 'Por tu zona' : 'Explorá por zona') : nombre;
        let seccion;
        if (items.length) {
            seccion = carrusel(titulo, items.map(fichaVehiculo), { id: 'coleccion-' + i });
            poner(seccion.querySelector('ul'), items, { guardados });
        } else {
            seccion = el('section', { class: 'carrusel' },
                el('div', { class: 'carrusel__cabecera' }, el('h2', {}, titulo)),
                el('p', { class: 'suave' }, vacios[tipo]));
        }
        if (esZona) {
            seccion.id = 'explorar-zona';
            if (localidades.length || nombre) {
                seccion.querySelector('.carrusel__cabecera').after(selectorDeZona(localidades, nombre));
            }
        }
        if (tipo === 'asociadas' && items.length) {
            seccion.append(el('a', { class: 'carrusel__continuar', href: '?vendedor=empresa' }, 'Ver todos los autos de concesionarias'));
        }
        caja.append(seccion);
    });
    caja.hidden = !caja.childElementCount;
    document.getElementById('catalogo-titulo').hidden = caja.hidden;
}
explorar().catch(() => {
    const caja = document.getElementById('colecciones');
    caja.replaceChildren(avisoDeError(new Error('No pudimos cargar los carruseles de Explorar.')));
    caja.hidden = false;
});
