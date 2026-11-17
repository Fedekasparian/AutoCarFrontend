// Idea B, fallas típicas por modelo: la lista que ven el comprador (en el auto y en el informe) y el mecánico
// (en el checklist, con su voto). Los datos vienen de GET /api/fallas-tipicas o /api/mecanico/fallas-tipicas.
// El porcentaje medido no se muestra con menos del mínimo de inspecciones firmadas del modelo (20).
import * as insp from './inspecciones.js';
import { boton } from './acciones.js';
import { el } from './vistas.js';

const porcentaje = (p) => `${String(p).replace('.', ',')} %`;

// Una línea que explica de dónde salen los números
export function explicacion(d) {
    if (d.medido) {
        return `Medido en ${d.inspecciones} inspecciones firmadas de este modelo en AutoCar.`;
    }
    return d.inspecciones
        ? `Todavía hay ${d.inspecciones} de ${d.minimo} inspecciones firmadas de este modelo: con menos no mostramos cuánto se repite cada falla.`
        : `Todavía no hay inspecciones firmadas de este modelo. El porcentaje se muestra desde ${d.minimo}.`;
}

// Las fallas del modelo. Con alVotar(falla, confirma) agrega los botones del mecánico ("La vi" / "No es típica").
export function lista(d, alVotar = null) {
    const conFalla = d.fallas.map((f) => el('li', { class: `falla-tipica falla-tipica--${f.estado}` },
        el('p', { class: 'falla-tipica__cabeza' },
            el('strong', {}, f.titulo), ' ',
            el('span', { class: 'etiqueta' }, insp.nombreItem(f.item_codigo)), ' ',
            f.porcentaje !== null && f.porcentaje !== undefined
                ? el('span', { class: 'etiqueta resultado resultado--observado' }, `${porcentaje(f.porcentaje)} de los revisados`) : null),
        f.descripcion ? el('p', { class: 'suave' }, f.descripcion) : null,
        el('p', { class: 'falla-tipica__meta suave' },
            `${insp.ORIGENES_FALLA[f.origen] || f.origen} · ${insp.ESTADOS_FALLA[f.estado] || f.estado}`
            + ` (${f.votos.confirman} la vieron, ${f.votos.descartan} dicen que no es típica)`,
            f.fuente_url ? ' · ' : null,
            f.fuente_url ? el('a', { href: f.fuente_url, target: '_blank', rel: 'noopener noreferrer' }, 'Fuente') : null),
        alVotar ? el('p', { class: 'falla-tipica__votos' },
            boton(f.mi_voto === true ? 'La vi ✓' : 'La vi', () => alVotar(f, true),
                `boton boton--chico${f.mi_voto === true ? '' : ' boton--secundario'}`),
            ' ',
            boton(f.mi_voto === false ? 'No es típica ✓' : 'No es típica', () => alVotar(f, false),
                `boton boton--chico${f.mi_voto === false ? '' : ' boton--secundario'}`)) : null));
    // Las medidas que no tienen una falla cargada para ese ítem: salen solas de las inspecciones
    const cargados = new Set(d.fallas.map((f) => f.item_codigo));
    const medidas = (d.medidas || []).filter((m) => !cargados.has(m.item_codigo)).map((m) => el('li', { class: 'falla-tipica' },
        el('p', { class: 'falla-tipica__cabeza' },
            el('strong', {}, insp.nombreItem(m.item_codigo)), ' ',
            el('span', { class: 'etiqueta resultado resultado--observado' }, `${porcentaje(m.porcentaje)} de los revisados`)),
        el('p', { class: 'falla-tipica__meta suave' }, `${insp.ORIGENES_FALLA.medido}: observado o con falla en las inspecciones de este modelo`)));
    const items = [...conFalla, ...medidas];
    if (!items.length) return [el('p', { class: 'campo__ayuda' }, 'Todavía no hay fallas típicas cargadas para este modelo.'), el('p', { class: 'campo__ayuda' }, explicacion(d))];
    return [el('ul', { class: 'pila', role: 'list' }, ...items), el('p', { class: 'campo__ayuda' }, explicacion(d))];
}
