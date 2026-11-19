// Reporte de una búsqueda guardada (meta-busqueda-resultados.html?id=N) con GET /api/meta-busquedas/{id}:
// precio típico por sitio, una franja con las novedades (el detalle está en meta-busqueda-novedades.html) y los autos
// de todas las fuentes, cada uno con "Mandale un mecánico".
// "Más recomendados" (sin orden en la URL) lo decide el back: si eligió para qué busca el auto, según su perfil
// (para_vos); si no, por la diferencia con el precio típico. En ese orden se ven primero los 5 más recomendados,
// cada uno con por qué se le recomienda, y "Ver listado completo" muestra el resto (queda en la URL: ?todo=1).
import * as api from '../api/metabusqueda.js';
import * as formato from '../servicios/formato.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { criterios } from '../servicios/metabusqueda.js';
import { ruta } from '../servicios/rutas.js';
import { boton, confirmacion } from '../servicios/acciones.js';
import { PERFILES } from '../servicios/perfil.js';
import { usarCotizacion, precio, precioOriginal, sitio, acciones, fila, idFila } from '../servicios/autos-externos.js';
import * as eventos from '../api/eventos.js';

const { el } = vistas;
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const $ = (idElemento) => document.getElementById(idElemento);

const TOP = 5; // cuántos se muestran primero, con su mensaje, en "Más recomendados"
let todo = params.get('todo') === '1';

// ---------- Novedades sin ver: el aviso de cada auto en su fila y cuántas hay en la franja ----------
// Al abrir la búsqueda sus avisos quedan vistos; por eso se guardan en la sesión del navegador y siguen
// apareciendo al cambiar de página u orden en esta pestaña.
let avisos = [];
const avisoDe = (a) => avisos.find((v) => v.auto_id === a.id); // el más nuevo primero

async function traerAvisos() {
    const clave = `avisos-busqueda-${id}`;
    try {
        const guardados = sessionStorage.getItem(clave);
        if (guardados) return JSON.parse(guardados);
    } catch { /* sin almacenamiento: se piden de nuevo */ }
    try {
        const propios = (await api.avisosSinVer()).avisos.filter((a) => String(a.busqueda_id) === id);
        try { sessionStorage.setItem(clave, JSON.stringify(propios)); } catch { /* no pasa nada */ }
        return propios;
    } catch {
        return []; // si no responde, queda solo la cantidad
    }
}

// Precio típico por sitio, todos en la misma escala: franja del 25 % al 75 % y una marca en la mediana.
// Es la única referencia de precio de la página: se muestra aunque haya un solo sitio con autos suficientes.
function mostrarSitios(referencia) {
    const grupos = referencia.filter((g) => g.moneda === 'ARS' && g.suficiente);
    const caja = $('sitios');
    if (!grupos.length) { caja.hidden = true; return; }
    const desde = Math.min(...grupos.map((g) => g.p25)) * 0.95;
    const hasta = Math.max(...grupos.map((g) => g.p75)) * 1.05;
    const pos = (v) => `${(((v - desde) / (hasta - desde)) * 100).toFixed(1)}%`;
    caja.replaceChildren(
        el('p', { class: 'sitios__titulo' }, grupos.length > 1 ? 'Precio típico en cada sitio' : 'Precio típico'),
        ...grupos.sort((a, b) => a.mediana - b.mediana).map((g) => {
            const pista = el('span', { class: 'sitios__pista', 'aria-hidden': 'true' },
                el('span', { class: 'sitios__franja' }), el('span', { class: 'sitios__mediana' }));
            pista.style.setProperty('--desde', pos(g.p25));
            pista.style.setProperty('--hasta', pos(g.p75));
            pista.style.setProperty('--mediana', pos(g.mediana));
            return el('div', { class: `sitios__fila sitio-color--${g.fuente}` },
                sitio(g.fuente), pista,
                el('span', { class: 'sitios__valor' }, formato.precio(g.mediana),
                    el('span', { class: 'solo-lector' }, ` (la mitad de ${g.cantidad} autos entre ${formato.precio(g.p25)} y ${formato.precio(g.p75)})`)));
        }));
    caja.hidden = false;
}

// Una sola franja con las cifras de la última corrida y el link a la página de novedades (con el gráfico y cuáles son)
function mostrarNovedades(n) {
    const caja = $('novedades');
    if (!n?.disponible) {
        caja.replaceChildren('Las novedades (autos nuevos y bajas de precio) aparecen a partir de la segunda corrida diaria.');
        caja.classList.remove('novedades-franja--con-datos');
        return;
    }
    const cifra = (valor, texto, clase) => el('span', { class: `novedades-franja__cifra novedades-franja__cifra--${clase}` },
        el('strong', {}, String(valor)), ` ${texto}`);
    // replaceChildren escribe "null" si le llega un null: lo que no va se filtra antes
    caja.replaceChildren(...[
        el('span', { class: 'novedades-franja__texto' }, 'Desde la corrida anterior'),
        el('span', { class: 'novedades-franja__cifras' },
            cifra(n.nuevos, n.nuevos === 1 ? 'nuevo' : 'nuevos', 'nuevos'),
            cifra(n.bajaron, 'bajaron de precio', 'bajaron'),
            cifra(n.retirados, 'ya no están', 'retirados')),
        avisos.length ? el('span', { class: 'novedades-franja__sin-ver' }, `${avisos.length} sin ver`) : null,
        el('a', { class: 'boton boton--chico boton--secundario novedades-franja__ver', href: ruta(`meta-busqueda-novedades.html?id=${id}`) }, 'Ver novedades'),
    ].filter(Boolean));
    caja.classList.add('novedades-franja--con-datos');
}

const DESTACADOS = [['mejor_relacion', 'Mejor relación precio y km'], ['mas_barato', 'El más barato'], ['menos_usado', 'El menos usado']];
function mostrarDestacados(d) {
    const caja = $('destacados');
    const items = DESTACADOS.filter(([clave]) => d?.[clave]);
    if (!items.length) { caja.hidden = true; return; }
    caja.replaceChildren(...items.map(([clave, titulo]) => {
        const { auto: a, explicacion } = d[clave];
        return el('li', { class: `destacado destacado--${clave}` },
            el('span', { class: 'destacado__titulo' }, titulo),
            el('strong', { class: 'destacado__precio' }, precio(a)),
            precioOriginal(a),
            el('span', { class: 'destacado__auto' }, `${a.marca} ${a.modelo} ${a.anio ?? ''}`.trim(),
                a.km !== null ? ` · ${formato.km(a.km)}` : ''),
            el('span', { class: 'destacado__explicacion' }, explicacion),
            el('span', { class: 'destacado__pie' }, sitio(a.fuente), acciones(a, 'destacado').at(-1)));
    }));
    caja.hidden = false;
}

// ---------- "Más recomendados": los primeros 5 con su mensaje ----------

// Solo en ese orden y en la primera página
const enRecomendados = () => !params.get('orden') && (Number(params.get('page')) || 1) <= 1;

// Sin perfil, el orden es por la diferencia con el precio típico: el mensaje dice eso, sin inventar un perfil
function mensajeSinPerfil(a) {
    const d = a.etiqueta?.diferencia_pct;
    if (d === null || d === undefined || d >= 0) return null;
    return `Está ${String(Math.abs(d)).replace('.', ',')} % por debajo del precio típico de ${a.etiqueta.comparables} autos parecidos.`;
}

function introRecomendados(perfil, cuantos) {
    const caja = $('recomendados-intro');
    const cambiar = el('a', { href: ruta('preferencias.html') }, perfil ? 'Cambiar' : 'Contanos para qué buscás el auto');
    const nombre = PERFILES.find((p) => p.uso === perfil)?.titulo;
    caja.replaceChildren(...(nombre
        ? [el('strong', {}, `Los ${cuantos} más recomendados para vos`), ` según lo que nos contaste: "${nombre}". `, cambiar]
        : [el('strong', {}, `Los ${cuantos} con mejor precio frente a autos parecidos`), '. ', cambiar, ' y te los ordenamos para vos.']));
    caja.hidden = false;
}

function mostrarResultados(r) {
    const res = r.resultados;
    const conTop = enRecomendados() && res.items.length > 0;
    const top = conTop ? res.items.slice(0, TOP) : [];
    const resto = conTop ? res.items.slice(TOP) : res.items;
    const verTodo = !conTop || todo || res.total <= TOP;

    // Con perfil, los clics de los primeros cuentan como "para vos" (la recomendación con mensaje); el resto, como
    // metabuscador: así el embudo del admin mide si el mensaje convence
    const filas = top.map((a, i) => fila(a, {
        i, id: idFila(a.id), aviso: avisoDe(a), puesto: i + 1,
        mensaje: r.perfil ? a.para_vos?.mensaje : mensajeSinPerfil(a),
        motivo: a.para_vos?.motivo,
        origen: r.perfil && a.para_vos ? 'para_vos' : 'metabuscador',
    }));
    if (verTodo) {
        filas.push(...resto.map((a, i) => fila(a, { i: i + top.length, id: idFila(a.id), aviso: avisoDe(a), motivo: a.para_vos?.motivo })));
    }
    $('resultados').replaceChildren(...filas);
    $('resultados').classList.add('lista-filas--entra');

    $('recomendados-intro').hidden = true;
    if (conTop) introRecomendados(r.perfil, top.length);

    // "Ver listado completo": muestra el resto sin volver a pedir nada y lo deja en la URL (al volver, sigue así)
    $('ver-todo')?.remove();
    if (!verTodo) {
        const b = boton(`Ver listado completo (${res.total} autos)`, () => {
            todo = true;
            const url = new URL(window.location.href);
            url.searchParams.set('todo', '1');
            window.history.replaceState(null, '', url);
            mostrarResultados(r);
            document.getElementById(idFila(res.items[TOP].id))?.querySelector('a')?.focus();
        }, 'boton boton--secundario ver-todo', 'ver-todo');
        $('resultados').after(b);
    }
    $('paginacion').replaceWith(Object.assign(verTodo ? vistas.paginacion(res.pagina, res.paginas) : el('nav'), { id: 'paginacion' }));
}

function mostrar(r) {
    const b = r.busqueda;
    usarCotizacion(r.cotizacion_dolar);
    $('titulo').textContent = criterios(b);
    document.title = `${b.marca} ${b.modelo} - AutoCar`;

    $('aclaracion').textContent = r.aclaracion;
    mostrarSitios(r.referencia);
    mostrarNovedades(r.novedades);
    mostrarDestacados(r.destacados);
    $('resumen').hidden = false;

    mostrarResultados(r);
    $('estado').replaceChildren(r.resultados.items.length ? '' : vistas.aviso('No hay autos con estos filtros.',
        'Probá con otro sitio o sacá algún criterio. La búsqueda queda guardada: si aparece un auto, te avisamos.'));
    $('filtros').hidden = false;
    // Al final de la página, "Borrar esta búsqueda" (una sola vez, aunque se vuelva a mostrar el reporte)
    if (!$('borrar')) {
        $('paginacion').after(boton('Borrar esta búsqueda', () => pedirBorrar(), 'boton boton--secundario', 'borrar'));
    }
}

function noEncontrada() {
    return vistas.aviso('No encontramos esa búsqueda.', null,
        el('a', { class: 'boton boton--secundario', href: ruta('meta-busqueda.html') }, 'Mis búsquedas'));
}

async function cargar() {
    if (!/^\d+$/.test(id || '')) {
        $('estado').replaceChildren(noEncontrada());
        return;
    }
    $('estado').replaceChildren(vistas.cargando());
    try {
        const filtros = Object.fromEntries(['orden', 'fuente', 'page'].filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
        // Los avisos se piden antes de marcarlos vistos: si no, ya no se sabría cuáles eran
        const [reporte, sinVer] = await Promise.all([api.reporte(id, filtros), traerAvisos()]);
        avisos = sinVer;
        mostrar(reporte);
        api.marcarVistos(id).catch(() => {}); // al abrirla, sus avisos quedan vistos
    } catch (error) {
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        $('estado').replaceChildren(error.status === 404 ? noEncontrada() : vistas.avisoDeError(error));
    }
}

// Orden y sitio van en la URL (así la paginación los conserva) y se vuelve a la página 1
const filtros = $('filtros');
// "Ordenar por" son radios (sin valor = Más recomendados) y "Sitio" un select: los dos se leen igual con .value
['orden', 'fuente'].forEach((campo) => {
    filtros.elements[campo].value = params.get(campo) || '';
});
filtros.addEventListener('change', async () => {
    const nuevos = new URLSearchParams({ id });
    ['orden', 'fuente'].forEach((k) => {
        if (filtros.elements[k].value) nuevos.set(k, filtros.elements[k].value);
    });
    // Para las estadísticas del admin: qué orden elige cada tipo de usuario (se manda antes de recargar)
    const orden = filtros.elements.orden.value || 'recomendado';
    if (orden !== (params.get('orden') || 'recomendado')) await eventos.registrarYa('orden', 'metabuscador', orden);
    window.location.search = nuevos.toString();
});

// Confirmación de "Borrar esta búsqueda" (la ventana la arma acciones.js)
const pedirBorrar = confirmacion({
    titulo: '¿Borrar esta búsqueda?',
    confirmar: 'Borrar',
    volver: 'Volver',
    detalle: () => [el('p', {}, 'Dejás de recibir avisos de autos nuevos y bajas de precio. Los autos siguen en los sitios: podés volver a buscarlos cuando quieras.')],
    hacer: async () => {
        await api.eliminar(id);
        window.location.assign(ruta('meta-busqueda.html?borrada=1'));
    },
});

if (sesion.requerirLogin()) cargar();
