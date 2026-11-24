// Panel de una concesionaria (empresa-panel.html) con GET /api/empresa/panel?dias=7|30|90: visitas del período contra
// el anterior, la publicación más vista, visitas por día y por publicación, y por cada auto visitas → favoritos →
// consultas → inspecciones pedidas, con su precio contra el mercado. Solo para la cuenta de una empresa.
import * as empresas from '../api/empresas.js';
import * as formato from '../servicios/formato.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';

const { el } = vistas;
const $ = (id) => document.getElementById(id);
const numero = new Intl.NumberFormat('es-AR');
const n = (v) => numero.format(v);
const PERIODOS = { 7: '7 días', 30: '30 días', 90: '3 meses' };
const ESTADOS = { disponible: 'Publicada', pendiente: 'En revisión', rechazado: 'Rechazada', vendido: 'Vendida' };
let dias = Number(new URLSearchParams(window.location.search).get('dias')) in PERIODOS
    ? Number(new URLSearchParams(window.location.search).get('dias')) : 30;

function variacion(actual, anterior) {
    if (!anterior) return el('span', { class: 'variacion' }, actual ? 'sin datos antes' : 'igual que antes');
    const cambio = Math.round(((actual - anterior) / anterior) * 100);
    if (cambio === 0) return el('span', { class: 'variacion' }, '= igual que antes');
    return el('span', { class: `variacion ${cambio > 0 ? 'variacion--buena' : 'variacion--mala'}` },
        `${cambio > 0 ? '▲' : '▼'} ${Math.abs(cambio)} % vs. período anterior`);
}

const tarjeta = (valor, texto, extra = null) => el('li', { class: 'recuadro' }, el('strong', {}, valor), el('span', {}, texto), extra);

function mercado(m) {
    if (!m) return el('span', { class: 'suave' }, 'Sin datos');
    const pct = String(Math.abs(m.diferencia_pct)).replace('.', ',');
    const texto = m.diferencia_pct < 0 ? `${pct} % por debajo` : m.diferencia_pct > 0 ? `${pct} % por encima` : 'En el precio típico';
    const clase = m.diferencia_pct <= -7 ? 'buen_precio' : m.diferencia_pct >= 7 ? 'caro' : 'en_precio';
    return el('span', { class: `etiqueta etiqueta--${clase}`, title: `Comparado con ${m.comparables} autos parecidos; precio típico ${formato.precio(m.mediana_precio)}` }, texto);
}

function serie(puntos) {
    const maximo = Math.max(...puntos.map((p) => p.visitas), 0);
    $('serie-vacia').hidden = maximo > 0;
    $('serie').hidden = maximo === 0;
    $('serie').style.setProperty('--columnas', String(puntos.length));
    const cada = puntos.length > 31 ? 15 : puntos.length > 7 ? 5 : 1;
    $('serie').replaceChildren(...puntos.map((p, i) => {
        const tramo = el('span', { class: 'dias__tramo dias__tramo--visitas' });
        tramo.style.setProperty('--alto', `${maximo ? (p.visitas / maximo) * 100 : 0}%`);
        const [, m, d] = p.fecha.split('-');
        const fecha = `${Number(d)}/${Number(m)}`;
        const li = el('li', { class: 'dias__dia', title: `${fecha}: ${n(p.visitas)} visitas` },
            el('span', { class: 'dias__columna', 'aria-hidden': 'true' }, tramo),
            el('span', { class: `dias__fecha${i % cada === 0 || i === puntos.length - 1 ? '' : ' dias__fecha--oculta'}`, 'aria-hidden': 'true' }, fecha),
            el('span', { class: 'solo-lector' }, `${fecha}: ${n(p.visitas)} visitas`));
        li.style.setProperty('--n', String(i));
        return li;
    }));
}

// Dos barras por publicación: este período y el anterior, con el largo relativo a la que más visitas tuvo
function porAuto(autos) {
    const conVisitas = autos.filter((a) => a.visitas || a.visitas_anterior).slice(0, 10);
    const maximo = Math.max(...conVisitas.flatMap((a) => [a.visitas, a.visitas_anterior]), 1);
    const barra = (clase, valor, texto) => {
        const b = el('span', { class: `comparar__barra comparar__barra--${clase}`, 'aria-hidden': 'true' });
        b.style.setProperty('--largo', `${Math.max((valor / maximo) * 100, valor ? 2 : 0)}%`);
        return el('div', { class: 'comparar__fila' }, el('span', { class: 'comparar__que' }, texto), b, el('span', { class: 'comparar__valor' }, n(valor)));
    };
    $('por-auto').replaceChildren(...(conVisitas.length
        ? conVisitas.map((a) => el('li', { class: 'comparar__grupo' }, el('span', { class: 'comparar__nombre' }, a.titulo),
            barra('buscaron', a.visitas, 'Este período'), barra('compraron', a.visitas_anterior, 'El anterior')))
        : [el('li', { class: 'barras__vacio' }, 'Todavía no hubo visitas.')]));
}

function tabla(autos) {
    const celdas = (fila, etiqueta = 'td') => el('tr', {}, ...fila.map((c) => el(etiqueta, {}, c)));
    $('tabla-autos').replaceChildren(
        el('thead', {}, celdas(['Publicación', 'Estado', 'Días publicada', 'Visitas', 'Favoritos', 'Consultas', 'Inspecciones pedidas', 'Consultó / visitó', 'Precio contra el mercado'], 'th')),
        el('tbody', {}, ...(autos.length ? autos.map((a) => celdas([
            el('a', { href: `vehiculo.html?id=${a.id}` }, a.titulo), ESTADOS[a.estado] ?? a.estado, n(a.dias_publicado),
            n(a.visitas), n(a.favoritos), n(a.consultas), n(a.inspecciones),
            a.conversion === null ? '—' : `${String(a.conversion).replace('.', ',')} %`, mercado(a.mercado)]))
            : [el('tr', {}, el('td', { colspan: '9' }, 'Todavía no publicaste autos.'))])));
}

function mostrar(p) {
    $('panel-empresa-nombre').textContent = `${p.empresa.nombre} · últimos ${PERIODOS[p.dias]}`;
    $('enlace-vitrina').href = `empresa.html?id=${p.empresa.id}`;
    const r = p.resumen;
    $('kpis').replaceChildren(
        tarjeta(n(r.visitas), `Visitas en ${PERIODOS[p.dias]}`, variacion(r.visitas, r.visitas_anterior)),
        tarjeta(n(r.consultas), 'Consultas por chat'),
        tarjeta(n(r.favoritos), 'Guardadas en favoritos'),
        tarjeta(n(r.inspecciones), 'Inspecciones pedidas'),
        tarjeta(n(r.autos_activos), 'Autos publicados o en revisión'));
    $('mas-vista').hidden = !p.mas_vista;
    if (p.mas_vista) {
        $('mas-vista-texto').replaceChildren(el('a', { href: `vehiculo.html?id=${p.mas_vista.id}` }, p.mas_vista.titulo),
            ` · ${n(p.mas_vista.visitas)} ${p.mas_vista.visitas === 1 ? 'visita' : 'visitas'} en ${PERIODOS[p.dias]}`);
    }
    $('t-serie').textContent = `Visitas por día (últimos ${PERIODOS[p.dias]})`;
    serie(p.serie);
    porAuto(p.autos);
    tabla(p.autos);
    $('panel').hidden = false;
}

function armarPeriodo() {
    $('periodo').replaceChildren(el('span', { class: 'metricas-periodo__etiqueta' }, 'Período'),
        ...Object.entries(PERIODOS).map(([valor, texto]) => {
            const b = el('button', { class: 'pestana-estado', type: 'button', 'aria-pressed': String(Number(valor) === dias) }, texto);
            b.addEventListener('click', () => {
                dias = Number(valor);
                window.history.replaceState(null, '', `?dias=${dias}`);
                armarPeriodo();
                cargar();
            });
            return b;
        }));
}

async function cargar() {
    $('estado').replaceChildren(vistas.cargando());
    try {
        mostrar(await empresas.panel(dias));
        $('estado').replaceChildren();
    } catch (error) {
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        $('estado').replaceChildren(error.status === 403
            ? vistas.aviso('Este panel es de las cuentas de empresa.', 'Si tenés una concesionaria, sumala a AutoCar.')
            : vistas.avisoDeError(error));
    }
}

if (sesion.requerirLogin()) {
    armarPeriodo();
    cargar();
}
