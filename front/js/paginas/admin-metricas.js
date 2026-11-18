// Estadísticas de la app (permiso metricas.ver): GET /api/admin/metricas?dias=7|30|90, todo sacado de la base.
// Ordenadas en pestañas (Resumen, Plata, Recomendaciones, Usuarios, Publicaciones) con un período que vale para
// todas. "Compró" = pagó la inspección. La pestaña y el período quedan en la URL (#plata, ?dias=90).
import * as admin from '../api/admin.js';
import * as formato from '../servicios/formato.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';

const { el } = vistas;
const numero = new Intl.NumberFormat('es-AR');
const n = (valor) => numero.format(valor);
const pesos = (v) => formato.precio(v);
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

const PESTANAS = [['resumen', 'Resumen'], ['plata', 'Plata'], ['embudo', 'Recomendaciones'], ['usuarios', 'Usuarios'], ['plataforma', 'Publicaciones']];
const PERIODOS = { 7: '7 días', 30: '30 días', 90: '3 meses' };
const ORIGENES = {
    para_vos: 'Autos "para vos" (según su perfil)',
    destacado: 'Destacados del metabuscador',
    metabuscador: 'Resto de la lista del metabuscador',
    publicacion: 'Publicaciones de AutoCar',
};

const params = new URLSearchParams(window.location.search);
let dias = Number(params.get('dias')) in PERIODOS ? Number(params.get('dias')) : 30;
let pestana = PESTANAS.some(([clave]) => `#${clave}` === window.location.hash) ? window.location.hash.slice(1) : 'resumen';

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

// Barras horizontales de una sola serie: el largo es la cantidad y el número va escrito al lado
// (cada barra es un <li> con su texto, así se lee igual sin ver el gráfico)
function barras(pares, vacio = 'Todavía no hay datos') {
    if (!pares.length) return [el('li', { class: 'barras__vacio' }, vacio)];
    const maximo = Math.max(...pares.map(([, v]) => v), 1);
    return pares.map(([nombre, valor], i) => {
        const barra = el('span', { class: 'barras__barra', 'aria-hidden': 'true' });
        barra.style.setProperty('--largo', `${(valor / maximo) * 100}%`);
        barra.style.setProperty('--n', String(i));
        return el('li', { class: 'barras__fila', title: `${nombre}: ${n(valor)}` },
            el('span', { class: 'barras__nombre' }, nombre), barra, el('span', { class: 'barras__valor' }, n(valor)));
    });
}

// "2026-11-18" → "18/11" (o "sem. 16/11" si la serie va por semana)
function fechaCorta(fecha, unidad) {
    const [, mes, dia] = fecha.split('-');
    return `${unidad === 'semana' ? 'sem. ' : ''}${dia}/${mes}`;
}

// Columnas en el tiempo: una por día o semana y, dentro, una barra por serie. Arriba el máximo, abajo algunas
// fechas. Cada columna tiene el detalle en texto (title y para lectores de pantalla).
// series: [{clave, nombre, clase, formatear}]
function columnas(serie, series) {
    const { puntos, unidad } = serie;
    const total = puntos.reduce((s, p) => s + series.reduce((t, x) => t + Math.abs(p[x.clave]), 0), 0);
    if (!total) return [el('p', { class: 'barras__vacio' }, 'No hubo movimiento en este período.')];
    const maximos = series.map((x) => Math.max(...puntos.map((p) => p[x.clave]), 1));
    // Las series en pesos comparten escala entre sí, y las cantidades entre sí
    const escala = (x, i) => Math.max(...series.filter((y) => (y.formatear === pesos) === (x.formatear === pesos))
        .map((y) => maximos[series.indexOf(y)]), maximos[i]);
    const etiquetaCada = Math.max(1, Math.ceil(puntos.length / 7));
    const grupos = puntos.map((p, i) => {
        const detalle = `${fechaCorta(p.fecha, unidad)}: ${series.map((x) => `${x.nombre} ${(x.formatear || n)(p[x.clave])}`).join(', ')}`;
        return el('li', { class: 'columnas__grupo', title: detalle },
            el('span', { class: 'columnas__barras', 'aria-hidden': 'true' }, ...series.map((x, j) => {
                const barra = el('span', { class: `columnas__barra ${x.clase}` });
                barra.style.setProperty('--alto', `${(p[x.clave] / escala(x, j)) * 100}%`);
                barra.style.setProperty('--n', String(i));
                return barra;
            })),
            el('span', { class: 'columnas__fecha', 'aria-hidden': 'true' }, i % etiquetaCada === 0 || i === puntos.length - 1 ? fechaCorta(p.fecha, unidad) : ''),
            el('span', { class: 'solo-lector' }, detalle));
    });
    const leyenda = el('ul', { class: 'columnas__leyenda', role: 'list' }, ...series.map((x, i) =>
        el('li', {}, el('span', { class: `columnas__muestra ${x.clase}`, 'aria-hidden': 'true' }),
            `${x.nombre} (máx. ${(x.formatear || n)(maximos[i])} por ${unidad === 'semana' ? 'semana' : 'día'})`)));
    return [leyenda, el('ol', { class: 'columnas', role: 'list' }, ...grupos)];
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

function tablaEmbudo(origenes) {
    const conversion = (o) => porcentaje(o.pagaron, o.vieron);
    const mejor = Math.max(...origenes.map(conversion));
    const celdas = (fila, etiqueta = 'td') => el('tr', {}, ...fila.map((c) => el(etiqueta, {}, c)));
    return [
        el('thead', {}, celdas(['Recomendación', 'Vieron', 'Tocaron "Mandale un mecánico"', 'Pagaron la inspección', 'Conversión (pagaron / vieron)', 'Con la inspección firmada'], 'th')),
        el('tbody', {}, ...origenes.map((o) => {
            const tr = celdas([ORIGENES[o.origen] ?? o.origen, n(o.vieron), n(o.tocaron), n(o.pagaron),
                o.vieron ? `${conversion(o)} %` : '—', n(o.firmadas)]);
            if (mejor > 0 && conversion(o) === mejor) tr.classList.add('tabla-embudo__mejor');
            return tr;
        })),
    ];
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
        tarjeta(actual.ganancia, `Ganancia de AutoCar en ${textoPeriodo}`, pesos, { anterior: anterior.ganancia }),
        tarjeta(actual.nuevos_usuarios, `Usuarios nuevos en ${textoPeriodo}`, n, { anterior: anterior.nuevos_usuarios }),
        tarjeta(actual.reclamos, `Pagado por reclamos en ${textoPeriodo}`, pesos, { anterior: anterior.reclamos, menosEsMejor: true }));
    llenar('grafico-actividad', ...columnas(m.serie, [
        { clave: 'pagaron', nombre: 'Pagaron la inspección', clase: 'serie--1' },
        { clave: 'nuevos_usuarios', nombre: 'Usuarios nuevos', clase: 'serie--2' },
    ]));

    // Plata
    llenar('kpis-plata',
        tarjeta(actual.ganancia, 'Ganancia de AutoCar', pesos, { anterior: anterior.ganancia }),
        tarjeta(actual.facturado, `Facturado (${n(actual.firmadas)} firmadas)`, pesos, { anterior: anterior.facturado }),
        tarjeta(actual.reclamos, 'Pagado por reclamos (fondo, neto de franquicias)', pesos, { anterior: anterior.reclamos, menosEsMejor: true }),
        tarjeta(actual.compradores, 'Compradores que pagaron', n, { anterior: anterior.compradores }));
    llenar('grafico-plata', ...columnas(m.serie, [
        { clave: 'ganancia', nombre: 'Ganancia de AutoCar', clase: 'serie--2', formatear: pesos },
        { clave: 'reclamos', nombre: 'Pagado por reclamos', clase: 'serie--perdida', formatear: pesos },
    ]));
    const g = m.ganancias;
    llenar('tarjetas-ganancias',
        tarjeta(g.autocar, 'Ganancia de AutoCar', pesos),
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

    // Recomendaciones
    llenar('embudo-total',
        pasoEmbudo('Vieron una recomendación', emb.vieron, emb.vieron, 'compradores'),
        pasoEmbudo('Tocaron "Mandale un mecánico"', emb.tocaron, emb.vieron, emb.vieron ? `${porcentaje(emb.tocaron, emb.vieron)} % de los que vieron` : null),
        pasoEmbudo('Pagaron la inspección ("compró")', emb.pagaron, emb.vieron, emb.vieron ? `${conversion} % de los que vieron` : null),
        pasoEmbudo('Ya tienen la inspección firmada', emb.firmadas, emb.vieron, null));
    llenar('tabla-embudo', ...tablaEmbudo(m.embudo.origenes));
    document.getElementById('sin-origen').textContent = m.embudo.sin_origen
        ? `Además, ${n(m.embudo.sin_origen)} inspecciones del período se pidieron sin dato de dónde venían (anteriores a que empezáramos a medirlo).`
        : '';

    // Usuarios
    const u = m.usuarios;
    const r = m.recurrentes;
    llenar('tarjetas-usuarios',
        tarjeta(actual.nuevos_usuarios, `Nuevos en ${textoPeriodo}`, n, { anterior: anterior.nuevos_usuarios }),
        tarjeta(u.total, 'Registrados en total'),
        tarjeta(u.con_actividad_30d, 'Con actividad (30 días)'),
        tarjeta(r.recurrentes, `Volvieron a pagar una inspección (${porcentaje(r.recurrentes, r.compradores)} % de ${n(r.compradores)} compradores)`),
        tarjeta(u.bajas, 'Dados de baja'));
    llenar('grafico-usuarios', ...columnas(m.serie, [{ clave: 'nuevos_usuarios', nombre: 'Usuarios nuevos', clase: 'serie--2' }]));
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
        mostrar(await admin.metricas(dias));
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
