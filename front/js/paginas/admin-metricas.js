// Estadísticas de la app (permiso metricas.ver): GET /api/admin/metricas?dias=7|30|90, todo sacado de la base.
// Ordenadas en pestañas (Resumen, Plata, Inspecciones, Recomendaciones, Metabuscador, Usuarios, Publicaciones) con un período
// que vale para todas. "Compró" = pagó la inspección. La pestaña y el período quedan en la URL (#plata, ?dias=90).
// Plata, Recomendaciones y Metabuscador también separan por tipo de usuario ("¿Para qué buscás el auto?", por_perfil).
import { FUENTES, ingresosElegidos, liquidacionElegida } from '../servicios/fuentes-plata.js';
import * as admin from '../api/admin.js';
import * as formato from '../servicios/formato.js';
import { CONCLUSIONES, ESTADOS as ESTADOS_INSPECCION } from '../servicios/inspecciones.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';

const { el } = vistas;
const numero = new Intl.NumberFormat('es-AR');
const n = (valor) => numero.format(valor);
const pesos = (v) => formato.precio(v);
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

const PESTANAS = [['resumen', 'Resumen'], ['plata', 'Plata'], ['inspecciones', 'Inspecciones'], ['embudo', 'Recomendaciones'], ['metabuscador', 'Metabuscador'], ['usuarios', 'Usuarios'], ['plataforma', 'Publicaciones']];
// "Ordenar por" del metabuscador y qué peso de la fórmula de "Recomendados" (Parámetros) tiene que ver con cada uno
const ORDENES = { recomendado: 'Más recomendados', precio: 'Menor precio', km: 'Menos km', nuevos: 'Más nuevos' };
const PESO_DEL_ORDEN = { precio: 'el precio', km: 'los kilómetros', nuevos: 'el año' };
const COLOR_CONCLUSION = { Recomendable: 'barras__barra--ok', 'Con reparos': 'barras__barra--observado', 'No recomendable': 'barras__barra--falla' };
const PERIODOS = { 7: '7 días', 30: '30 días', 90: '3 meses' };
const ORIGENES = {
    para_vos: 'Recomendados (según su perfil)',
    destacado: 'Destacados del metabuscador',
    metabuscador: 'Resto de la lista del metabuscador',
    publicacion: 'Publicaciones de AutoCar',
};

const params = new URLSearchParams(window.location.search);
let dias = Number(params.get('dias')) in PERIODOS ? Number(params.get('dias')) : 30;
const abreAfiliaciones = window.location.hash === '#afiliaciones';
const inicial = abreAfiliaciones ? 'plata' : window.location.hash.slice(1);
let pestana = PESTANAS.some(([clave]) => clave === inicial) ? inicial : 'resumen';
// Plata: "todos" o un tipo de usuario (personal, familia, trabajo, aplicacion). Se mantiene al cambiar el período.
let segmento = 'todos';
let segmentoEmbudo = 'todos'; // lo mismo en la tabla de Recomendaciones
let ultimas = null; // las últimas métricas, para cambiar de segmento sin volver a pedirlas

const fuentes = new Set(Object.keys(FUENTES));
let afiliacionActual = null;

function actualizarPlata() {
    const todas = fuentes.size === Object.keys(FUENTES).length;
    document.getElementById('todas-las-fuentes').disabled = todas;
    document.getElementById('sin-fuentes').hidden = fuentes.size > 0;
    document.getElementById('detalle-inspecciones').hidden = !fuentes.has('inspecciones');
    document.getElementById('afiliaciones').hidden = !fuentes.has('clics') && !fuentes.has('abonos');
    document.querySelectorAll('[data-fuente]').forEach(nodo => { nodo.hidden = !fuentes.has(nodo.dataset.fuente); });
    if (afiliacionActual) pintarLiquidaciones();
    if (!ultimas) return;
    const { resumen, periodo, serie } = ultimas;
    informePlata(resumen.actual, resumen.anterior, PERIODOS[periodo.dias]);
    compararFuentes(resumen.actual, resumen.anterior, PERIODOS[periodo.dias], serie);
    const puntos = serie.puntos.map(p => ({ ...p, importe: ingresosElegidos(p, fuentes) }));
    const grafico = document.getElementById('tendencia-plata');
    grafico.hidden = !fuentes.size || puntos.some(p => p.importe == null);
    if (!grafico.hidden) llenar('grafico-ganancia', tendencia({ ...serie, puntos }, {
        clave: 'importe', nombre: todas ? 'Ingresos de AutoCar' : 'Ingresos seleccionados', formatear: pesos, clase: 'tendencia--2' }));
}

function prepararFuentes() {
    const grupo = document.getElementById('fuentes-plata');
    for (const [clave, [nombre]] of Object.entries(FUENTES)) {
        grupo.append(el('label', {}, el('input', { type: 'checkbox', value: clave, checked: true }), ' ' + nombre));
    }
    const todas = el('button', { class: 'boton-link', type: 'button', id: 'todas-las-fuentes', disabled: true }, 'Ver todo');
    grupo.append(todas);
    grupo.addEventListener('change', ({ target }) => {
        if (target.checked) fuentes.add(target.value);
        else fuentes.delete(target.value);
        actualizarPlata();
    });
    todas.addEventListener('click', () => {
        grupo.querySelectorAll('input').forEach(control => { control.checked = true; fuentes.add(control.value); });
        actualizarPlata();
    });
}

// ---------- Piezas ----------

// Cuánto cambió contra el período anterior. Si "menos es mejor", bajar se pinta como bueno.
function variacion(actual, anterior, menosEsMejor = false) {
    if (anterior === undefined) return null;
    if (!anterior) {
        return el('span', { class: 'variacion' }, actual ? 'sin datos antes' : 'igual que antes');
    }
    const cambio = Math.round(((actual - anterior) / anterior) * 100);
    if (cambio === 0) return el('span', { class: 'variacion' }, '= igual que antes');
    const bueno = menosEsMejor ? cambio < 0 : cambio > 0;
    return el('span', { class: `variacion ${bueno ? 'variacion--buena' : 'variacion--mala'}` },
        `${cambio > 0 ? '▲' : '▼'} ${Math.abs(cambio)} % vs. período anterior`);
}

// Tarjeta de un indicador. Con un número (no un texto ya armado) cuenta hasta el valor al aparecer.
function tarjeta(valor, texto, formatear = n, comparar = {}) {
    const numeroNodo = el('strong', {}, typeof valor === 'number' ? formatear(0) : (valor ?? '—'));
    if (typeof valor === 'number') vistas.contarHasta(numeroNodo, valor, formatear);
    // Los montos en pesos son más largos: van un poco más chicos para que entren en la tarjeta
    return el('li', { class: formatear === pesos ? 'recuadro resumen-admin__dinero' : 'recuadro' },
        numeroNodo, el('span', {}, texto), variacion(valor, comparar.anterior, comparar.menosEsMejor));
}

// Barras horizontales de una sola serie, de mayor a menor: el largo es la cantidad y al lado va el número y qué
// parte del total es (cada barra es un <li> con su texto, así se lee igual sin ver el gráfico).
// clases: {nombre: 'barras__barra--ok'} para pintar una fila con el color de su estado; formatear: pesos para montos;
// conParte: false cuando sumar los valores no tiene sentido (un promedio por persona, por ejemplo)
function barras(pares, vacio = 'Todavía no hay datos', clases = {}, formatear = n, conParte = true) {
    const filas = pares.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!filas.length) return [el('li', { class: 'barras__vacio' }, vacio)];
    const maximo = Math.max(...filas.map(([, v]) => v), 1);
    const total = filas.reduce((s, [, v]) => s + v, 0);
    return filas.map(([nombre, valor], i) => {
        const barra = el('span', { class: `barras__barra ${clases[nombre] ?? ''}`, 'aria-hidden': 'true' });
        barra.style.setProperty('--largo', `${(valor / maximo) * 100}%`);
        barra.style.setProperty('--n', String(i));
        return el('li', { class: 'barras__fila', title: `${nombre}: ${formatear(valor)}${conParte ? ` (${porcentaje(valor, total)} %)` : ''}` },
            el('span', { class: 'barras__nombre' }, nombre), barra,
            el('span', { class: 'barras__valor' }, formatear(valor), conParte ? el('span', { class: 'barras__parte' }, `${porcentaje(valor, total)} %`) : null));
    });
}

// "2026-11-18" → "18/11" (o "sem. 16/11" si la serie va por semana)
function fechaCorta(fecha, unidad) {
    const [, mes, dia] = fecha.split('-');
    return `${unidad === 'semana' ? 'sem. ' : ''}${dia}/${mes}`;
}

// Números redondos para el eje: tres pasos iguales de 1, 2, 2,5, 3, 4, 5, 6, 8 o 10 × 10^n (y nunca menos de 1, así las
// cantidades no muestran decimales). Devuelve el tope: 7 → 9 (0, 3, 6, 9); $ 1,2 M → $ 1,2 M (0, 400 mil, ...)
function ejeRedondo(maximo) {
    if (maximo <= 0) return 3;
    const potencia = 10 ** Math.floor(Math.log10(maximo / 3));
    const paso = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => x * potencia >= maximo / 3 && Number.isInteger(x * potencia)) * potencia;
    return Math.max(paso, 1) * 3;
}

// Montos cortos para el eje: "$ 1,2 M", "$ 350 mil"
const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });
const pesosCorto = (v) => `$ ${compacto.format(v)}`;

function svg(etiqueta, atributos = {}) {
    const nodo = document.createElementNS('http://www.w3.org/2000/svg', etiqueta);
    Object.entries(atributos).forEach(([nombre, valor]) => nodo.setAttribute(nombre, valor));
    return nodo;
}

// Tendencia de UN solo número en el tiempo (nunca dos escalas en el mismo gráfico): arriba el total del período
// y el promedio, en el medio la línea con su área y el eje con números redondos, abajo algunas fechas.
// Al pasar el mouse (o tocar) muestra el valor de ese día o semana. Para lectores de pantalla va una tabla oculta.
// opciones: {clave, nombre, formatear, clase ('tendencia--1' | 'tendencia--2')}
function tendencia(serie, { clave, nombre, formatear = n, clase = 'tendencia--1' }) {
    const { puntos, unidad } = serie;
    const valores = puntos.map((p) => p[clave]);
    const total = valores.reduce((s, v) => s + v, 0);
    const porUnidad = unidad === 'semana' ? 'semana' : 'día';
    const cabeza = el('div', { class: 'tendencia__cabeza' },
        el('span', { class: 'tendencia__nombre' }, nombre),
        el('strong', { class: 'tendencia__total' }, formatear(total)),
        el('span', { class: 'tendencia__promedio' }, `en el período · promedio ${formatear(Math.round(total / (puntos.length || 1)))} por ${porUnidad}`));
    if (!total) return el('div', { class: `tendencia ${clase}` }, cabeza, el('p', { class: 'barras__vacio' }, 'No hubo movimiento en este período.'));

    const tope = ejeRedondo(Math.max(...valores));
    const corto = formatear === pesos ? pesosCorto : n;
    const ultimo = Math.max(puntos.length - 1, 1);
    const x = (i) => (i / ultimo) * 100;
    const y = (v) => 100 - (v / tope) * 100;
    const linea = valores.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
    const dibujo = svg('svg', { class: 'tendencia__dibujo', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    [0, 1, 2, 3].forEach((k) => dibujo.append(svg('line', { class: 'tendencia__guia', x1: 0, x2: 100, y1: k * 33.333, y2: k * 33.333, 'vector-effect': 'non-scaling-stroke' })));
    dibujo.append(
        svg('path', { class: 'tendencia__area', d: `${linea} L100,100 L0,100 Z` }),
        svg('path', { class: 'tendencia__linea', d: linea, 'vector-effect': 'non-scaling-stroke' }));

    // Eje: 0, 1/3, 2/3 y el tope, en números redondos
    const eje = el('div', { class: 'tendencia__eje', 'aria-hidden': 'true' }, ...[3, 2, 1, 0].map((k) => {
        const marca = el('span', {}, corto((tope / 3) * k));
        marca.style.top = `${100 - k * 33.333}%`;
        return marca;
    }));
    const cadaCuanto = Math.max(1, Math.ceil(puntos.length / 6));
    const fechas = el('div', { class: 'tendencia__fechas', 'aria-hidden': 'true' }, ...puntos.map((p, i) => {
        if (i % cadaCuanto !== 0 && i !== puntos.length - 1) return null;
        if (i !== puntos.length - 1 && puntos.length - 1 - i < cadaCuanto / 2) return null; // que no se pise con la última
        const f = el('span', {}, fechaCorta(p.fecha, unidad));
        f.style.left = `${x(i)}%`;
        return f;
    }));

    // Lo que aparece al pasar el mouse: la línea vertical, el punto y el cartel con el valor
    const guia = el('span', { class: 'tendencia__cursor', hidden: true });
    const punto = el('span', { class: 'tendencia__punto', hidden: true });
    const cartel = el('span', { class: 'tendencia__cartel', hidden: true });
    const lienzo = el('div', { class: 'tendencia__lienzo' }, dibujo, guia, punto, cartel);
    const marcar = (evento) => {
        const caja = lienzo.getBoundingClientRect();
        const i = Math.round(((evento.clientX - caja.left) / caja.width) * ultimo);
        const p = puntos[Math.min(Math.max(i, 0), puntos.length - 1)];
        const indice = puntos.indexOf(p);
        [guia, punto, cartel].forEach((nodo) => { nodo.hidden = false; nodo.style.left = `${x(indice)}%`; });
        punto.style.top = `${y(p[clave])}%`;
        cartel.classList.toggle('tendencia__cartel--izquierda', x(indice) > 60);
        cartel.replaceChildren(el('span', {}, `${unidad === 'semana' ? 'Semana del ' : ''}${fechaCorta(p.fecha, 'dia')}`), el('strong', {}, formatear(p[clave])));
    };
    lienzo.addEventListener('pointermove', marcar);
    lienzo.addEventListener('pointerdown', marcar);
    lienzo.addEventListener('pointerleave', () => [guia, punto, cartel].forEach((nodo) => { nodo.hidden = true; }));

    const tabla = el('table', { class: 'solo-lector' },
        el('caption', {}, `${nombre} por ${porUnidad}`),
        el('tbody', {}, ...puntos.map((p) => el('tr', {}, el('th', { scope: 'row' }, fechaCorta(p.fecha, unidad)), el('td', {}, formatear(p[clave]))))));
    return el('div', { class: `tendencia ${clase}` }, cabeza, el('div', { class: 'tendencia__cuerpo' }, eje, lienzo, fechas), tabla);
}

// Varias series en el MISMO gráfico, solo cuando todas son de la misma unidad (pesos) y se comparan entre sí: los
// ingresos de cada fuente. Una línea por serie (sin área, para que no se tapen), la leyenda arriba con el total de
// cada una y, al pasar el mouse, el cartel con el valor de todas ese día o semana.
// series: [{clave, nombre, clase}] (clase: 'fuente--inspecciones' | 'fuente--clics' | 'fuente--abonos')
function variasTendencias(serie, series, { nombre, formatear = n }) {
    const { puntos, unidad } = serie;
    const totales = series.map((s) => puntos.reduce((suma, p) => suma + p[s.clave], 0));
    const leyenda = el('ul', { class: 'comparar__leyenda', role: 'list' }, ...series.map((s, i) =>
        el('li', {}, el('span', { class: `comparar__muestra ${s.clase}`, 'aria-hidden': 'true' }), `${s.nombre}: `, el('strong', {}, formatear(totales[i])))));
    const cabeza = el('div', { class: 'tendencia__cabeza' }, el('span', { class: 'tendencia__nombre' }, nombre), leyenda);
    if (!totales.some((t) => t > 0)) return el('div', { class: 'tendencia' }, cabeza, el('p', { class: 'barras__vacio' }, 'No hubo ingresos en este período.'));

    const tope = ejeRedondo(Math.max(...series.flatMap((s) => puntos.map((p) => p[s.clave]))));
    const corto = formatear === pesos ? pesosCorto : n;
    const ultimo = Math.max(puntos.length - 1, 1);
    const x = (i) => (i / ultimo) * 100;
    const y = (v) => 100 - (v / tope) * 100;
    const dibujo = svg('svg', { class: 'tendencia__dibujo', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    [0, 1, 2, 3].forEach((k) => dibujo.append(svg('line', { class: 'tendencia__guia', x1: 0, x2: 100, y1: k * 33.333, y2: k * 33.333, 'vector-effect': 'non-scaling-stroke' })));
    series.forEach((s) => dibujo.append(svg('path', {
        class: `tendencia__linea ${s.clase}`, 'vector-effect': 'non-scaling-stroke',
        d: puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[s.clave])}`).join(' '),
    })));
    const eje = el('div', { class: 'tendencia__eje', 'aria-hidden': 'true' }, ...[3, 2, 1, 0].map((k) => {
        const marca = el('span', {}, corto((tope / 3) * k));
        marca.style.top = `${100 - k * 33.333}%`;
        return marca;
    }));
    const cadaCuanto = Math.max(1, Math.ceil(puntos.length / 6));
    const fechas = el('div', { class: 'tendencia__fechas', 'aria-hidden': 'true' }, ...puntos.map((p, i) => {
        if (i % cadaCuanto !== 0 && i !== puntos.length - 1) return null;
        if (i !== puntos.length - 1 && puntos.length - 1 - i < cadaCuanto / 2) return null;
        const f = el('span', {}, fechaCorta(p.fecha, unidad));
        f.style.left = `${x(i)}%`;
        return f;
    }));

    const guia = el('span', { class: 'tendencia__cursor', hidden: true });
    const marcas = series.map((s) => el('span', { class: `tendencia__punto ${s.clase}`, hidden: true }));
    const cartel = el('span', { class: 'tendencia__cartel', hidden: true });
    const lienzo = el('div', { class: 'tendencia__lienzo' }, dibujo, guia, ...marcas, cartel);
    const marcar = (evento) => {
        const caja = lienzo.getBoundingClientRect();
        const i = Math.min(Math.max(Math.round(((evento.clientX - caja.left) / caja.width) * ultimo), 0), puntos.length - 1);
        const p = puntos[i];
        [guia, cartel, ...marcas].forEach((nodo) => { nodo.hidden = false; nodo.style.left = `${x(i)}%`; });
        marcas.forEach((marca, k) => { marca.style.top = `${y(p[series[k].clave])}%`; });
        cartel.classList.toggle('tendencia__cartel--izquierda', x(i) > 60);
        cartel.replaceChildren(el('span', {}, `${unidad === 'semana' ? 'Semana del ' : ''}${fechaCorta(p.fecha, 'dia')}`),
            ...series.map((s) => el('span', { class: 'tendencia__cartel-fila' },
                el('span', { class: `comparar__muestra ${s.clase}`, 'aria-hidden': 'true' }), `${s.nombre}: `, el('strong', {}, formatear(p[s.clave])))));
    };
    lienzo.addEventListener('pointermove', marcar);
    lienzo.addEventListener('pointerdown', marcar);
    lienzo.addEventListener('pointerleave', () => [guia, cartel, ...marcas].forEach((nodo) => { nodo.hidden = true; }));

    const porUnidad = unidad === 'semana' ? 'semana' : 'día';
    const tabla = el('table', { class: 'solo-lector' },
        el('caption', {}, `${nombre} por ${porUnidad}`),
        el('thead', {}, el('tr', {}, el('th', {}, 'Fecha'), ...series.map((s) => el('th', {}, s.nombre)))),
        el('tbody', {}, ...puntos.map((p) => el('tr', {}, el('th', { scope: 'row' }, fechaCorta(p.fecha, unidad)),
            ...series.map((s) => el('td', {}, formatear(p[s.clave])))))));
    return el('div', { class: 'tendencia tendencia--varias' }, cabeza, el('div', { class: 'tendencia__cuerpo' }, eje, lienzo, fechas), tabla);
}

function llenar(id, ...hijos) {
    document.getElementById(id).replaceChildren(...hijos.filter(hijo => hijo != null));
}

function horas(h) {
    if (h === null) return '—';
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? '1 día' : `${d} días`;
}

// Lo facturado en una barra apilada de dos partes (mecánicos y AutoCar), con leyenda y montos
function reparto(g) {
    const partes = [
        ['mecanicos', 'Mecánicos', g.mecanicos],
        ['autocar', 'AutoCar', g.autocar],
    ];
    const total = partes.reduce((s, [, , v]) => s + v, 0);
    if (!total) return null;
    const pct = (v) => `${porcentaje(v, total)} %`;
    const barra = el('div', { class: 'reparto__barra', 'aria-hidden': 'true' }, ...partes.filter(([, , v]) => v > 0).map(([clave, nombre, v]) => {
        const tramo = el('span', { class: `reparto__tramo reparto--${clave}`, title: `${nombre}: ${pesos(v)} (${pct(v)})` });
        tramo.style.flexGrow = String(v);
        return tramo;
    }));
    return [barra, el('ul', { class: 'reparto__leyenda', role: 'list' }, ...partes.map(([clave, nombre, v]) =>
        el('li', {}, el('span', { class: `reparto__muestra reparto--${clave}`, 'aria-hidden': 'true' }),
            el('span', {}, nombre), el('strong', {}, pesos(v)), el('span', { class: 'reparto__porcentaje' }, pct(v)))))];
}

// Embudo: cada paso con su barra (largo relativo a los que vieron) y el porcentaje
function pasoEmbudo(nombre, valor, base, nota) {
    const barra = el('span', { class: 'embudo__barra', 'aria-hidden': 'true' });
    // Entre 2 % (que se vea aunque sea 0) y 100 % (nunca más ancha que el recuadro)
    barra.style.setProperty('--largo', `${base ? Math.min(Math.max((valor / base) * 100, 2), 100) : 2}%`);
    return el('li', { class: 'embudo__paso' },
        el('span', { class: 'embudo__nombre' }, nombre),
        barra,
        el('span', { class: 'embudo__valor' }, el('strong', {}, n(valor)), nota ? el('span', {}, nota) : null));
}

// La tabla de cada recomendación. Con datos por tipo de usuario suma tres columnas: de los que la vieron, cuántos
// ordenaron la lista por precio, por km o por fecha de publicación ("Más nuevos"). Sirven para ajustar los pesos.
const ORDENARON = [['precio', 'Ordenaron por precio'], ['km', 'Ordenaron por km'], ['nuevos', 'Ordenaron por fecha de publicación']];
function tablaEmbudo(origenes) {
    const conversion = (o) => porcentaje(o.pagaron, o.vieron);
    const mejor = Math.max(...origenes.map(conversion));
    const conOrden = origenes.some((o) => o.ordenaron);
    const celdas = (fila, etiqueta = 'td') => el('tr', {}, ...fila.map((c) => el(etiqueta, {}, c)));
    const ordenaron = (o, clave) => {
        const valor = o.ordenaron?.[clave] ?? 0;
        return valor && o.vieron ? `${n(valor)} (${porcentaje(valor, o.vieron)} %)` : n(valor);
    };
    return [
        el('thead', {}, celdas(['Recomendación', 'Vieron', 'Tocaron "Mandale un mecánico"', 'Pagaron la inspección', 'Conversión (pagaron / vieron)', 'Con la inspección firmada',
            ...(conOrden ? ORDENARON.map(([, titulo]) => titulo) : [])], 'th')),
        el('tbody', {}, ...origenes.map((o) => {
            const tr = celdas([ORIGENES[o.origen] ?? o.origen, n(o.vieron), n(o.tocaron), n(o.pagaron),
                o.vieron ? `${conversion(o)} %` : '—', n(o.firmadas), ...(conOrden ? ORDENARON.map(([clave]) => ordenaron(o, clave)) : [])]);
            if (mejor > 0 && conversion(o) === mejor) tr.classList.add('tabla-embudo__mejor');
            return tr;
        })),
    ];
}

// Recomendaciones: botones Todos / cada tipo de usuario y la tabla de ese segmento. En "Todos" las columnas de
// "ordenaron" son la suma de los tipos de usuario (cada comprador tiene un solo tipo).
// Cuánta ganancia dejó cada recomendación y cuánto por persona en cada paso (viene calculado del back: conGanancia)
function tablaGanancia(origenes) {
    const o = (x) => (x === null || x === undefined ? '—' : pesos(x));
    const mejor = Math.max(...origenes.map((x) => x.por_vio ?? 0));
    return [
        el('thead', {}, celdas(['Recomendación', 'Ganancia', 'Por persona que la vio', 'Por persona que tocó "Mandale un mecánico"', 'Por inspección pagada'], 'th')),
        el('tbody', {}, ...origenes.map((x) => {
            const tr = celdas([ORIGENES[x.origen] ?? x.origen, pesos(x.ganancia ?? 0), o(x.por_vio), o(x.por_toco), o(x.por_pago)]);
            if (mejor > 0 && x.por_vio === mejor) tr.classList.add('tabla-embudo__mejor');
            return tr;
        })),
    ];
}

function mostrarEmbudo(origenes, quien = null) {
    llenar('tabla-embudo', ...tablaEmbudo(origenes));
    llenar('tabla-ganancia-embudo', ...tablaGanancia(origenes));
    llenar('barras-ganancia-embudo', ...barras(origenes.map((x) => [ORIGENES[x.origen] ?? x.origen, x.por_vio ?? 0]),
        'Todavía no hay ganancia de inspecciones firmadas en este período', {}, pesos, false));
    document.getElementById('ganancia-embudo-titulo').textContent = quien
        ? `Cuánta ganancia deja cada recomendación · ${quien}`
        : 'Cuánta ganancia deja cada recomendación';
}

function embudoPorPerfil(m) {
    const pp = m.por_perfil;
    document.getElementById('embudo-perfil').hidden = !pp;
    if (!pp) {
        mostrarEmbudo(m.embudo.origenes);
        return;
    }
    if (segmentoEmbudo !== 'todos' && !pp.embudo.some((f) => f.uso === segmentoEmbudo)) segmentoEmbudo = 'todos';
    const opciones = [['todos', 'Todos'], ...Object.entries(pp.usos)];
    llenar('segmento-embudo', ...opciones.map(([clave, texto]) => boton(texto, clave === segmentoEmbudo, () => {
        segmentoEmbudo = clave;
        embudoPorPerfil(ultimas);
    })));
    const fila = pp.embudo.find((f) => f.uso === segmentoEmbudo);
    const origenes = fila ? fila.origenes : m.embudo.origenes.map((o) => ({
        ...o,
        ordenaron: Object.fromEntries(ORDENARON.map(([clave]) => [clave, pp.embudo.reduce((suma, f) =>
            suma + (f.origenes.find((x) => x.origen === o.origen)?.ordenaron?.[clave] ?? 0), 0)])),
    }));
    document.getElementById('tabla-embudo-titulo').textContent = fila
        ? `Qué recomendación funciona mejor · ${fila.nombre}`
        : 'Qué recomendación funciona mejor';
    mostrarEmbudo(origenes, fila?.nombre);
}

// El informe de plata del período: los ingresos de las fuentes elegidas. Si el back todavía no manda estos números,
// el informe queda oculto.
function informePlata(actual, anterior, textoPeriodo) {
    const ingresos = ingresosElegidos(actual, fuentes);
    const caja = document.getElementById('informe-plata');
    caja.hidden = !fuentes.size || ingresos == null;
    if (caja.hidden) return;
    document.getElementById('t-informe').textContent = 'Informe de los últimos ' + textoPeriodo;
    document.getElementById('informe-frase').textContent =
        'Ingresos por ' + Object.keys(FUENTES).filter(f => fuentes.has(f)).map(f => FUENTES[f][0].toLowerCase()).join(', ') + '.';

    const fila = (nombre, detalle, monto, clase, extra = null) => el('div', { class: `informe-plata__fila ${clase}` },
        el('dt', {}, nombre, detalle ? el('span', { class: 'informe-plata__detalle' }, detalle) : null),
        el('dd', {}, el('span', {}, monto), extra));
    const desglose = Object.entries(FUENTES)
        .filter(([fuente]) => fuentes.has(fuente) && actual['ingresos_' + fuente] != null)
        .map(([fuente, [nombre, detalle]]) => fila(nombre, detalle, pesos(actual['ingresos_' + fuente]), ''));
    llenar('informe-cuenta', ...desglose, fila('Ingresos del período', '', pesos(ingresos),
        'informe-plata__fila--neta', variacion(ingresos, ingresosElegidos(anterior, fuentes))));
    const notas = [];
    if (fuentes.has('inspecciones')) notas.push('Inspecciones por cobrar: ' + pesos(actual.por_cobrar) + '.');
    if (fuentes.has('clics') && actual.clics_por_cobrar != null) notas.push(
        'Clics pendientes de liquidación: ' + pesos(actual.clics_por_cobrar) + ' estimados por ' + n(actual.clics_pendientes) + ' clics válidos del período.');
    document.getElementById('informe-notas').textContent = notas.join(' ');
}

// ---------- Comparar las fuentes de ingreso ----------
// Para cada fuente elegida: lo que dejó, qué parte del total es, cuánto creció, cuántas "unidades" hubo y cuánto dejó
// cada una. "plata" es contra qué se compara la cantidad: en los clics, lo que valen los del período con la tarifa de
// hoy (clics_valor), porque lo cobrado (ingresos_clics) llega por liquidación mensual y no sigue a los clics del período.
const UNIDADES = {
    inspecciones: { cantidad: 'firmadas', plata: 'ingresos_inspecciones', una: 'inspección firmada', varias: 'inspecciones firmadas', quien: 'las inspecciones' },
    clics: { cantidad: 'clics_validos', plata: 'clics_valor', una: 'clic válido', varias: 'clics válidos', quien: 'los clics' },
    abonos: { cantidad: 'abonos_cobrados', plata: 'ingresos_abonos', una: 'abono mensual', varias: 'abonos cobrados', quien: 'las concesionarias' },
};
const CLASE_FUENTE = { inspecciones: 'fuente--inspecciones', clics: 'fuente--clics', abonos: 'fuente--abonos' };
// Cuánto cambió en % (null si antes era 0: no hay contra qué comparar)
const cambioPorcentual = (actual, anterior) => (anterior ? Math.round(((actual - anterior) / anterior) * 100) : null);
const conSigno = (v, sufijo = ' %') => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}${sufijo}`);
const mayuscula = (texto) => texto[0].toUpperCase() + texto.slice(1);

function filasFuentes(actual, anterior) {
    const elegidas = Object.keys(FUENTES).filter((f) => fuentes.has(f) && actual['ingresos_' + f] != null);
    const total = (d) => elegidas.reduce((s, f) => s + (d['ingresos_' + f] ?? 0), 0);
    const [totalAhora, totalAntes] = [total(actual), total(anterior)];
    return elegidas.map((f) => {
        const u = UNIDADES[f];
        const [ingresos, ingresosAntes] = [actual['ingresos_' + f], anterior['ingresos_' + f] ?? 0];
        const [cantidad, cantidadAntes] = [actual[u.cantidad] ?? 0, anterior[u.cantidad] ?? 0];
        const [plata, plataAntes] = [actual[u.plata] ?? 0, anterior[u.plata] ?? 0];
        const parte = totalAhora ? (ingresos / totalAhora) * 100 : 0;
        const parteAntes = totalAntes ? (ingresosAntes / totalAntes) * 100 : null;
        const porUnidad = cantidad ? plata / cantidad : null;
        const porUnidadAntes = cantidadAntes ? plataAntes / cantidadAntes : null;
        return {
            fuente: f, nombre: FUENTES[f][0], u, ingresos, cantidad,
            parte, puntos: parteAntes === null ? null : Math.round(parte - parteAntes),
            crecimiento: cambioPorcentual(ingresos, ingresosAntes),
            crecimientoCantidad: cambioPorcentual(cantidad, cantidadAntes),
            crecimientoPlata: cambioPorcentual(plata, plataAntes),
            porUnidad,
            cambioPorUnidad: porUnidad === null || !porUnidadAntes ? null : cambioPorcentual(porUnidad, porUnidadAntes),
        };
    });
}

// Las conclusiones en palabras, de lo más general a lo más fino
function conclusionesFuentes(filas, textoPeriodo) {
    const conIngresos = filas.filter((f) => f.ingresos > 0).sort((a, b) => b.parte - a.parte);
    if (!conIngresos.length) return [`Todavía no hay ingresos de estas fuentes en los últimos ${textoPeriodo}.`];
    const [mayor, segunda] = conIngresos;
    const frases = [`${mayuscula(mayor.u.quien)} dejaron el ${Math.round(mayor.parte)} % de los ingresos de los últimos ${textoPeriodo}`
        + (segunda ? `; ${segunda.u.quien}, el ${Math.round(segunda.parte)} %.` : '.')];

    const movida = filas.filter((f) => f.puntos).sort((a, b) => Math.abs(b.puntos) - Math.abs(a.puntos))[0];
    if (movida) frases.push(`${mayuscula(movida.u.quien)} ${movida.puntos > 0 ? 'ganaron' : 'perdieron'} ${Math.abs(movida.puntos)} puntos de participación contra el período anterior.`);

    const crecen = filas.filter((f) => f.crecimiento !== null).sort((a, b) => b.crecimiento - a.crecimiento);
    const verbo = (c) => (c >= 0 ? `crecieron ${c} %` : `bajaron ${Math.abs(c)} %`);
    if (crecen.length >= 2 && crecen[0].crecimiento !== crecen.at(-1).crecimiento) {
        const [rapida, lenta] = [crecen[0], crecen.at(-1)];
        frases.push(`${mayuscula(rapida.u.quien)} ${verbo(rapida.crecimiento)} y ${lenta.u.quien} ${verbo(lenta.crecimiento)}: crecen más rápido ${rapida.u.quien}.`);
    }

    // Cantidad contra plata: si hubo más clics (o inspecciones) pero la plata no subió igual, cada uno deja menos
    filas.forEach((f) => {
        const [c, p] = [f.crecimientoCantidad, f.crecimientoPlata];
        if (c === null || p === null || Math.abs(c - p) < 5) return;
        const cantidad = c >= 0 ? `Hubo ${c} % más ${f.u.varias}` : `Hubo ${Math.abs(c)} % menos ${f.u.varias}`;
        const plata = p >= 0 ? `la plata subió ${p} %` : `la plata bajó ${Math.abs(p)} %`;
        frases.push(`${cantidad} y ${plata}: cada ${f.u.una} deja ${p > c ? 'más' : 'menos'} que antes.`);
    });

    const rinden = filas.filter((f) => f.porUnidad !== null);
    if (rinden.length) frases.push(mayuscula(rinden.map((f) => `cada ${f.u.una} deja ${pesos(Math.round(f.porUnidad))}`).join('; ')) + '.');
    return frases;
}

function compararFuentes(actual, anterior, textoPeriodo, serie) {
    const caja = document.getElementById('comparar-fuentes');
    const filas = filasFuentes(actual, anterior);
    caja.hidden = filas.length < 2; // con una sola fuente no hay nada que comparar
    if (caja.hidden) return;
    llenar('conclusiones-plata', ...conclusionesFuentes(filas, textoPeriodo).map((frase) => el('li', {}, frase)));
    llenar('barras-fuentes', ...barras(filas.map((f) => [f.nombre, f.ingresos]), 'Todavía no hay ingresos en este período',
        Object.fromEntries(filas.map((f) => [f.nombre, CLASE_FUENTE[f.fuente]])), pesos));
    const cambioCelda = (v, sufijo) => el('span', { class: v ? `variacion ${v > 0 ? 'variacion--buena' : 'variacion--mala'}` : 'variacion' }, conSigno(v, sufijo));
    llenar('tabla-fuentes',
        el('thead', {}, celdas(['Fuente', 'Ingresos', 'Parte', 'Parte vs. antes', 'Crecimiento', 'Cantidad', 'Cantidad vs. antes', 'Por unidad', 'Por unidad vs. antes'], 'th')),
        el('tbody', {}, ...filas.map((f) => celdas([
            f.nombre, pesos(f.ingresos), `${Math.round(f.parte)} %`, cambioCelda(f.puntos, ' pts'), cambioCelda(f.crecimiento),
            `${n(f.cantidad)} ${f.cantidad === 1 ? f.u.una : f.u.varias}`, cambioCelda(f.crecimientoCantidad),
            f.porUnidad === null ? '—' : `${pesos(Math.round(f.porUnidad))} por ${f.u.una}`, cambioCelda(f.cambioPorUnidad),
        ]))));
    llenar('grafico-fuentes', variasTendencias(serie,
        filas.map((f) => ({ clave: 'ingresos_' + f.fuente, nombre: f.nombre, clase: CLASE_FUENTE[f.fuente] })),
        { nombre: 'Ingresos de cada fuente', formatear: pesos }));
}

// ---------- Por tipo de usuario ("¿Para qué buscás el auto?", obligatoria) ----------

const celdas = (fila, etiqueta = 'td') => el('tr', {}, ...fila.map((c) => el(etiqueta, {}, c)));

// Plata: los botones Todos / cada tipo de usuario, el informe del segmento elegido y la tabla que los compara
function plataPorPerfil(m) {
    const pp = m.por_perfil;
    const caja = document.getElementById('plata-perfil');
    caja.hidden = !pp;
    document.getElementById('plata-perfil-tabla').hidden = !pp;
    const resumenPerfil = document.getElementById('ingresos-perfil');
    resumenPerfil.hidden = true;
    if (!pp) return;
    if (segmento !== 'todos' && !pp.plata.some((f) => f.uso === segmento)) segmento = 'todos';
    const opciones = [['todos', 'Todos'], ...Object.entries(pp.usos)];
    llenar('segmento-plata', ...opciones.map(([clave, texto]) => boton(texto, clave === segmento, () => {
        segmento = clave;
        plataPorPerfil(ultimas);
    })));
    const fila = pp.plata.find((f) => f.uso === segmento);
    if (fila) {
        resumenPerfil.textContent = fila.nombre + ' · Ingresos por inspecciones: ' + pesos(fila.ingresos)
            + ' · Por cobrar: ' + pesos(fila.por_cobrar);
        resumenPerfil.hidden = false;
    }

    // La tabla: cada tipo de usuario con lo que pagó, lo que ganó AutoCar y qué parte de la ganancia es
    const total = pp.plata.reduce((s, f) => s + f.ingresos, 0);
    const mejor = Math.max(...pp.plata.map((f) => f.ingresos));
    llenar('tabla-plata-perfil',
        el('thead', {}, celdas(['Tipo de usuario', 'Inspecciones pagadas', 'Compradores', 'Ganancia', 'Parte de la ganancia', 'Por cobrar'], 'th')),
        el('tbody', {}, ...pp.plata.map((f) => {
            const tr = celdas([f.nombre, n(f.pagaron), n(f.compradores), pesos(f.ingresos),
                total && f.ingresos > 0 ? `${porcentaje(f.ingresos, total)} %` : '—', pesos(f.por_cobrar)]);
            if (mejor > 0 && f.ingresos === mejor) tr.classList.add('tabla-embudo__mejor');
            if (f.uso === segmento) tr.classList.add('tabla-perfil__elegida');
            return tr;
        })));
    llenar('barras-plata-perfil', ...barras(pp.plata.map((f) => [f.nombre, f.ingresos]), 'Todavía no hay ganancia en este período', {}, pesos));
}

// Cuánto le cuesta decidirse a cada tipo de usuario: interacciones (buscar, cambiar el orden, tocar "Mandale un
// mecánico") y días desde la primera hasta pagar, en mediana de los compradores
const decimal = (v) => String(v).replace('.', ',');
function valorPorPerfil(v) {
    document.getElementById('valor-figura').hidden = !v;
    if (!v) return;
    const t = v.total;
    const o = (x, f = n) => (x === null ? '—' : f(x));
    llenar('kpis-valor',
        tarjeta(t.interacciones_hasta_comprar === null ? null : decimal(t.interacciones_hasta_comprar), 'Interacciones hasta comprar (mediana)'),
        tarjeta(t.dias_hasta_comprar === null ? null : `${decimal(t.dias_hasta_comprar)} días`, 'De la primera interacción a pagar (mediana)'));
    llenar('tabla-valor',
        el('thead', {}, celdas(['Tipo de usuario', 'Interacciones', 'Usuarios activos', 'Compradores', 'Interacciones hasta comprar', 'Días hasta comprar'], 'th')),
        el('tbody', {}, ...v.por_uso.map((f) => celdas([f.nombre, n(f.interacciones), n(f.activos),
            f.compradores_sin_interacciones ? `${n(f.compradores)} (${n(f.compradores_sin_interacciones)} sin interacciones)` : n(f.compradores),
            o(f.interacciones_hasta_comprar, decimal), o(f.dias_hasta_comprar, decimal)]))));
}

// Gráfico: por cada tipo de usuario, dos barras (buscaron en el metabuscador y, de esos, pagaron la inspección),
// con el largo relativo al grupo que más buscó. Primero el total. Cada barra lleva su número al lado.
function buscaronYCompraron(mb) {
    const grupos = [{ nombre: 'Todos', ...mb.total }, ...mb.por_uso];
    const maximo = Math.max(...grupos.map((g) => g.buscaron), 1);
    const barra = (clase, valor, texto) => {
        const b = el('span', { class: `comparar__barra comparar__barra--${clase}`, 'aria-hidden': 'true' });
        b.style.setProperty('--largo', `${Math.max((valor / maximo) * 100, valor ? 2 : 0)}%`);
        return el('div', { class: 'comparar__fila' }, el('span', { class: 'comparar__que' }, texto), b,
            el('span', { class: 'comparar__valor' }, n(valor)));
    };
    return grupos.map((g, i) => el('li', { class: `comparar__grupo${i === 0 ? ' comparar__grupo--total' : ''}` },
        el('span', { class: 'comparar__nombre' }, g.nombre,
            el('span', { class: 'comparar__tasa' }, g.buscaron ? `${porcentaje(g.compraron, g.buscaron)} % compró` : 'nadie buscó')),
        barra('buscaron', g.buscaron, 'Buscaron'),
        barra('compraron', g.compraron, 'Compraron')));
}

// Qué orden elige cada tipo de usuario: compradores distintos (y qué parte de los que eligieron un orden)
function tablaOrdenes(ordenes) {
    return [
        el('thead', {}, celdas(['Tipo de usuario', ...Object.values(ORDENES), 'El que más eligen'], 'th')),
        el('tbody', {}, ...ordenes.map((fila) => {
            const total = Object.values(fila.ordenes).reduce((s, o) => s + o.usuarios, 0);
            return el('tr', {},
                el('th', { scope: 'row' }, fila.nombre),
                ...Object.keys(ORDENES).map((clave) => {
                    const o = fila.ordenes[clave] ?? { usuarios: 0, veces: 0 };
                    const td = el('td', { title: `${n(o.usuarios)} compradores, ${n(o.veces)} veces` },
                        o.usuarios ? `${n(o.usuarios)}` : '—',
                        o.usuarios ? el('span', { class: 'tabla-perfil__detalle' }, `${porcentaje(o.usuarios, total)} %`) : null);
                    if (clave === fila.preferido) td.classList.add('tabla-perfil__mejor');
                    return td;
                }),
                el('td', {}, fila.preferido ? ORDENES[fila.preferido] : 'Nadie eligió un orden'));
        })),
    ];
}

// Qué cambiar: si un perfil ordena casi siempre por otra cosa que "Recomendado", la fórmula de "Recomendados" de ese perfil
// no le está mostrando lo que busca. Se sugiere subir ese peso en Parámetros (solo los perfiles tienen fórmula).
function sugerenciasOrden(ordenes) {
    const items = ordenes.filter((f) => f.preferido && f.preferido !== 'recomendado').map((f) =>
        el('li', {}, el('strong', {}, `${f.nombre}: `),
            `la mayoría ordena por "${ORDENES[f.preferido]}". Probá subir cuánto pesa ${PESO_DEL_ORDEN[f.preferido]} para ese perfil en `,
            el('a', { href: 'admin-parametros.html' }, 'Parámetros'), '.'));
    return items.length
        ? items
        : [el('li', { class: 'barras__vacio' }, 'Ningún perfil prefiere otro orden que "Más recomendados": la fórmula de "Recomendados" parece acertar (o todavía no hay datos).')];
}

// ---------- Afiliaciones: lo que se cobra a las plataformas por los clics (convenio simulado) ----------

const nombreMes = (mes, largo = false) => new Date(`${mes}T12:00:00`).toLocaleDateString('es-AR', { month: largo ? 'long' : 'short', year: 'numeric' });
const mesCorto = (mes) => mes.slice(0, 7); // "2026-10-01" → "2026-10", como lo pide la API
const ESTADO_MES = { en_curso: 'En curso', pendiente: 'Falta cobrar', cobrado: 'Cobrado' };

function esteMesAfiliacion(m) {
    llenar('kpis-afiliacion',
        tarjeta(m.total, `A cobrar en ${nombreMes(m.mes, true)}`, pesos),
        fuentes.has('clics') ? tarjeta(m.de_clics, `De clics a plataformas (${n(m.validos)} válidos de ${n(m.clics)})`, pesos) : null,
        fuentes.has('abonos') ? tarjeta(m.de_abonos, 'Afiliaciones de concesionarias', pesos) : null);
    document.getElementById('afiliacion-mes-titulo').textContent = `Lo que se va a cobrar en ${nombreMes(m.mes, true)}`;
    const conClics = fuentes.has('clics');
    const cantidades = (clics, validos) => conClics ? [clics, validos] : [];
    llenar('tabla-afiliacion-mes',
        el('thead', {}, celdas(['Socio', 'Tipo', ...cantidades('Clics', 'Válidos'), 'Tarifa', 'A cobrar'], 'th')),
        el('tbody', {}, ...m.filas.map((f) => celdas(f.tipo === 'empresa'
            ? [f.nombre, 'Concesionaria', ...cantidades('—', '—'), 'Abono mensual', pesos(f.monto)]
            : [f.nombre, 'Plataforma', ...cantidades(n(f.clics), n(f.validos)), f.activo ? pesos(f.tarifa_clic) + ' / clic' : 'Sin convenio activo', pesos(f.monto)])),
        celdas([el('strong', {}, 'Total del mes'), '', ...cantidades(n(m.clics), n(m.validos)), '', el('strong', {}, pesos(m.total))])));
    document.getElementById('afiliacion-cierre').textContent = m.dias_al_cierre
        ? `Faltan ${m.dias_al_cierre} ${m.dias_al_cierre === 1 ? 'día' : 'días'} para el cierre del mes.`
        : 'Hoy cierra el mes.';
}

// Una columna por mes, partida en clics y abonos, con el alto relativo al mes que más se cobró
function mesesAfiliacion(evolucion) {
    const maximo = Math.max(...evolucion.map((m) => m.total), 0);
    llenar('meses-afiliacion', ...evolucion.map((m, i) => {
        const columna = el('span', { class: 'meses__columna', 'aria-hidden': 'true' },
            ...[['clics', m.de_clics], ['abonos', m.de_abonos]].map(([clase, valor]) => {
                const tramo = el('span', { class: `meses__tramo meses__tramo--${clase}` });
                tramo.style.setProperty('--alto', `${maximo ? (valor / maximo) * 100 : 0}%`);
                return tramo;
            }));
        const li = el('li', { class: `meses__mes${m.en_curso ? ' meses__mes--actual' : ''}`, title: `${nombreMes(m.mes)}: ${pesos(m.total)}` },
            el('span', { class: 'meses__valor', 'aria-hidden': 'true' }, m.total ? pesosCorto(m.total) : ''),
            columna,
            el('span', { class: 'meses__nombre', 'aria-hidden': 'true' }, nombreMes(m.mes)),
            el('span', { class: 'solo-lector' }, `${nombreMes(m.mes, true)}: ${pesos(m.total)}${m.en_curso ? ' (en curso)' : ''}`));
        li.style.setProperty('--n', String(i));
        return li;
    }));
}

// Los meses cerrados, del más nuevo al más viejo; al tocar uno se ve cada socio y se marca cobrado
let mesAbierto = null;
function mesesCerradosAfiliacion(evolucion) {
    const deClics = (...valores) => fuentes.has('clics') ? valores : [];
    const deAbonos = (valor) => fuentes.has('abonos') ? [valor] : [];
    const columnas = ['Mes', ...deClics('Clics válidos', 'De clics'), ...deAbonos('De afiliaciones'), 'Total', 'Estado', ''];
    const cerrados = evolucion.filter((m) => !m.en_curso).reverse();
    const filas = cerrados.flatMap((m) => {
        const abierto = mesAbierto === m.mes;
        const ver = el('button', { class: 'boton-link', type: 'button', 'aria-expanded': String(abierto) }, abierto ? 'Ocultar' : 'Ver por socio');
        ver.addEventListener('click', () => { mesAbierto = abierto ? null : m.mes; mesesCerradosAfiliacion(evolucion); });
        const estado = el('span', { class: `estado-cobro estado-cobro--${m.estado}` }, ESTADO_MES[m.estado]);
        const fila = celdas([nombreMes(m.mes, true), ...deClics(n(m.validos), pesos(m.de_clics)), ...deAbonos(pesos(m.de_abonos)), pesos(m.total), estado, ver]);
        if (!abierto) return [fila];
        const detalle = el('table', { class: 'tabla tabla-cobros' },
            el('thead', {}, celdas(['Socio', 'Tipo', ...deClics('Clics válidos'), 'Monto', ''], 'th')),
            el('tbody', {}, ...m.filas.map((f) => celdas([f.nombre, f.tipo === 'empresa' ? 'Abono' : 'Clics',
                ...deClics(f.tipo === 'empresa' ? '—' : n(f.validos)), pesos(f.monto), cobroDe(m, f)]))));
        return [fila, el('tr', { class: 'tabla-cobros__fila' }, el('td', { colspan: String(columnas.length) }, detalle))];
    });
    llenar('tabla-afiliacion-meses',
        el('thead', {}, celdas(columnas, 'th')),
        el('tbody', {}, ...(filas.length ? filas : [el('tr', {}, el('td', { colspan: String(columnas.length) }, 'Todavía no hay meses cerrados.'))])));
}

function cobroDe(m, f) {
    if (f.cobrado_at) return el('span', { class: 'estado-cobro estado-cobro--cobrado' }, `Cobrado el ${new Date(f.cobrado_at).toLocaleDateString('es-AR')}`);
    if (!f.monto) return el('span', { class: 'suave' }, 'Nada que cobrar');
    const b = el('button', { class: 'boton boton--chico', type: 'button' }, 'Marcar cobrado');
    b.addEventListener('click', async () => {
        b.disabled = true;
        try {
            mostrarAfiliacion(await admin.cobrarAfiliacion(f.tipo, f.socio, mesCorto(m.mes)));
            await cargar();
        } catch (error) {
            b.replaceWith(el('span', { class: 'campo__error' }, error.status === 403 ? 'No tenés permiso para marcar cobros.' : error.message));
        }
    });
    return b;
}

// La tarifa por clic de cada plataforma y si el convenio está activo (cambiarlos pide parametros.editar)
function conveniosAfiliacion(convenios) {
    llenar('tabla-convenios',
        el('thead', {}, celdas(['Plataforma', 'Tarifa por clic', 'Activo', ''], 'th')),
        el('tbody', {}, ...convenios.map((c) => {
            const tarifa = el('input', { class: 'campo__input tabla-convenios__tarifa', type: 'number', min: '0', step: '10',
                value: String(c.tarifa_clic), 'aria-label': `Tarifa por clic de ${c.nombre}` });
            const activo = el('input', { type: 'checkbox', 'aria-label': `Convenio con ${c.nombre} activo` });
            activo.checked = c.activo;
            const mensaje = el('span', { class: 'suave', 'aria-live': 'polite' });
            const guardar = el('button', { class: 'boton boton--chico boton--secundario', type: 'button' }, 'Guardar');
            guardar.addEventListener('click', async () => {
                guardar.disabled = true;
                try {
                    await admin.guardarConvenio(c.fuente, Number(tarifa.value), activo.checked);
                    await Promise.all([cargarAfiliacion(), cargar()]);
                } catch (error) {
                    mensaje.textContent = error.status === 403 ? 'No tenés permiso para cambiar los convenios.' : error.message;
                    guardar.disabled = false;
                }
            });
            return celdas([c.nombre, tarifa, activo, el('span', { class: 'tabla-convenios__acciones' }, guardar, mensaje)]);
        })));
}

function mostrarAfiliacion(a) {
    afiliacionActual = a;
    pintarLiquidaciones();
    conveniosAfiliacion(a.convenios);
}

function pintarLiquidaciones() {
    if (!fuentes.has('abonos') && !fuentes.has('clics')) return;
    const evolucion = afiliacionActual.evolucion.map(m => liquidacionElegida(m, fuentes));
    esteMesAfiliacion(liquidacionElegida(afiliacionActual.este_mes, fuentes));
    mesesAfiliacion(evolucion);
    mesesCerradosAfiliacion(evolucion);
}

async function cargarAfiliacion() {
    const estado = document.getElementById('estado-afiliaciones');
    const detalle = document.getElementById('detalle-afiliaciones');
    try {
        mostrarAfiliacion(await admin.afiliacion());
        detalle.hidden = false;
        estado.hidden = true;
    } catch (error) {
        estado.hidden = false;
        detalle.hidden = true;
        estado.replaceChildren(vistas.avisoDeError(error));
    }
}

// ---------- Pestañas y período (los botones se arman acá, no en el HTML) ----------

function boton(texto, activo, alTocar) {
    const b = el('button', { class: 'pestana-estado', type: 'button', 'aria-pressed': String(activo) }, texto);
    b.addEventListener('click', alTocar);
    return b;
}

function mostrarPestana() {
    document.querySelectorAll('.metricas-panel').forEach((panel) => {
        panel.hidden = panel.dataset.pestana !== pestana;
    });
    document.querySelectorAll('[data-pestana-boton]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pestanaBoton === pestana)));
}

function armarControles() {
    const pestanas = el('div', { class: 'pestanas-estado', role: 'group', 'aria-label': 'Secciones' }, ...PESTANAS.map(([clave, texto]) => {
        const b = boton(texto, clave === pestana, () => {
            pestana = clave;
            window.history.replaceState(null, '', `?dias=${dias}#${clave}`);
            mostrarPestana();
        });
        b.dataset.pestanaBoton = clave;
        return b;
    }));
    const periodo = el('div', { class: 'metricas-periodo', role: 'group', 'aria-label': 'Período' },
        el('span', { class: 'metricas-periodo__etiqueta' }, 'Período'),
        ...Object.entries(PERIODOS).map(([valor, texto]) => {
            const b = boton(texto, Number(valor) === dias, () => {
                if (Number(valor) === dias) return;
                dias = Number(valor);
                window.history.replaceState(null, '', `?dias=${dias}#${pestana}`);
                document.querySelectorAll('[data-periodo]').forEach((x) => x.setAttribute('aria-pressed', String(Number(x.dataset.periodo) === dias)));
                cargar();
            });
            b.dataset.periodo = valor;
            return b;
        }));
    llenar('controles', pestanas, periodo);
}

// ---------- Llenar cada pestaña ----------

function mostrar(m) {
    const { actual, anterior } = m.resumen;
    const textoPeriodo = PERIODOS[m.periodo.dias];
    const emb = m.embudo.total;
    const conversion = porcentaje(emb.pagaron, emb.vieron);

    // Resumen
    llenar('kpis',
        tarjeta(actual.pagaron, `Pagaron la inspección ("compró") en ${textoPeriodo}`, n, { anterior: anterior.pagaron }),
        tarjeta(emb.vieron ? `${conversion} %` : '—', 'De los que vieron una recomendación, pagaron la inspección'),
        tarjeta(actual.ingresos ?? actual.ganancia, `Ingresos de AutoCar en ${textoPeriodo}`, pesos, { anterior: anterior.ingresos ?? anterior.ganancia }),
        tarjeta(actual.nuevos_usuarios, `Usuarios nuevos en ${textoPeriodo}`, n, { anterior: anterior.nuevos_usuarios }));
    llenar('grafico-pagaron', tendencia(m.serie, { clave: 'pagaron', nombre: 'Inspecciones pagadas', clase: 'tendencia--1' }));
    llenar('grafico-nuevos', tendencia(m.serie, { clave: 'nuevos_usuarios', nombre: 'Usuarios nuevos', clase: 'tendencia--2' }));

    // Plata: arriba el informe (la ganancia) de todos o de un tipo de usuario, y después el detalle
    plataPorPerfil(m);
    actualizarPlata();
    llenar('kpis-plata',
        tarjeta(actual.por_cobrar ?? 0, 'Inspecciones por cobrar', pesos),
        tarjeta(actual.facturado, `Facturado (${n(actual.firmadas)} firmadas)`, pesos, { anterior: anterior.facturado }),
        tarjeta(actual.mecanicos ?? 0, 'Pagado a mecánicos', pesos, { anterior: anterior.mecanicos ?? 0 }),
        tarjeta(actual.compradores, 'Compradores que pagaron', n, { anterior: anterior.compradores }));
    const g = m.ganancias;
    llenar('tarjetas-ganancias',
        tarjeta(g.autocar, 'Para AutoCar', pesos),
        tarjeta(g.facturado, `Facturado (${n(g.inspecciones?.firmada || 0)} firmadas)`, pesos),
        tarjeta(g.mecanicos, 'Pagado a mecánicos', pesos),
        tarjeta(g.retenido, 'Retenido (pedidos en curso)', pesos),
        tarjeta(g.reembolsado, 'Reembolsado (rechazadas o canceladas)', pesos),
        tarjeta(g.creditos?.usados || 0, 'Créditos usados (autos vendidos)', pesos));
    const grafico = reparto(g);
    document.getElementById('reparto-figura').hidden = !grafico;
    if (grafico) llenar('reparto', ...grafico);
    document.getElementById('ganancias').textContent = g.aclaracion;

    // Inspecciones del período: si el servicio anda (tiempos, quién firma), no solo cuánto se vende
    const ins = m.inspecciones;
    if (ins) {
        const firmadas = ins.por_estado.firmada || 0;
        const demora = ins.horas_hasta_firma === null ? '—' : (ins.horas_hasta_firma < 1 ? 'menos de 1 h' : horas(ins.horas_hasta_firma));
        llenar('kpis-inspecciones',
            tarjeta(ins.pedidas, `Pedidas en ${textoPeriodo}`),
            tarjeta(firmadas, `Firmadas (${porcentaje(firmadas, ins.pedidas)} % de las pedidas)`),
            tarjeta(demora, 'De pagar a tener el informe (mediana)'),
            tarjeta(ins.precio_promedio, 'Precio promedio', pesos));
        llenar('barras-inspecciones', ...barras(Object.entries(ins.por_estado).map(([estado, cantidad]) => [ESTADOS_INSPECCION[estado] ?? estado, cantidad]), 'No se pidieron inspecciones en este período'));
        llenar('barras-conclusiones', ...barras(Object.entries(ins.conclusiones).map(([c, cantidad]) => [CONCLUSIONES[c] ?? c, cantidad]), 'No se firmó ninguna en este período', COLOR_CONCLUSION));
        const filasMecanicos = ins.top_mecanicos.map((x) => el('tr', {}, el('td', {}, x.nombre), el('td', {}, n(x.firmadas)),
            el('td', {}, pesos(x.cobrado))));
        llenar('tabla-mecanicos',
            el('thead', {}, el('tr', {}, ...['Taller', 'Firmadas', 'Cobrado'].map((t) => el('th', {}, t)))),
            el('tbody', {}, ...(filasMecanicos.length ? filasMecanicos : [el('tr', {}, el('td', { colspan: '3' }, 'Ningún mecánico firmó en este período.'))])));
    }

    // Recomendaciones
    llenar('embudo-total',
        pasoEmbudo('Vieron una recomendación', emb.vieron, emb.vieron, 'compradores'),
        pasoEmbudo('Tocaron "Mandale un mecánico"', emb.tocaron, emb.vieron, emb.vieron ? `${porcentaje(emb.tocaron, emb.vieron)} % de los que vieron` : null),
        pasoEmbudo('Pagaron la inspección ("compró")', emb.pagaron, emb.vieron, emb.vieron ? `${conversion} % de los que vieron` : null),
        pasoEmbudo('Ya tienen la inspección firmada', emb.firmadas, emb.vieron, null));
    embudoPorPerfil(m);
    valorPorPerfil(m.por_perfil?.valor);
    document.getElementById('sin-origen').textContent = m.embudo.sin_origen
        ? `Además, ${n(m.embudo.sin_origen)} inspecciones del período se pidieron sin dato de dónde venían (anteriores a que empezáramos a medirlo).`
        : '';

    // Por tipo de usuario: qué recomendación funciona mejor, quién busca y compra, y qué orden eligen
    const pp = m.por_perfil;
    document.querySelector('[data-pestana-boton="metabuscador"]').hidden = !pp;
    if (pp) {
        const mb = pp.metabuscador.total;
        llenar('kpis-metabuscador',
            tarjeta(mb.buscaron, `Buscaron en el metabuscador en ${textoPeriodo}`),
            tarjeta(mb.compraron, `De esos, pagaron una inspección (${porcentaje(mb.compraron, mb.buscaron)} %)`),
            tarjeta(mb.desde_metabuscador, 'La pagaron desde un auto del metabuscador'));
        llenar('buscaron-compraron', ...buscaronYCompraron(pp.metabuscador));
        llenar('grafico-buscaron', tendencia(m.serie, { clave: 'buscaron', nombre: 'Buscaron en el metabuscador', clase: 'tendencia--1' }));
        llenar('tabla-ordenes', ...tablaOrdenes(pp.ordenes));
        llenar('sugerencias-orden', ...sugerenciasOrden(pp.ordenes));
    }

    // Usuarios
    const u = m.usuarios;
    const r = m.recurrentes;
    llenar('tarjetas-usuarios',
        tarjeta(actual.nuevos_usuarios, `Nuevos en ${textoPeriodo}`, n, { anterior: anterior.nuevos_usuarios }),
        tarjeta(u.total, 'Registrados en total'),
        tarjeta(u.con_actividad_30d, 'Con actividad (30 días)'),
        tarjeta(r.recurrentes, `Volvieron a pagar una inspección (${porcentaje(r.recurrentes, r.compradores)} % de ${n(r.compradores)} compradores)`),
        tarjeta(u.bajas, 'Dados de baja'));
    llenar('grafico-usuarios', tendencia(m.serie, { clave: 'nuevos_usuarios', nombre: 'Usuarios nuevos', clase: 'tendencia--2' }));
    llenar('barras-usos', ...barras(Object.entries(m.compradores_por_uso || {})));
    llenar('barras-roles', ...barras(Object.entries(u.por_rol).map(([rol, cantidad]) => [formato.rol(rol), cantidad])));

    // Publicaciones, moderación y chat (la foto de hoy)
    const p = m.publicaciones;
    llenar('tarjetas-publicaciones',
        tarjeta(p.total, 'Publicaciones'),
        tarjeta(p.nuevas_30d, 'Nuevas (30 días)'),
        tarjeta(p.precio_promedio, 'Precio promedio (en venta)', pesos),
        tarjeta(p.valor_en_venta, 'Valor en venta', pesos),
        tarjeta(p.valor_vendido, 'Valor vendido', pesos));
    llenar('barras-estados', ...barras(Object.entries(p.por_estado).map(([estado, cantidad]) => [formato.estado(estado), cantidad])));
    llenar('barras-marcas', ...barras(p.top_marcas.map((x) => [x.marca, x.cantidad]), 'Todavía no hay publicaciones'));
    const mod = m.moderacion;
    const pendientes = tarjeta(mod.pendientes, 'Esperando revisión');
    pendientes.classList.toggle('resumen-admin__alerta', mod.pendientes > 0);
    llenar('tarjetas-moderacion', pendientes,
        tarjeta(horas(mod.espera_maxima_h), 'Espera de la más antigua'),
        tarjeta(mod.rechazadas, 'Rechazadas'));
    const c = m.chat;
    llenar('tarjetas-chat',
        tarjeta(c.conversaciones, 'Conversaciones'),
        tarjeta(c.conversaciones_30d, 'Nuevas (30 días)'),
        tarjeta(c.mensajes_30d, 'Mensajes (30 días)'));

    document.getElementById('generado').textContent = `Datos al ${new Date(m.generado).toLocaleString('es-AR')}.`;
}

let cargaActual = 0;
async function cargar() {
    const solicitud = ++cargaActual;
    const estado = document.getElementById('estado');
    const contenido = document.getElementById('metricas');
    estado.replaceChildren(vistas.cargando());
    contenido.classList.add('metricas--cargando');
    try {
        const metricas = await admin.metricas(dias);
        if (solicitud !== cargaActual) return;
        ultimas = metricas;
        mostrar(ultimas);
        estado.replaceChildren();
        contenido.hidden = false;
        mostrarPestana();
    } catch (error) {
        if (solicitud !== cargaActual) return;
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        estado.replaceChildren(error.status === 403
            ? vistas.aviso('No tenés permiso para ver las estadísticas.')
            : vistas.avisoDeError(error));
    } finally {
        if (solicitud === cargaActual) contenido.classList.remove('metricas--cargando');
    }
}

if (sesion.requerirPermiso('metricas.ver')) {
    if (abreAfiliaciones) document.getElementById('afiliaciones').open = true;
    prepararFuentes();
    armarControles();
    cargar();
    cargarAfiliacion(); // no depende del período: se pide una vez
}
