// Mecánicos de la red: el ranking público (GET /api/mecanicos), sin login. El back ya lo devuelve ordenado
// por experiencia (inspecciones firmadas; los nuevos al final); acá se puede reordenar por precio sin volver a pedir.
// "Pedir inspección" lleva a pedir-inspeccion.html con ese mecánico marcado; ahí sí se pide la sesión.
import * as api from '../api/inspecciones.js';
import * as formato from '../servicios/formato.js';
import * as insp from '../servicios/inspecciones.js';
import * as vistas from '../servicios/vistas.js';
import { ruta } from '../servicios/rutas.js';

const { el } = vistas;
const lista = document.getElementById('ranking');
const estado = document.getElementById('estado-mecanicos');
const filtro = document.getElementById('filtro-localidad');
const orden = document.getElementById('orden-mecanicos');
let mecanicos = [];

const iniciales = (texto) => texto.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

function tarjeta(m, i) {
    const li = el('li', { class: `taller-tarjeta${i === 0 && !m.nuevo && orden.value === 'experiencia' ? ' taller-tarjeta--primero' : ''}` },
        el('div', { class: 'taller-tarjeta__arriba' },
            el('span', { class: 'taller-tarjeta__avatar', 'aria-hidden': 'true' }, iniciales(m.taller)),
            el('div', {},
                el('h2', { class: 'taller-tarjeta__nombre' }, m.taller),
                el('p', { class: 'taller-tarjeta__mecanico' }, m.mecanico))),
        el('div', { class: 'taller-tarjeta__puntaje' },
            m.nuevo ? el('span', { class: 'etiqueta taller-tarjeta__nuevo' }, 'Nuevo en la red') : null,
            el('span', {}, el('strong', {}, String(m.firmadas)), m.firmadas === 1 ? ' inspección firmada' : ' inspecciones firmadas')),
        el('ul', { class: 'taller-tarjeta__datos', role: 'list' },
            el('li', {}, `${m.direccion}, ${m.localidad}`)),
        el('div', { class: 'taller-tarjeta__pie' },
            el('span', { class: 'taller-tarjeta__precio' }, el('span', {}, 'Inspección'), el('strong', {}, formato.precio(m.precio_inspeccion))),
            el('a', { class: 'boton boton--chico', href: ruta(`pedir-inspeccion.html?mecanico=${m.id}`) }, 'Pedir inspección')));
    li.style.setProperty('--n', String(i));
    return li;
}

const ORDENES = {
    experiencia: () => 0, // el orden del back
    precio: (a, b) => a.precio_inspeccion - b.precio_inspeccion,
};

function mostrar() {
    const ordenados = [...mecanicos].sort(ORDENES[orden.value] || ORDENES.experiencia);
    lista.replaceChildren(...ordenados.map(tarjeta));
    lista.classList.remove('lista-filas--entra');
    void lista.offsetWidth;
    lista.classList.add('lista-filas--entra');
}

async function cargar() {
    estado.replaceChildren(vistas.cargando());
    lista.replaceChildren();
    try {
        const r = await api.mecanicos(filtro.value);
        if (filtro.options.length === 1) {
            filtro.append(...r.localidades.map((l) => el('option', { value: l }, l)));
        }
        mecanicos = r.items;
        mostrar();
        estado.replaceChildren(r.items.length
            ? ''
            : vistas.aviso(filtro.value ? 'No hay mecánicos en esa localidad.' : 'Todavía no hay mecánicos en la red.',
                filtro.value ? 'Probá con "Todas".' : 'Volvé a mirar en unos días.'));
    } catch (error) {
        estado.replaceChildren(vistas.avisoDeError(error));
    }
}

filtro.addEventListener('change', cargar);
orden.addEventListener('change', mostrar);
cargar();
