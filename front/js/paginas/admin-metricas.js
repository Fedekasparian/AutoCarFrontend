// Estadísticas de la app (permiso metricas.ver): GET /api/admin/metricas?dias=7|30|90, todo sacado de la base.
// Ordenadas en pestañas (Resumen, Plata, Inspecciones, Recomendaciones, Metabuscador, Usuarios, Publicaciones) con un período
// que vale para todas. "Compró" = pagó la inspección. La pestaña y el período quedan en la URL (#plata, ?dias=90).
// Plata, Recomendaciones y Metabuscador también separan por tipo de usuario ("¿Para qué buscás el auto?", por_perfil).
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
const ORDENES = { recomendado: 'Recomendado', precio: 'Menor precio', km: 'Menos km', nuevos: 'Más nuevos' };
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
let pestana = PESTANAS.some(([clave]) => `#${clave}` === window.location.hash) ? window.location.hash.slice(1) : 'resumen';
// Plata: "todos" o un tipo de usuario (personal, familia, trabajo, aplicacion, sin_perfil). Se mantiene al cambiar el período.
let segmento = 'todos';
let segmentoEmbudo = 'todos'; // lo mismo en la tabla de Recomendaciones
let ultimas = null; // las últimas métricas, para cambiar de segmento sin volver a pedirlas

// ---------- Piezas ----------

// Cuánto cambió contra el período anterior. Si "menos es mejor" (reclamos), bajar se pinta como bueno.
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
// clases: {nombre: 'barras__barra--ok'} para pintar una fila con el color de su estado; formatear: pesos para montos
function barras(pares, vacio = 'Todavía no hay datos', clases = {}, formatear = n) {
    const filas = pares.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!filas.length) return [el('li', { class: 'barras__vacio' }, vacio)];
    const maximo = Math.max(...filas.map(([, v]) => v), 1);
    const total = filas.reduce((s, [, v]) => s + v, 0);
    return filas.map(([nombre, valor], i) => {
        const barra = el('span', { class: `barras__barra ${clases[nombre] ?? ''}`, 'aria-hidden': 'true' });
        barra.style.setProperty('--largo', `${(valor / maximo) * 100}%`);
        barra.style.setProperty('--n', String(i));
        return el('li', { class: 'barras__fila', title: `${nombre}: ${formatear(valor)} (${porcentaje(valor, total)} %)` },
            el('span', { class: 'barras__nombre' }, nombre), barra,
            el('span', { class: 'barras__valor' }, formatear(valor), el('span', { class: 'barras__parte' }, `${porcentaje(valor, total)} %`)));
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
// opciones: {clave, nombre, formatear, clase ('tendencia--1' | 'tendencia--2' | 'tendencia--perdida')}
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

function llenar(id, ...hijos) {
    document.getElementById(id).replaceChildren(...hijos);
}

function horas(h) {
    if (h === null) return '—';
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? '1 día' : `${d} días`;
}

// Lo facturado en una barra apilada de tres partes (mecánicos, AutoCar y fondo), con leyenda y montos
function reparto(g) {
    const partes = [
        ['mecanicos', 'Mecánicos', g.mecanicos],
        ['autocar', 'AutoCar', g.autocar],
        ['fondo', 'Fondo de garantía', g.fondo.acumulado],
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
function embudoPorPerfil(m) {
    const pp = m.por_perfil;
    document.getElementById('embudo-perfil').hidden = !pp;
    if (!pp) {
        llenar('tabla-embudo', ...tablaEmbudo(m.embudo.origenes));
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
    llenar('tabla-embudo', ...tablaEmbudo(origenes));
}

// El informe de plata del período, como un estado de resultados chico: ganancia (la comisión completa de AutoCar,
// con la parte del fondo), pérdida (lo que costaron los reclamos que procedieron, neto de franquicias) y la neta.
// Si el back todavía no manda estos números, el informe queda oculto.
// quien: el tipo de usuario si se segmentó ("Para la familia"); sin él es el de todos y compara con el período anterior.
function informePlata(actual, anterior, textoPeriodo, quien = null) {
    const caja = document.getElementById('informe-plata');
    caja.hidden = actual.neta === undefined;
    if (caja.hidden) return;
    const { ingresos, perdida, neta } = actual;
    const cuando = `los últimos ${textoPeriodo}`;
    document.getElementById('t-informe').textContent = quien
        ? `Informe de ${cuando} · compradores "${quien}"`
        : `Informe de ${cuando}`;
    const conQuien = quien ? ` con los compradores "${quien}"` : '';

    const reclamos = actual.reclamos_procedieron === 1
        ? 'el reclamo que procedió costó'
        : `los ${n(actual.reclamos_procedieron)} reclamos que procedieron costaron`;
    const cuantoCostaron = perdida ? `y ${reclamos} ${pesos(perdida)}` : 'y no hubo reclamos que procedieran';
    const resultado = neta >= 0
        ? `Ganancia neta: ${pesos(neta)}.`
        : `AutoCar perdió ${pesos(-neta)}: los reclamos costaron más que las comisiones.`;
    document.getElementById('informe-frase').textContent =
        `En ${cuando} AutoCar ganó ${pesos(ingresos)} en comisiones${conQuien} ${cuantoCostaron}. ${resultado}`;

    const fila = (nombre, detalle, monto, clase, extra = null) => el('div', { class: `informe-plata__fila ${clase}` },
        el('dt', {}, nombre, detalle ? el('span', { class: 'informe-plata__detalle' }, detalle) : null),
        el('dd', {}, el('span', {}, monto), extra));
    llenar('informe-cuenta',
        fila('Ganancia', 'Comisión de AutoCar de las inspecciones firmadas, con la parte del fondo y menos los créditos usados',
            `+ ${pesos(ingresos)}`, 'informe-plata__fila--ganancia'),
        fila('Pérdida', 'Reclamos que procedieron: devolución + compensación − franquicia del mecánico',
            `− ${pesos(perdida)}`, 'informe-plata__fila--perdida'),
        fila('Ganancia neta', ingresos ? `Margen: ${porcentaje(neta, ingresos)} % de la ganancia` : null,
            `${neta < 0 ? '− ' : ''}${pesos(Math.abs(neta))}`,
            `informe-plata__fila--neta${neta < 0 ? ' informe-plata__fila--negativa' : ''}`,
            variacion(neta, anterior.neta)));
    document.getElementById('informe-notas').textContent =
        `Por cobrar: ${pesos(actual.por_cobrar)} de inspecciones firmadas que todavía están en el plazo de reclamo (se cuentan cuando pasa). `
        + 'La comisión de Mercado Pago no está descontada: el pago es simulado.';
}

// ---------- Por tipo de usuario ("¿Para qué buscás el auto?"; el que no contestó es "Sin perfil") ----------

const celdas = (fila, etiqueta = 'td') => el('tr', {}, ...fila.map((c) => el(etiqueta, {}, c)));

// Plata: los botones Todos / cada tipo de usuario, el informe del segmento elegido y la tabla que los compara
function plataPorPerfil(m, textoPeriodo) {
    const pp = m.por_perfil;
    const caja = document.getElementById('plata-perfil');
    caja.hidden = !pp;
    document.getElementById('plata-perfil-tabla').hidden = !pp;
    if (!pp) {
        informePlata(m.resumen.actual, m.resumen.anterior, textoPeriodo);
        return;
    }
    if (segmento !== 'todos' && !pp.plata.some((f) => f.uso === segmento)) segmento = 'todos';
    const opciones = [['todos', 'Todos'], ...Object.entries(pp.usos)];
    llenar('segmento-plata', ...opciones.map(([clave, texto]) => boton(texto, clave === segmento, () => {
        segmento = clave;
        plataPorPerfil(ultimas, textoPeriodo);
    })));
    const fila = pp.plata.find((f) => f.uso === segmento);
    if (fila) informePlata(fila, {}, textoPeriodo, fila.nombre);
    else informePlata(m.resumen.actual, m.resumen.anterior, textoPeriodo);

    // La tabla: cada tipo de usuario con lo que pagó, lo que ganó AutoCar y qué parte de la ganancia neta es
    const netaTotal = pp.plata.reduce((s, f) => s + Math.max(f.neta, 0), 0);
    const mejor = Math.max(...pp.plata.map((f) => f.neta));
    llenar('tabla-plata-perfil',
        el('thead', {}, celdas(['Tipo de usuario', 'Inspecciones pagadas', 'Compradores', 'Ganancia', 'Pérdida por reclamos', 'Ganancia neta', 'Parte de la neta', 'Por cobrar'], 'th')),
        el('tbody', {}, ...pp.plata.map((f) => {
            const tr = celdas([f.nombre, n(f.pagaron), n(f.compradores), pesos(f.ingresos), f.perdida ? `− ${pesos(f.perdida)}` : '—',
                `${f.neta < 0 ? '− ' : ''}${pesos(Math.abs(f.neta))}`, netaTotal && f.neta > 0 ? `${porcentaje(f.neta, netaTotal)} %` : '—',
                pesos(f.por_cobrar)]);
            if (mejor > 0 && f.neta === mejor) tr.classList.add('tabla-embudo__mejor');
            if (f.uso === segmento) tr.classList.add('tabla-perfil__elegida');
            return tr;
        })));
    llenar('barras-plata-perfil', ...barras(pp.plata.map((f) => [f.nombre, Math.max(f.neta, 0)]), 'Todavía no hay ganancia neta en este período', {}, pesos));
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
    const items = ordenes.filter((f) => f.preferido && f.preferido !== 'recomendado' && f.uso !== 'sin_perfil').map((f) =>
        el('li', {}, el('strong', {}, `${f.nombre}: `),
            `la mayoría ordena por "${ORDENES[f.preferido]}". Probá subir cuánto pesa ${PESO_DEL_ORDEN[f.preferido]} para ese perfil en `,
            el('a', { href: 'admin-parametros.html' }, 'Parámetros'), '.'));
    return items.length
        ? items
        : [el('li', { class: 'barras__vacio' }, 'Ningún perfil prefiere otro orden que "Recomendado": la fórmula de "Recomendados" parece acertar (o todavía no hay datos).')];
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
        actual.neta === undefined
            ? tarjeta(actual.ganancia, `Ganancia de AutoCar en ${textoPeriodo}`, pesos, { anterior: anterior.ganancia })
            : tarjeta(actual.neta, `Ganancia neta en ${textoPeriodo}`, pesos, { anterior: anterior.neta }),
        tarjeta(actual.nuevos_usuarios, `Usuarios nuevos en ${textoPeriodo}`, n, { anterior: anterior.nuevos_usuarios }),
        tarjeta(actual.reclamos, `Pagado por reclamos en ${textoPeriodo}`, pesos, { anterior: anterior.reclamos, menosEsMejor: true }));
    llenar('grafico-pagaron', tendencia(m.serie, { clave: 'pagaron', nombre: 'Inspecciones pagadas', clase: 'tendencia--1' }));
    llenar('grafico-nuevos', tendencia(m.serie, { clave: 'nuevos_usuarios', nombre: 'Usuarios nuevos', clase: 'tendencia--2' }));

    // Plata: arriba el informe (ganancia − pérdida = neta) de todos o de un tipo de usuario, y después el detalle
    plataPorPerfil(m, textoPeriodo);
    const conInforme = actual.neta !== undefined;
    llenar('kpis-plata',
        conInforme
            ? tarjeta(actual.por_cobrar, 'Por cobrar (en el plazo de reclamo)', pesos)
            : tarjeta(actual.ganancia, 'Ganancia de AutoCar', pesos, { anterior: anterior.ganancia }),
        tarjeta(actual.facturado, `Facturado (${n(actual.firmadas)} firmadas)`, pesos, { anterior: anterior.facturado }),
        tarjeta(actual.mecanicos ?? 0, 'Pagado a mecánicos', pesos, { anterior: anterior.mecanicos ?? 0 }),
        conInforme
            ? tarjeta(actual.reclamos_procedieron, 'Reclamos que procedieron', n, { anterior: anterior.reclamos_procedieron, menosEsMejor: true })
            : tarjeta(actual.reclamos, 'Pagado por reclamos (fondo, neto de franquicias)', pesos, { anterior: anterior.reclamos, menosEsMejor: true }),
        tarjeta(actual.compradores, 'Compradores que pagaron', n, { anterior: anterior.compradores }));
    llenar('grafico-ganancia', tendencia(m.serie, conInforme
        ? { clave: 'ingresos', nombre: 'Ganancia (comisiones)', formatear: pesos, clase: 'tendencia--2' }
        : { clave: 'ganancia', nombre: 'Ganancia de AutoCar', formatear: pesos, clase: 'tendencia--2' }));
    llenar('grafico-reclamos', tendencia(m.serie, { clave: 'reclamos', nombre: 'Pérdida por reclamos', formatear: pesos, clase: 'tendencia--perdida' }));
    const g = m.ganancias;
    llenar('tarjetas-ganancias',
        tarjeta(g.autocar, 'Para AutoCar (sin la parte del fondo)', pesos),
        tarjeta(g.facturado, `Facturado (${n(g.inspecciones?.firmada || 0)} firmadas)`, pesos),
        tarjeta(g.mecanicos, 'Pagado a mecánicos', pesos),
        tarjeta(g.fondo.disponible, `Fondo de garantía (usado ${pesos(g.fondo.usado)})`, pesos),
        tarjeta(g.retenido, 'Retenido (pedidos en curso)', pesos),
        tarjeta(g.reembolsado, 'Reembolsado (rechazadas o canceladas)', pesos),
        tarjeta(g.creditos?.usados || 0, 'Créditos usados (autos vendidos)', pesos));
    const grafico = reparto(g);
    document.getElementById('reparto-figura').hidden = !grafico;
    if (grafico) llenar('reparto', ...grafico);
    document.getElementById('ganancias').textContent = g.aclaracion;

    // Inspecciones del período: si el servicio anda (tiempos, reclamos, quién firma), no solo cuánto se vende
    const ins = m.inspecciones;
    if (ins) {
        const firmadas = ins.por_estado.firmada || 0;
        const rec = ins.reclamos;
        const sinResolver = tarjeta(rec.sin_resolver, 'Reclamos sin resolver');
        sinResolver.classList.toggle('resumen-admin__alerta', rec.sin_resolver > 0);
        const demora = ins.horas_hasta_firma === null ? '—' : (ins.horas_hasta_firma < 1 ? 'menos de 1 h' : horas(ins.horas_hasta_firma));
        llenar('kpis-inspecciones',
            tarjeta(ins.pedidas, `Pedidas en ${textoPeriodo}`),
            tarjeta(firmadas, `Firmadas (${porcentaje(firmadas, ins.pedidas)} % de las pedidas)`),
            tarjeta(demora, 'De pagar a tener el informe (mediana)'),
            tarjeta(ins.precio_promedio, 'Precio promedio', pesos),
            tarjeta(firmadas ? `${porcentaje(rec.abiertos_en_periodo, firmadas)} %` : '—', `Con reclamo (${n(rec.abiertos_en_periodo)} reclamos, ${n(rec.proceden)} procedieron)`),
            sinResolver);
        llenar('barras-inspecciones', ...barras(Object.entries(ins.por_estado).map(([estado, cantidad]) => [ESTADOS_INSPECCION[estado] ?? estado, cantidad]), 'No se pidieron inspecciones en este período'));
        llenar('barras-conclusiones', ...barras(Object.entries(ins.conclusiones).map(([c, cantidad]) => [CONCLUSIONES[c] ?? c, cantidad]), 'No se firmó ninguna en este período', COLOR_CONCLUSION));
        const filasMecanicos = ins.top_mecanicos.map((x) => el('tr', {}, el('td', {}, x.nombre), el('td', {}, n(x.firmadas)),
            el('td', {}, x.reclamos ? n(x.reclamos) : '—'), el('td', {}, pesos(x.cobrado))));
        llenar('tabla-mecanicos',
            el('thead', {}, el('tr', {}, ...['Taller', 'Firmadas', 'Reclamos que procedieron', 'Cobrado'].map((t) => el('th', {}, t)))),
            el('tbody', {}, ...(filasMecanicos.length ? filasMecanicos : [el('tr', {}, el('td', { colspan: '4' }, 'Ningún mecánico firmó en este período.'))])));
    }

    // Recomendaciones
    llenar('embudo-total',
        pasoEmbudo('Vieron una recomendación', emb.vieron, emb.vieron, 'compradores'),
        pasoEmbudo('Tocaron "Mandale un mecánico"', emb.tocaron, emb.vieron, emb.vieron ? `${porcentaje(emb.tocaron, emb.vieron)} % de los que vieron` : null),
        pasoEmbudo('Pagaron la inspección ("compró")', emb.pagaron, emb.vieron, emb.vieron ? `${conversion} % de los que vieron` : null),
        pasoEmbudo('Ya tienen la inspección firmada', emb.firmadas, emb.vieron, null));
    embudoPorPerfil(m);
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

async function cargar() {
    const estado = document.getElementById('estado');
    const contenido = document.getElementById('metricas');
    estado.replaceChildren(vistas.cargando());
    contenido.classList.add('metricas--cargando');
    try {
        ultimas = await admin.metricas(dias);
        mostrar(ultimas);
        estado.replaceChildren();
        contenido.hidden = false;
        mostrarPestana();
    } catch (error) {
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        estado.replaceChildren(error.status === 403
            ? vistas.aviso('No tenés permiso para ver las estadísticas.')
            : vistas.avisoDeError(error));
    } finally {
        contenido.classList.remove('metricas--cargando');
    }
}

if (sesion.requerirPermiso('metricas.ver')) {
    armarControles();
    cargar();
}
