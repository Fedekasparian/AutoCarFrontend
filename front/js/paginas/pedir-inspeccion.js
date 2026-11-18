// Mandale un mecánico: el comprador pega el link del auto (o llega con ?url=... desde un aviso), elige un
// mecánico del ranking, ve el desglose del precio y confirma. POST /api/inspecciones; el pago es simulado.
// Si llega con ?url=..., el link queda fijo (solo lectura): es el del auto que estaba mirando.
import * as api from '../api/inspecciones.js';
import * as parametros from '../api/parametros.js';
import * as formato from '../servicios/formato.js';
import * as formularios from '../servicios/formularios.js';
import * as insp from '../servicios/inspecciones.js';
import * as marcas from '../servicios/marcas.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { bloqueAlcance, filasDatos } from '../servicios/informe.js';
import { ruta } from '../servicios/rutas.js';
import * as eventos from '../api/eventos.js';

const { el } = vistas;
const params = new URLSearchParams(window.location.search);
const form = document.getElementById('pedido');
const campoUrl = form.elements.url;
const ayudaUrl = document.getElementById('url-ayuda');
const lista = document.getElementById('mecanicos');
const errorMecanico = document.getElementById('mecanico_id-error');
const estadoMecanicos = document.getElementById('estado-mecanicos');
const filtro = document.getElementById('filtro-localidad');
const AYUDA_URL = ayudaUrl.textContent;

let mecanicos = [];
let credito = 0; // créditos del comprador (un auto anterior se vendió): se descuentan solos al pedir

// ---------- El auto ----------

// Solo se aceptan avisos de los sitios conocidos (el back también lo controla)
const SOLO_SITIOS_CONOCIDOS = 'Por ahora solo inspeccionamos autos publicados en MercadoLibre, Kavak, Autocosmos o AutoCar.';
function describirUrl() {
    if (campoUrl.readOnly) return; // fijo: la ayuda ya dice de qué auto es
    const fuente = insp.fuenteDeUrl(campoUrl.value, window.location.hostname);
    ayudaUrl.textContent = fuente && fuente !== 'otro' ? `Aviso de ${insp.fuente(fuente)}.` : AYUDA_URL;
    campoUrl.setCustomValidity(fuente === 'otro' ? SOLO_SITIOS_CONOCIDOS : '');
    if (fuente === 'otro') window.Validacion.mostrar(campoUrl, SOLO_SITIOS_CONOCIDOS);
    else window.Validacion.limpiar(campoUrl);
}

// Datos que llegan en la URL desde el botón "Mandale un mecánico": son los del aviso y quedan fijos (solo
// lectura). El comprador solo completa los que el aviso no trae, salvo el precio: ese nunca lo escribe él
// (si el aviso no lo muestra, el informe va sin precio).
function precargar() {
    const mapa = { url: 'url', titulo: 'titulo', anio: 'anio', km: 'kilometraje', precio: 'precio_publicado', localidad: 'localidad' };
    let faltan = false;
    Object.entries(mapa).forEach(([param, campo]) => {
        const valor = params.get(param);
        if (campo === 'url') {
            if (valor) form.elements.url.value = valor;
            return;
        }
        if (valor) {
            form.elements[campo].value = valor;
            form.elements[campo].readOnly = true;
        } else if (campo === 'precio_publicado') {
            form.elements[campo].readOnly = true;
            form.elements[campo].placeholder = 'El aviso no lo muestra';
        } else {
            faltan = true;
        }
    });
    // Abierto solo si falta algo para completar
    document.getElementById('datos-auto').open = faltan;
    if (params.get('url')) {
        campoUrl.readOnly = true;
        const fuente = insp.fuenteDeUrl(campoUrl.value, window.location.hostname);
        ayudaUrl.textContent = fuente && fuente !== 'otro'
            ? `Es el aviso de ${insp.fuente(fuente)} que estabas mirando.`
            : 'Es el aviso que estabas mirando.';
    }
    describirUrl();
}

campoUrl.addEventListener('input', describirUrl);

// ---------- El mecánico ----------

// Marca y modelo del auto: si llegaron en el link (aviso del metabuscador) son esos y no se piden;
// si no, los que eligió en la lista
const marcaDelAviso = params.get('marca') && params.get('modelo')
    ? { marca: params.get('marca'), modelo: params.get('modelo') }
    : null;
function elAuto() {
    return marcaDelAviso ?? { marca: form.elements.marca.value, modelo: form.elements.modelo.value };
}

const ordenMecanicos = document.getElementById('orden-mecanicos');

// La especialidad en este auto (la calcula el back, cuenta los reclamos que procedieron):
// verde si le fue bien con ese modelo, gris si con otros de la marca, naranja si le fue mal
function experiencia(m) {
    const e = m.especialidad;
    if (!e) return null;
    const { marca, modelo } = elAuto();
    const cuales = e.en === 'modelo' ? `${marca} ${modelo}` : `${marca} de otros modelos`;
    const reclamos = e.reclamos === 0 ? 'sin reclamos'
        : `${e.reclamos} con reclamo que procedió`;
    const tono = !e.buena ? 'etiqueta--caro' : e.en === 'modelo' ? 'etiqueta--buen_precio' : '';
    return el('span', { class: `etiqueta ${tono}`.trim() }, `Revisó ${e.revisados} ${cuales} · ${reclamos}`);
}

function opcionMecanico(m) {
    const idOpcion = `mecanico-${m.id}`;
    const radio = el('input', { type: 'radio', name: 'mecanico_id', id: idOpcion, value: m.id });
    radio.addEventListener('change', mostrarDesglose);
    const yaReviso = experiencia(m);
    return el('label', { for: idOpcion },
        radio,
        el('span', { class: 'fila__cuerpo' },
            el('span', { class: 'fila__titulo' }, m.taller), el('br'),
            el('span', { class: 'fila__meta' }, `${m.mecanico} · ${m.direccion}, ${m.localidad}`), el('br'),
            el('span', { class: 'fila__meta' }, insp.puntaje(m)),
            yaReviso ? el('br') : null, yaReviso),
        el('strong', {}, formato.precio(m.precio_inspeccion)));
}

async function cargarMecanicos() {
    mecanicoPedido ??= elegido()?.id ?? null; // al reordenar, sigue marcado el que ya había elegido
    estadoMecanicos.replaceChildren(vistas.cargando());
    lista.replaceChildren(el('legend', { class: 'solo-lector' }, 'Elegí un mecánico'));
    document.getElementById('resumen').hidden = true;
    try {
        const { marca, modelo } = elAuto();
        // "Ordenar por" solo tiene sentido si se sabe qué auto es
        ordenMecanicos.hidden = !marca;
        const orden = form.elements.orden_mecanicos.value;
        const r = await api.mecanicos(filtro.value, marca, modelo, marca ? orden : '');
        mecanicos = r.items;
        if (filtro.options.length === 1) {
            filtro.append(...r.localidades.map((l) => el('option', { value: l }, l)));
        }
        lista.append(...mecanicos.map(opcionMecanico));
        marcarElegido();
        estadoMecanicos.replaceChildren(mecanicos.length
            ? ''
            : vistas.aviso('No hay mecánicos en esa localidad.', 'Probá con "Todas".'));
    } catch (error) {
        estadoMecanicos.replaceChildren(vistas.avisoDeError(error));
    }
}

filtro.addEventListener('change', cargarMecanicos);
// Si cambia el modelo del auto, cambia quiénes ya revisaron uno igual
form.elements.marca.addEventListener('change', cargarMecanicos);
form.elements.modelo.addEventListener('change', cargarMecanicos);
ordenMecanicos.addEventListener('change', cargarMecanicos);

// Llega con ?mecanico=N desde el ranking (talleres.html): se marca sólo la primera vez.
let mecanicoPedido = Number(params.get('mecanico')) || null;
function marcarElegido() {
    const radio = mecanicoPedido && document.getElementById(`mecanico-${mecanicoPedido}`);
    mecanicoPedido = null;
    if (!radio) return;
    radio.checked = true;
    mostrarDesglose();
}

function elegido() {
    const id = Number(form.querySelector('[name="mecanico_id"]:checked')?.value);
    return mecanicos.find((m) => m.id === id) || null;
}

function mostrarDesglose() {
    const m = elegido();
    errorMecanico.textContent = '';
    document.getElementById('resumen').hidden = !m;
    if (!m) return;
    const d = m.desglose;
    const descuento = Math.min(credito, d.precio);
    document.getElementById('desglose').replaceChildren(...filasDatos([
        ['Mecánico', `${m.mecanico} · ${m.taller}`],
        descuento ? ['Inspección', formato.precio(d.precio)] : null,
        descuento ? ['Tu crédito', `−${formato.precio(descuento)} (un auto que hiciste revisar se vendió)`] : null,
        ['Pagás', el('strong', {}, formato.precio(d.precio - descuento))],
        ['Para el mecánico', formato.precio(d.monto_mecanico)],
        ['Para AutoCar', `${formato.precio(d.monto_autocar)} (${formato.precio(d.monto_fondo)} van al fondo de garantía que paga los reclamos)`],
    ]));
}

// ---------- Enviar ----------

const numeroONulo = (texto) => (texto === '' ? null : Number(texto));

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    formularios.alerta(form, '');
    errorMecanico.textContent = '';
    const textos = Array.from(form.querySelectorAll('input:not([type="radio"])'));
    const okCampos = window.Validacion.validar(textos, form);
    const m = elegido();
    if (!m) {
        errorMecanico.textContent = 'Elegí un mecánico de la lista.';
        if (okCampos) formularios.alerta(form, 'Falta elegir el mecánico.');
    }
    if (!okCampos || !m) return;

    const datos = formularios.datosDe(form);
    const { marca, modelo } = elAuto();
    const boton = form.querySelector('[type="submit"]');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
        const { inspeccion } = await api.pedir({
            url: datos.url,
            mecanico_id: m.id,
            titulo: datos.titulo || null,
            anio: numeroONulo(datos.anio),
            kilometraje: numeroONulo(datos.kilometraje),
            precio_publicado: numeroONulo(datos.precio_publicado),
            localidad: datos.localidad || null,
            // Solo si se saben los dos (si el auto es de AutoCar, salen de la publicación)
            marca: marca && modelo ? marca : null,
            modelo: marca && modelo ? modelo : null,
            origen: params.get('origen') || null, // de dónde tocó "Mandale un mecánico" (estadísticas)
        });
        window.location.assign(ruta(`mis-inspecciones.html?nueva=${inspeccion.id}`));
    } catch (error) {
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        if (error.errores?.mecanico_id) errorMecanico.textContent = error.errores.mecanico_id;
        formularios.mostrarError(form, error);
        boton.disabled = false;
        boton.textContent = 'Pedir la inspección';
    }
});

// Solo se pide desde el botón "Mandale un mecánico" de un auto: el link llega fijo en ?url= y no se escribe a mano
if (sesion.requerirLogin()) {
    if (!params.get('url')) {
        form.hidden = true;
        const sinAuto = document.getElementById('sin-auto');
        sinAuto.replaceChildren(vistas.aviso('Elegí primero el auto.',
            'Abrí la publicación y tocá "Mandale un mecánico": así el link del aviso queda fijo.',
            vistas.el('a', { class: 'boton boton--secundario', href: ruta('home.html') }, 'Explorar autos')));
        sinAuto.hidden = false;
    } else {
        // Los días y el tope para reclamar son parámetros: se muestran los de hoy
        parametros.publicos().then((p) => {
            document.getElementById('alcance').replaceChildren(bloqueAlcance(true, { dias: p.dias_reclamo, tope: p.tope_veces }));
        });
        precargar();
        cargarMecanicos();
        // Estadísticas: llegó tocando "Mandale un mecánico" desde una recomendación
        if (params.get('origen')) eventos.registrar('tocado', params.get('origen'), params.get('url'));
        // Auto de AutoCar: todos los datos salen de la publicación (el back no acepta otros), no se muestra el bloque.
        // Marca y modelo: solo se piden si no se saben (los del metabuscador llegan en el link)
        if (insp.fuenteDeUrl(campoUrl.value, window.location.hostname) === 'autocar') {
            document.getElementById('datos-auto').hidden = true;
        } else if (marcaDelAviso) {
            document.getElementById('marca-modelo').hidden = true;
        } else {
            marcas.conectar(form.elements.marca, form.elements.modelo, { textoVacio: 'No sé' }).catch(() => {
                document.getElementById('marca-modelo').hidden = true;
            });
        }
        api.creditos().then((r) => {
            credito = r.total;
            mostrarDesglose();
        }).catch(() => {});
    }
}
