// Reporte de una búsqueda guardada (meta-busqueda-resultados.html?id=N) con GET /api/meta-busquedas/{id}:
// precio de referencia, novedades y los autos de todas las fuentes, cada uno con "Mandale un mecánico".
// "Recomendado" (sin orden en la URL) lo decide el back: si eligió para qué busca el auto, según su perfil
// (para_vos, cada auto trae el motivo); si no, por la diferencia con el precio típico.
import { carrusel } from '../servicios/carrusel.js';
import * as api from '../api/metabusqueda.js';
import * as formato from '../servicios/formato.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { criterios } from '../servicios/metabusqueda.js';
import { ruta } from '../servicios/rutas.js';
import { boton, confirmacion } from '../servicios/acciones.js';
import { fuente } from '../servicios/inspecciones.js';
import { PERFILES } from '../servicios/perfil.js';
import { TIPOS_AVISO, usarCotizacion, precio, precioOriginal, sitio, acciones, idFila, etiquetaPrecio, comparacion, mensajeRecomendado } from '../servicios/autos-externos.js';
import * as eventos from '../api/eventos.js';

const { el } = vistas;
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const $ = (idElemento) => document.getElementById(idElemento);

const TOP = 5; // cuántos se muestran primero, con su mensaje, en "Más recomendados"

// ---------- Novedades sin ver: el aviso de cada auto en su fila y cuántas hay en la franja ----------
// Al abrir la búsqueda sus avisos quedan vistos; por eso se guardan en la sesión del navegador y siguen
// apareciendo al cambiar de página u orden en esta pestaña.
let avisos = [];

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

// El precio típico por sitio y las novedades van plegados en "Ver comparación de precios y novedades" (cerrado),
// así lo primero que se ve son los autos. El desplegable se arma acá (regla de la cátedra: nada de comportamiento en el
// HTML) y, si hay avisos sin ver, el título lo dice para que no queden escondidos.
function plegarComparacion() {
    let plegable = $('comparacion');
    if (!plegable) {
        plegable = el('details', { class: 'comparacion', id: 'comparacion' }, el('summary', { class: 'comparacion__titulo' }));
        $('resumen').prepend(plegable);
        plegable.append($('sitios'), $('novedades'));
    }
    plegable.querySelector('summary').textContent = 'Ver comparación de precios y novedades'
        + (avisos.length ? ` (${avisos.length} sin ver)` : '');
}

// Una sola franja con las cifras de la última corrida y el link a la página de novedades (con el gráfico y cuáles son)
function mostrarNovedades(n) {
    const caja = $('novedades');
    if (!n?.disponible) {
        caja.replaceChildren('Las novedades (autos nuevos y bajas de precio) aparecen a partir de la segunda actualización diaria.');
        caja.classList.remove('novedades-franja--con-datos');
        return;
    }
    const cifra = (valor, texto, clase) => el('span', { class: `novedades-franja__cifra novedades-franja__cifra--${clase}` },
        el('strong', {}, String(valor)), ` ${texto}`);
    // replaceChildren escribe "null" si le llega un null: lo que no va se filtra antes
    caja.replaceChildren(...[
        el('span', { class: 'novedades-franja__texto' }, 'Desde la última actualización'),
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
function fichaResultado(a, { puesto, categoria, explicacion, origen = 'metabuscador', ancla = true } = {}) {
    const nombre = [a.marca, a.modelo, a.anio].filter(Boolean).join(' ');
    const botones = acciones(a, origen);
    const href = botones[0].getAttribute('href');
    const aviso = avisos.find(v => String(v.auto_id) === String(a.id));
    const enlace = { href, ...(a.fuente === 'autocar' ? {} : { target: '_blank', rel: 'noopener noreferrer' }) };
    return el('li', { class: 'auto-aviso', id: ancla ? idFila(a.id) : null },
        categoria ? el('h3', { class: 'auto-aviso__categoria' }, categoria) : null,
        el('a', { class: 'auto-aviso__portada', ...enlace, 'aria-label': puesto ? `Puesto ${puesto}. Ver ${nombre}` : 'Ver ' + nombre },
            vistas.imagenVehiculo(a, 'auto-aviso__foto'),
            puesto ? el('span', { class: 'auto-aviso__puesto', 'aria-hidden': 'true' }, '#' + puesto) : null,
            a.reservado || aviso ? el('span', { class: 'auto-aviso__estado' }, a.reservado ? 'Reservado' : TIPOS_AVISO[aviso.tipo]) : null),
        el('div', { class: 'auto-aviso__datos' },
            el('a', { class: 'auto-aviso__nombre', ...enlace }, nombre),
            a.version ? el('span', { class: 'auto-aviso__version' }, a.version) : null,
            el('span', { class: 'auto-aviso__meta' }, [a.km != null ? formato.km(a.km) : null, a.ubicacion].filter(Boolean).join(' · ')),
            el('strong', { class: 'auto-aviso__precio' }, precio(a)), precioOriginal(a), etiquetaPrecio(a),
            el('small', { class: 'auto-aviso__fuente' }, fuente(a.fuente))),
        puesto && explicacion ? mensajeRecomendado(explicacion) : explicacion ? el('p', { class: 'auto-aviso__nota' }, explicacion) : comparacion(a),
        el('div', { class: 'auto-aviso__acciones' }, ...botones));
}

function colecciones(r) {
    const { items, pagina } = r.resultados;
    const n = Number(pagina) === 1 && !params.get('orden') ? Math.min(TOP, items.length) : 0;
    const caja = $('colecciones-busqueda');
    const filas = [];
    if (n) {
        const top = items.slice(0, n).map((a, indice) => fichaResultado(a, {
            puesto: indice + 1,
            explicacion: r.perfil ? a.para_vos?.mensaje || a.para_vos?.motivo : mensajeSinPerfil(a),
            origen: r.perfil && a.para_vos ? 'para_vos' : 'metabuscador',
        }));
        const recomendados = carrusel('Recomendado para vos', top, { id: 'recomendados', clase: 'carrusel--recomendados' });
        recomendados.querySelector('ul').before(introRecomendados(r.perfil));
        filas.push(recomendados);
    }
    const destacados = DESTACADOS.filter(([k]) => r.destacados?.[k]?.auto).map(([k, categoria]) => {
        const { auto, explicacion } = r.destacados[k];
        return fichaResultado(auto, { categoria, explicacion, origen: 'destacado', ancla: false });
    });
    if (destacados.length) filas.push(carrusel('También te puede interesar', destacados, {
        id: 'destacados', clase: 'carrusel--comparaciones'
    }));
    if (items.length > n) {
        const resto = carrusel(n ? 'Más autos de esta búsqueda' : 'Autos de esta búsqueda',
            items.slice(n).map(a => fichaResultado(a, { explicacion: a.para_vos?.motivo })), { id: 'resultados' });
        if (Number(pagina) === 1 && r.resultados.paginas > 1) {
            continuarResultados(resto, r.resultados);
        }
        filas.push(resto);
    }
    caja.replaceChildren(...filas);
}

function continuarResultados(seccion, inicial) {
    const lista = seccion.querySelector('ul');
    const vistos = new Set(inicial.items.map(a => String(a.id)));
    const mas = el('button', { type: 'button', class: 'boton boton--secundario', 'aria-controls': lista.id }, 'Ver más autos');
    const estado = el('span', { role: 'status' });
    const pie = el('div', { class: 'carrusel__continuar' }, mas, estado);
    let pagina = Number(inicial.pagina);
    mas.addEventListener('click', async () => {
        if (mas.disabled) return;
        mas.disabled = true;
        estado.textContent = 'Cargando autos…';
        try {
            const filtros = Object.fromEntries(['orden', 'fuente'].filter(k => params.get(k)).map(k => [k, params.get(k)]));
            const { resultados } = await api.reporte(id, { ...filtros, page: pagina + 1 });
            const nuevos = resultados.items.filter(a => !vistos.has(String(a.id)));
            const fichas = nuevos.map(a => fichaResultado(a, { explicacion: a.para_vos?.motivo }));
            lista.append(...fichas);
            nuevos.forEach(a => vistos.add(String(a.id)));
            pagina = Number(resultados.pagina);
            if (fichas.length) {
                fichas[0].querySelector('a').focus({ preventScroll: true });
                lista.scrollTo({ left: fichas[0].offsetLeft, behavior: 'instant' });
            }
            estado.textContent = `${vistos.size} de ${resultados.total} autos`;
            mas.hidden = pagina >= resultados.paginas;
        } catch (error) {
            if (error.status === 401) return sesion.requerirLogin();
            estado.textContent = 'No pudimos cargar los autos. Volvé a intentar.';
        } finally {
            mas.disabled = false;
        }
    });
    seccion.append(pie);
}

// Sin perfil, el orden es por la diferencia con el precio típico: el mensaje dice eso, sin inventar un perfil
function mensajeSinPerfil(a) {
    const d = a.etiqueta?.diferencia_pct;
    if (d === null || d === undefined || d >= 0) return null;
    return `Está ${String(Math.abs(d)).replace('.', ',')} % por debajo del precio típico de ${a.etiqueta.comparables} autos parecidos.`;
}

function introRecomendados(perfil) {
    const nombre = PERFILES.find(p => p.uso === perfil)?.titulo;
    return el('p', { id: 'recomendados-intro', class: 'campo__ayuda' },
        nombre ? `Según tu preferencia «${nombre}». ` : 'Ordenados por su precio frente a autos parecidos. ',
        el('a', { href: ruta('preferencias.html') }, nombre ? 'Cambiar preferencia' : 'Elegí para qué buscás el auto'));
}

function mostrar(r) {
    const b = r.busqueda;
    usarCotizacion(r.cotizacion_dolar);
    $('titulo').textContent = criterios(b);
    document.title = `${b.marca} ${b.modelo} - AutoCar`;

    $('aclaracion').textContent = r.aclaracion;
    mostrarSitios(r.referencia);
    mostrarNovedades(r.novedades);
    plegarComparacion();
    $('resumen').hidden = false;
    colecciones(r);
    const res = r.resultados;
    $('estado').replaceChildren(res.items.length ? '' : vistas.aviso('No hay autos con estos filtros.',
        'Probá con otro sitio o sacá algún criterio. La búsqueda queda guardada: si aparece un auto, te avisamos.'));
    const paginacion = vistas.paginacion(res.pagina, res.paginas);
    if (Number(res.pagina) === 1 && $('resultados')) paginacion.hidden = true;
    $('paginacion').replaceWith(Object.assign(paginacion, { id: 'paginacion' }));
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
