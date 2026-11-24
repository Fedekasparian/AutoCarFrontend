// La fila de un auto del metabuscador (MercadoLibre, Kavak, Autocosmos o AutoCar): sitio, precio con su etiqueta,
// contra qué se comparó y "Mandale un mecánico". La usan los resultados de una búsqueda y su página de novedades.
import * as formato from './formato.js';
import * as insp from './inspecciones.js';
import * as vistas from './vistas.js';
import { ruta } from './rutas.js';
import * as eventos from '../api/eventos.js';
import { API_URL } from '../api/config.js';

const { el } = vistas;

// Valores de Comparables::etiqueta() del back (distintos de los del comparador de una publicación)
const ETIQUETAS = { barato: 'Buen precio', normal: 'En precio', caro: 'Caro' };
// La etiqueta del metabuscador con el mismo color que la del comparador de una publicación
const COLOR_ETIQUETA = { barato: 'buen_precio', normal: 'en_precio', caro: 'caro' };
const CRITERIO = 'Se compara con autos del mismo modelo y sitio, de año (±2) y kilómetros (±30 %) parecidos.';
export const TIPOS_AVISO = { nuevo: 'Nuevo', bajo: 'Bajó de precio', reservado: 'Reservado', retirado: 'Ya no está' };
export const dolares = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

// La lista no mezcla monedas: los autos publicados en dólares se muestran en pesos con la cotización que trae el
// reporte y abajo, chico, el precio original del aviso.
let cotizacion = null;
export function usarCotizacion(valor) {
    cotizacion = valor || null;
}

export function precio(a) {
    if (a.precio === null) return 'Sin precio';
    if (a.moneda !== 'USD') return formato.precio(a.precio);
    return cotizacion ? formato.precio(Math.round(a.precio * cotizacion)) : `US$ ${dolares.format(a.precio)}`;
}

export const precioOriginal = (a) => (a.moneda === 'USD' && a.precio !== null && cotizacion
    ? el('span', { class: 'resultado__original' }, `Publicado en US$ ${dolares.format(a.precio)}`)
    : null);

// El sitio como una pastilla de color (solo el nombre: sin logos de otras marcas)
export const sitio = (fuente) => el('span', { class: `sitio sitio--${fuente}` }, insp.fuente(fuente));

// "Mandale un mecánico" con el link y los datos del aviso fijos; los de AutoCar se abren en su publicación.
// Un auto reservado no tiene precio a la vista y ya tiene a alguien comprándolo: no se ofrece la inspección.
// origen (para las estadísticas): de dónde se tocó el botón; va en el link y la pantalla del pedido lo manda.
export function acciones(a, origen = 'metabuscador') {
    if (a.fuente === 'autocar') {
        return [el('a', { class: 'boton boton--chico', href: ruta(`vehiculo.html?id=${a.id}`) }, 'Ver publicación')];
    }
    // "Ver en …" pasa por el back (GET /api/salida), que anota el clic para la afiliación con esa plataforma y redirige
    // al aviso. La dirección del aviso la pone el back con sus datos, no la que viaja en el link.
    const salida = `${API_URL}/api/salida?${new URLSearchParams({ id: a.id, origen })}`;
    const verEnSitio = el('a', { class: 'boton-link', href: salida, target: '_blank', rel: 'noopener noreferrer' }, `Ver en ${insp.fuente(a.fuente)}`);
    if (a.reservado) {
        return [verEnSitio, el('span', { class: 'suave' }, 'Reservado: no se puede pedir inspección')];
    }
    const pedido = new URLSearchParams({ url: a.url, titulo: `${a.marca} ${a.modelo}${a.version ? ` ${a.version}` : ''}` });
    if (a.anio) pedido.set('anio', a.anio);
    if (a.km !== null) pedido.set('km', a.km);
    // En pesos: si el aviso está en dólares, con la misma cotización que la lista
    if (a.precio !== null && a.moneda === 'ARS') pedido.set('precio', a.precio);
    if (a.precio !== null && a.moneda === 'USD' && cotizacion) pedido.set('precio', Math.round(a.precio * cotizacion));
    if (a.ubicacion) pedido.set('localidad', a.ubicacion);
    // Para mostrar qué mecánicos ya revisaron uno igual (no se manda en el pedido: ahí vale lo que elija en la lista)
    pedido.set('marca', a.marca);
    pedido.set('modelo', a.modelo);
    pedido.set('origen', origen);
    eventos.registrar('mostrado', origen, a.url);
    return [
        verEnSitio,
        el('a', { class: 'boton boton--chico', href: ruta(`pedir-inspeccion.html?${pedido}`) }, 'Mandale un mecánico'),
    ];
}

export const etiquetaPrecio = (a) => {
    const texto = ETIQUETAS[a.etiqueta?.valor];
    return texto
        ? el('span', { class: `etiqueta etiqueta--${COLOR_ETIQUETA[a.etiqueta.valor]}`, title: CRITERIO }, texto)
        : null;
};

// Abajo del precio, chico: contra qué se comparó (el orden por precio no mira el año ni los km, la etiqueta sí)
export function comparacion(a) {
    const e = a.etiqueta;
    if (!ETIQUETAS[e?.valor] || e.diferencia_pct === null) return null;
    const pct = String(Math.abs(e.diferencia_pct)).replace('.', ',');
    const relacion = e.diferencia_pct < 0 ? `${pct} % menos que` : e.diferencia_pct > 0 ? `${pct} % más que` : 'Igual que';
    return el('span', { class: 'resultado__comparacion', title: CRITERIO },
        `${relacion} ${e.comparables} autos parecidos (año y km)`);
}

// El mensaje de "Más recomendados" con un título y, en negrita, el motivo (lo que va después de los dos puntos):
// "Como lo buscás para la familia, priorizamos pocos kilómetros: **tiene 40 % menos km que autos parecidos…**"
export function mensajeRecomendado(texto) {
    const corte = texto.indexOf(': ');
    const cuerpo = corte > 0
        ? [texto.slice(0, corte + 2), el('strong', {}, texto.slice(corte + 2))]
        : [el('strong', {}, texto)];
    return el('span', { class: 'resultado__mensaje' },
        el('span', { class: 'resultado__mensaje-titulo' }, 'Por qué te lo recomendamos'),
        el('span', { class: 'resultado__mensaje-texto' }, ...cuerpo));
}

export const idFila = (autoId) => `auto-${String(autoId).replace(/[^\w-]/g, '-')}`;

/**
 * La fila de un auto.
 * opciones: i (para la animación de entrada), id (el ancla de la fila), aviso (la novedad sin ver de ese auto),
 * extra (una línea más abajo del precio), puesto y mensaje (los primeros de "Más recomendados": el número y por qué
 * se le recomienda), motivo (el motivo corto de "para vos"), origen (para las estadísticas) y conAcciones.
 */
export function fila(a, { i = 0, id = null, aviso = null, extra = null, puesto = null, mensaje = null, motivo = null,
    origen = 'metabuscador', conAcciones = true } = {}) {
    const datos = [a.km !== null ? formato.km(a.km) : null, a.ubicacion].filter(Boolean).join(' · ');
    const atributos = { class: `fila resultado${puesto ? ' resultado--recomendado' : ''}` };
    if (id) atributos.id = id;
    const li = el('li', atributos,
        el('span', { class: 'fila__cuerpo' },
            el('span', { class: 'resultado__arriba' },
                puesto ? el('span', { class: 'resultado__puesto' }, el('span', { class: 'solo-lector' }, 'Recomendado número '), String(puesto)) : null,
                sitio(a.fuente),
                aviso && !(aviso.tipo === 'reservado' && a.reservado) ? el('span', { class: `novedad__tipo novedad--${aviso.tipo}` }, TIPOS_AVISO[aviso.tipo] ?? aviso.tipo) : null,
                a.reservado ? el('span', { class: 'etiqueta etiqueta--oscura' }, 'Reservado') : null),
            el('span', { class: 'fila__titulo' }, `${a.marca} ${a.modelo} ${a.anio ?? ''}`.trim(),
                a.version ? el('span', { class: 'suave' }, ` · ${a.version}`) : null),
            el('span', { class: 'fila__meta' }, datos),
            el('span', { class: 'resultado__precio' }, el('strong', {}, precio(a)), ' ', etiquetaPrecio(a), precioOriginal(a), comparacion(a)),
            extra,
            mensaje ? mensajeRecomendado(mensaje) : null,
            !mensaje && motivo ? el('span', { class: 'resultado__para-vos' }, motivo) : null),
        conAcciones ? el('span', { class: 'fila__acciones' }, ...acciones(a, origen)) : null);
    li.style.setProperty('--n', String(i));
    return li;
}
