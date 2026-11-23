// Novedades de una búsqueda guardada (meta-busqueda-novedades.html?id=N) con GET /api/meta-busquedas/{id}/novedades:
// un gráfico de barras con los autos nuevos, las bajas de precio y los retirados de cada día (últimos 30), y cuáles
// cambiaron en la última corrida, en tres pestañas. Se llega desde la franja de novedades de los resultados.
import * as api from '../api/metabusqueda.js';
import * as formato from '../servicios/formato.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { criterios } from '../servicios/metabusqueda.js';
import { ruta } from '../servicios/rutas.js';
import { usarCotizacion, fila, dolares } from '../servicios/autos-externos.js';

const { el } = vistas;
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const $ = (idElemento) => document.getElementById(idElemento);

const TIPOS = [['nuevo', 'nuevos'], ['bajo', 'bajaron de precio'], ['retirado', 'ya no están']];
const PESTANAS = [['bajo', 'Bajaron'], ['nuevo', 'Nuevos'], ['retirado', 'Ya no están']];
let pestana = null;
let corrida = null;

const diaCorto = (fecha) => { const [, m, d] = fecha.split('-'); return `${Number(d)}/${Number(m)}`; };

// Una columna por día, apilada (nuevos + bajaron + ya no están = lo que cambió ese día), con el alto relativo al día
// con más novedades. Cada columna dice sus números para el lector de pantalla y al pasar el mouse.
function mostrarDias(porDia) {
    const total = (d) => d.nuevo + d.bajo + d.retirado;
    const maximo = Math.max(...porDia.map(total), 0);
    $('dias-vacio').hidden = maximo > 0;
    $('dias').hidden = maximo === 0;
    if (!maximo) return;
    $('dias').replaceChildren(...porDia.map((d, i) => {
        const detalle = TIPOS.map(([clave, texto]) => `${d[clave]} ${texto}`).join(', ');
        const columna = el('span', { class: 'dias__columna', 'aria-hidden': 'true' },
            ...TIPOS.map(([clave]) => {
                const tramo = el('span', { class: `dias__tramo dias__tramo--${clave}` });
                tramo.style.setProperty('--alto', `${(d[clave] / maximo) * 100}%`);
                return tramo;
            }));
        // La fecha abajo cada 5 días y la de hoy, para no amontonar
        const conFecha = i % 5 === 0 || i === porDia.length - 1;
        const li = el('li', { class: `dias__dia${total(d) ? '' : ' dias__dia--vacio'}`, title: `${diaCorto(d.fecha)}: ${detalle}` },
            columna,
            el('span', { class: `dias__fecha${conFecha ? '' : ' dias__fecha--oculta'}`, 'aria-hidden': 'true' }, diaCorto(d.fecha)),
            el('span', { class: 'solo-lector' }, `${diaCorto(d.fecha)}: ${detalle}`));
        li.style.setProperty('--n', String(i));
        return li;
    }));
}

// Cuánto salía antes y cuánto bajó, con una barrita del porcentaje
function baja(c) {
    if (!c.precio_anterior || !c.precio_actual) return null;
    const pct = Math.round((1 - c.precio_actual / c.precio_anterior) * 100);
    const antes = c.auto.moneda === 'USD' ? `US$ ${dolares.format(c.precio_anterior)}` : formato.precio(c.precio_anterior);
    const barra = el('span', { class: 'baja__barra', 'aria-hidden': 'true' });
    barra.style.setProperty('--pct', `${Math.min(pct * 4, 100)}%`); // 25 % o más llena la barra
    return el('span', { class: 'baja' }, 'Antes ', el('s', {}, antes), barra, el('strong', { class: 'baja__pct' }, `bajó ${pct} %`));
}

const ordenar = {
    // Los que más bajaron primero; los nuevos, del más barato al más caro
    bajo: (a, b) => (a.precio_actual / a.precio_anterior) - (b.precio_actual / b.precio_anterior),
    nuevo: (a, b) => (a.auto.precio ?? Infinity) - (b.auto.precio ?? Infinity),
    retirado: () => 0,
};

function mostrarLista() {
    const cambios = corrida.items.filter((c) => c.tipo === pestana).sort(ordenar[pestana]);
    $('pestanas').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === pestana)));
    $('lista').replaceChildren(...(cambios.length
        ? cambios.map((c, i) => fila(c.auto, {
            i,
            extra: pestana === 'bajo' ? baja(c)
                : el('span', { class: 'resultado__antes' }, pestana === 'nuevo' ? 'Apareció en esta actualización' : 'Ya no está publicado: no se puede inspeccionar'),
            conAcciones: pestana !== 'retirado',
        }))
        : [el('li', { class: 'suave' }, 'No hubo de estos en la última actualización.')]));
    $('lista').classList.add('lista-filas--entra');
}

function mostrarPestanas() {
    const cuenta = { bajo: corrida.bajaron, nuevo: corrida.nuevos, retirado: corrida.retirados };
    pestana = cuenta.bajo ? 'bajo' : cuenta.nuevo ? 'nuevo' : 'bajo';
    $('pestanas').replaceChildren(...PESTANAS.map(([tipo, texto]) => {
        const b = el('button', { class: 'pestana-estado', type: 'button', 'data-tipo': tipo, 'aria-pressed': 'false', 'aria-controls': 'lista' },
            `${texto} (${cuenta[tipo]})`);
        b.addEventListener('click', () => { pestana = tipo; mostrarLista(); });
        return b;
    }));
    mostrarLista();
}

function mostrar(r) {
    usarCotizacion(r.cotizacion_dolar);
    $('titulo').textContent = `Novedades: ${r.busqueda.marca} ${r.busqueda.modelo}`;
    document.title = `Novedades ${r.busqueda.marca} ${r.busqueda.modelo} - AutoCar`;
    $('volver').href = ruta(`meta-busqueda-resultados.html?id=${id}`);
    // Los criterios solo si dicen algo más que la marca y el modelo (que ya están en el título)
    const filtrosBusqueda = criterios(r.busqueda);
    const partes = [filtrosBusqueda !== `${r.busqueda.marca} ${r.busqueda.modelo}` ? filtrosBusqueda : null,
        r.sin_ver ? `${r.sin_ver} ${r.sin_ver === 1 ? 'novedad sin ver' : 'novedades sin ver'} desde tu última visita` : null].filter(Boolean);
    $('subtitulo').textContent = partes.join(' · ');
    $('subtitulo').hidden = !partes.length;
    mostrarDias(r.por_dia);

    corrida = r.corrida;
    const fechas = (corrida.actualizado || []).map((a) => a.fecha).filter(Boolean).sort();
    if (!corrida.disponible) {
        $('corrida').textContent = 'Las novedades aparecen a partir de la segunda actualización diaria: todavía no hay con qué comparar.';
        $('pestanas').hidden = true;
        $('lista').replaceChildren();
    } else {
        const cuando = fechas.length
            ? new Date(fechas.at(-1)).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
            : null;
        $('corrida').textContent = cuando ? `Comparada con la actualización anterior, del ${cuando} h.` : 'Comparada con la actualización anterior.';
        mostrarPestanas();
    }
    $('novedades').hidden = false;
    $('estado').replaceChildren();
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
        mostrar(await api.novedades(id));
        api.marcarVistos(id).catch(() => {}); // ya las vio
    } catch (error) {
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        $('estado').replaceChildren(error.status === 404 ? noEncontrada() : vistas.avisoDeError(error));
    }
}

if (sesion.requerirLogin()) cargar();
