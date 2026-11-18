// Una inspección del lado del comprador (verificacion.html?id=N): estado y qué sigue, cancelar mientras está
// pedida, informe firmado, trámites para pedir antes de pagar y reclamo dentro de los días de reclamo de la inspección.
// También la ven el mecánico asignado y quien resuelve reclamos, pero sólo el comprador cancela y reclama.
import * as api from '../api/inspecciones.js';
import * as fallas from '../servicios/fallas.js';
import * as formato from '../servicios/formato.js';
import * as formularios from '../servicios/formularios.js';
import * as informe from '../servicios/informe.js';
import * as insp from '../servicios/inspecciones.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { ruta } from '../servicios/rutas.js';
import { boton, confirmacion } from '../servicios/acciones.js';

const { proximoPaso } = informe;

const { el } = vistas;
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const $ = (nombre) => document.getElementById(nombre);
const PAGOS = {
    retenido: 'Retenido hasta que el mecánico firme',
    liberado: 'Pagado al mecánico',
    reembolsado: 'Te lo devolvimos',
};
// Con Mercado Pago (cobro), el pago se muestra según el cobro
const COBROS = {
    pendiente: 'Falta pagar con Mercado Pago',
    pagado: 'Pagado con Mercado Pago',
    cancelado: 'Sin pagar (se canceló)',
    devuelto: 'Te lo devolvimos por Mercado Pago',
};
const VUELTA = {
    pagado: 'Listo, pagaste la inspección. Ahora el mecánico la acepta y te da un turno.',
    pendiente: 'Todavía no vemos el pago. Si pagaste, puede tardar unos minutos: recargá la página. Si no, tocá "Pagar con Mercado Pago".',
};

let inspeccion = null;

function avisar(texto) {
    $('aviso').textContent = texto;
    $('aviso').hidden = !texto;
}

const soyComprador = () => inspeccion.comprador.id === sesion.usuario()?.id;

// ---------- Estado ----------

function mostrarResumen(i) {
    $('titulo').textContent = insp.tituloAuto(i);
    document.title = `${insp.tituloAuto(i)} · Inspección - AutoCar`;
    $('resumen-estado').replaceChildren(informe.etiquetaEstado(i), ' ', proximoPaso(i));
    $('resumen-linea').replaceChildren(informe.lineaDeTiempo(i));
    $('resumen-datos').replaceChildren(...informe.filasDatos([
        ['Aviso', informe.enlaceAviso(i)],
        ['Mecánico', `${i.mecanico.nombre} · ${i.mecanico.taller || ''}`],
        i.mecanico.direccion ? ['Taller', `${i.mecanico.direccion}, ${i.mecanico.localidad}`] : null,
        i.fecha_turno ? ['Turno', formato.fechaHora(i.fecha_turno)] : null,
        // Auto de AutoCar: el vendedor confirma el turno (si vende antes, se cae solo y te devolvemos todo)
        i.fecha_turno && i.vehiculo_id && i.estado === 'aceptada'
            ? ['Vendedor', i.turno_confirmado_at ? `Confirmó el turno el ${formato.fecha(i.turno_confirmado_at)}` : 'Todavía no confirmó el turno']
            : null,
        ['Inspección', formato.precio(i.precio)],
        i.credito_usado > 0 ? ['Crédito usado', `−${formato.precio(i.credito_usado)} (pagaste ${formato.precio(i.a_pagar)})`] : null,
        i.credito ? ['Crédito a tu favor', `${formato.precio(i.credito.monto)}: ${insp.CREDITOS[i.credito.tipo] || ''}. Se descuenta solo en tu próxima inspección.`] : null,
        ['Pago', i.cobro ? COBROS[i.cobro.estado] || i.cobro.estado : PAGOS[i.pago] || i.pago],
        ['Pedida el', formato.fecha(i.created_at)],
    ]));
    // Sólo el comprador cancela, y mientras el mecánico no la aceptó
    if (i.estado === 'pedida' && soyComprador()) $('resumen').append(botonCancelar);
    else botonCancelar.remove();
    // Con Mercado Pago: mientras no pagó, el mecánico no la ve para aceptar
    if (i.estado === 'pedida' && i.cobro?.estado === 'pendiente' && soyComprador()) $('resumen').append(botonPagar);
    else botonPagar.remove();
    $('resumen').hidden = false;
}

// ---------- Informe ----------

function mostrarInforme(i) {
    const firmada = i.estado === 'firmada';
    $('informe').hidden = !firmada;
    $('anteriores').hidden = !firmada;
    $('tramites').hidden = !firmada;
    $('costo').hidden = !firmada;
    if (!firmada) return;
    mostrarCostoTotal(i);
    // Viene con el informe que pagó: las inspecciones anteriores de la misma patente
    $('anteriores-lista').replaceChildren(...informe.historialAuto(i));
    $('informe-conclusion').replaceChildren('Conclusión del mecánico ', informe.conclusionDestacada(i));
    $('informe-resumen').textContent = i.resumen || '';
    $('informe-resumen').hidden = !i.resumen;
    $('informe-conteo').replaceChildren(informe.resumenItems(i));
    $('informe-items').replaceChildren(informe.listaItems(i));
    $('informe-sello').replaceChildren(informe.sello(i));
    $('informe').classList.add('informe-documento');
    $('informe-firma').replaceChildren(...informe.datosFirma(i));
    $('tramites-lista').replaceChildren(...insp.TRAMITES.map((t) => el('li', {},
        el('a', { class: 'fila', href: t.url, target: '_blank', rel: 'noopener noreferrer' },
            el('span', { class: 'fila__cuerpo' },
                el('span', { class: 'fila__titulo' }, t.nombre), el('br'),
                el('span', { class: 'fila__meta' }, t.detalle)),
            el('span', { 'aria-hidden': 'true' }, '›')))));
}

// ---------- Costo total (idea A) y fallas típicas (idea B) ----------

function mostrarCostoTotal(i) {
    const nodos = informe.costoTotal(i);
    // Un informe firmado antes de que existiera el costo total no tiene presupuestos: el comprador los pide
    if (soyComprador() && !(i.presupuestos || []).length && i.costo_total?.items.length) {
        nodos.push(boton('Pedir presupuestos a otros talleres', async (evento) => {
            evento.currentTarget.disabled = true;
            inspeccion = (await api.pedirPresupuestos(id)).inspeccion;
            mostrarCostoTotal(inspeccion);
            avisar('Les pedimos presupuesto a otros talleres de la red. Las respuestas aparecen acá.');
        }, 'boton boton--secundario', 'pedir-presupuestos'));
    }
    $('costo-lista').replaceChildren(...nodos);
}

async function mostrarFallas(i) {
    $('fallas').hidden = true;
    if (!i.marca || !i.modelo) return;
    try {
        const { fallas_tipicas: d } = await api.fallasTipicas(i.marca, i.modelo);
        $('fallas-titulo').textContent = `Fallas típicas del ${i.marca} ${i.modelo}`;
        $('fallas-lista').replaceChildren(...fallas.lista(d));
        $('fallas').hidden = false;
    } catch {
        // Sin las fallas típicas el informe igual sirve
    }
}

// ---------- Reclamo ----------

function mostrarReclamo(i) {
    const r = i.reclamo;
    const puedeReclamar = i.puede_reclamar && soyComprador();
    $('reclamo').hidden = !r && !puedeReclamar;
    $('reclamo-datos').hidden = !r;
    $('form-reclamo').hidden = Boolean(r) || !puedeReclamar;
    if (r) {
        $('reclamo-datos').replaceChildren(...informe.filasDatos([
            ['Estado', el('strong', {}, insp.estadoReclamo(r.estado))],
            r.item_codigo ? ['Ítem', insp.nombreItem(r.item_codigo)] : null,
            ['Qué pasó', r.descripcion],
            ['Enviado el', formato.fecha(r.created_at)],
            r.respuesta ? ['Respuesta', r.respuesta] : null,
            r.estado === 'procede' ? ['Te devolvemos', formato.precio(r.devolucion ?? i.a_pagar ?? i.precio)] : null,
            r.estado === 'procede' ? ['Compensación', formato.precio(r.compensacion || 0)] : null,
        ]));
        return;
    }
    if (puedeReclamar) {
        $('reclamo-plazo').textContent = `Si el mecánico pasó por alto algo que se veía, podés reclamar una vez hasta el ${formato.fecha(i.reclamo_hasta)}.`;
        $('reclamo-alcance').replaceChildren(informe.bloqueAlcance(false, { dias: i.dias_reclamo, tope: i.tope_veces }));
    }
}

const select = $('item_codigo');
select.append(...insp.CHECKLIST.map((c) => el('option', { value: c.codigo }, c.nombre)));

formularios.alEnviar($('form-reclamo'), async ({ descripcion, item_codigo: item }) => {
    inspeccion = (await api.reclamar(id, { descripcion, item_codigo: item || null })).inspeccion;
    mostrarTodo(inspeccion);
    avisar('Enviamos tu reclamo. AutoCar lo revisa y te responde acá.');
});

// ---------- Cancelar ----------

const pedirCancelar = confirmacion({
    titulo: 'Cancelar la inspección',
    confirmar: 'Cancelar inspección',
    volver: 'Volver',
    detalle: () => [el('p', {}, 'El mecánico todavía no la aceptó. Si la cancelás, te devolvemos todo lo que pagaste.')],
    hacer: async () => {
        inspeccion = (await api.cancelar(id)).inspeccion;
        mostrarTodo(inspeccion);
        avisar('Cancelaste la inspección. Te devolvemos lo que pagaste.');
    },
});

// Se agrega al final del recuadro "Estado" en mostrarResumen
const botonCancelar = boton('Cancelar la inspección', () => pedirCancelar(), 'boton boton--secundario', 'cancelar');

// ---------- Pagar (Mercado Pago) ----------

const botonPagar = boton('Pagar con Mercado Pago', async (evento) => {
    const yo = evento.currentTarget; // después del await, currentTarget ya no está
    yo.disabled = true;
    try {
        const { cobro, inspeccion: actual } = await api.pagar(id);
        if (cobro?.checkout_url) {
            window.location.assign(cobro.checkout_url);
            return;
        }
        inspeccion = actual;
        mostrarTodo(inspeccion);
    } catch (error) {
        avisar(error.message);
    }
    yo.disabled = false;
}, 'boton', 'pagar');

// ---------- Inicio ----------

function mostrarTodo(i) {
    // El mecánico vuelve a su panel; el admin, a la cola de reclamos
    if (!soyComprador()) {
        $('volver').href = ruta(i.mecanico.id === sesion.usuario()?.id ? 'taller.html' : 'admin-reclamos.html');
    }
    mostrarResumen(i);
    mostrarInforme(i);
    mostrarReclamo(i);
    mostrarFallas(i);
}

async function iniciar() {
    if (!/^\d+$/.test(id || '')) {
        $('estado').replaceChildren(vistas.aviso('Falta la inspección.', 'Entrá desde Mis inspecciones.'));
        return;
    }
    $('estado').replaceChildren(vistas.cargando());
    try {
        // Volvió de Mercado Pago: se le pregunta al back cómo quedó el pago (y se saca ?pago= de la dirección)
        const volvio = params.get('pago') === 'vuelta';
        inspeccion = (volvio ? await api.estadoPago(id) : await api.detalle(id)).inspeccion;
        if (volvio) window.history.replaceState(null, '', `?id=${encodeURIComponent(id)}`);
        $('estado').replaceChildren();
        mostrarTodo(inspeccion);
        if (volvio && inspeccion.cobro) avisar(VUELTA[inspeccion.cobro.estado] || '');
    } catch (error) {
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        $('estado').replaceChildren(error.status === 404
            ? vistas.aviso('No encontramos esa inspección.')
            : vistas.avisoDeError(error));
    }
}

if (sesion.requerirLogin()) iniciar();
