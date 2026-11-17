// Piezas del informe de una inspección que comparten el mecánico (taller-verificacion.html), el comprador
// (verificacion.html) y el admin. Todo con el DOM, nada con innerHTML.
import * as formato from './formato.js';
import * as insp from './inspecciones.js';
import { API_URL } from '../api/config.js';
import { ruta } from './rutas.js';
import { el } from './vistas.js';

// Pares [dt, dd] → los hijos de un <dl class="datos">. Los pares null se saltean.
export const filasDatos = (pares) =>
    pares.filter(Boolean).flatMap(([dt, dd]) => [el('dt', {}, dt), el('dd', {}, dd)]);

// Los 10 ítems con su resultado y la nota, en el orden del checklist. Cada uno con su color:
// verde OK, ámbar Observado y rojo Falla (también con un ícono, para no depender solo del color).
const ICONO_RESULTADO = { ok: '✓', observado: '!', falla: '✕' };
export function listaItems(inspeccion) {
    const porCodigo = Object.fromEntries((inspeccion.items || []).map((x) => [x.codigo, x]));
    return el('ul', { class: 'lista-filas items-informe', role: 'list' }, ...insp.CHECKLIST.map((c) => {
        const item = porCodigo[c.codigo] || {};
        const r = insp.RESULTADOS[item.resultado] ? item.resultado : 'sin';
        return el('li', { class: `item-informe item-informe--${r}` },
            el('div', { class: 'fila' },
                el('span', { class: 'item-informe__icono', 'aria-hidden': 'true' }, ICONO_RESULTADO[r] || '–'),
                el('span', { class: 'fila__cuerpo' },
                    el('span', { class: 'fila__titulo' }, c.nombre),
                    el('span', { class: 'fila__meta' }, item.nota || c.detalle)),
                el('span', { class: `etiqueta resultado resultado--${r}` }, insp.resultado(item.resultado || '—'))));
    }));
}

// "8 OK · 1 observado · 1 falla" con una barra de tres colores proporcional
export function resumenItems(inspeccion) {
    const cuenta = { ok: 0, observado: 0, falla: 0 };
    (inspeccion.items || []).forEach((x) => { if (x.resultado in cuenta) cuenta[x.resultado] += 1; });
    const barra = el('span', { class: 'resumen-items__barra', 'aria-hidden': 'true' },
        ...Object.entries(cuenta).filter(([, n]) => n).map(([r, n]) => {
            const tramo = el('span', { class: `resumen-items__tramo resultado--${r}` });
            tramo.style.flexGrow = String(n);
            return tramo;
        }));
    const textos = [[cuenta.ok, 'OK'], [cuenta.observado, cuenta.observado === 1 ? 'observado' : 'observados'],
        [cuenta.falla, cuenta.falla === 1 ? 'falla' : 'fallas']].filter(([n]) => n).map(([n, t]) => `${n} ${t}`);
    return el('div', { class: 'resumen-items' }, barra, el('p', { class: 'resumen-items__texto' }, textos.join(' · ')));
}

// Conclusión del mecánico como una etiqueta grande con color
export const conclusionDestacada = (i) =>
    el('span', { class: `conclusion conclusion--${i.conclusion}` }, insp.conclusion(i.conclusion));

// Sello de "Firmado" con el nombre y la fecha (decorativo: los datos están en el <dl> de la firma)
export const sello = (i) => el('div', { class: 'sello', 'aria-hidden': 'true' },
    el('span', { class: 'sello__titulo' }, 'Firmado'),
    el('span', { class: 'sello__nombre' }, i.firmado_por || ''),
    el('span', { class: 'sello__fecha' }, formato.fecha(i.firmada_at)));

// Por dónde va el pedido: Pedida → Aceptada (turno) → Firmada. Si terminó de otra forma (rechazada,
// cancelada o no se pudo hacer), el último paso va en rojo con ese estado.
export function lineaDeTiempo(i) {
    const orden = ['pedida', 'aceptada', 'firmada'];
    const corte = ['rechazada', 'cancelada', 'no_realizada', 'caida'].includes(i.estado);
    const llegoAAceptada = i.estado === 'no_realizada' || (i.estado === 'caida' && i.fecha_turno);
    const hasta = corte ? (llegoAAceptada ? 1 : 0) : orden.indexOf(i.estado);
    const pasos = [
        ['Pedida', formato.fecha(i.created_at)],
        ['Aceptada', i.fecha_turno ? `Turno ${formato.fechaHora(i.fecha_turno)}` : ''],
        ['Firmada', i.firmada_at ? formato.fecha(i.firmada_at) : ''],
    ];
    const items = pasos.map(([nombre, detalle], n) => {
        let clase = 'pendiente';
        if (n <= hasta) clase = 'hecho';
        if (!corte && n === hasta && i.estado !== 'firmada') clase = 'actual';
        return el('li', { class: `linea-tiempo__paso linea-tiempo__paso--${clase}` },
            el('span', { class: 'linea-tiempo__punto', 'aria-hidden': 'true' }),
            el('span', { class: 'linea-tiempo__nombre' }, nombre),
            detalle && n <= hasta ? el('span', { class: 'linea-tiempo__detalle' }, detalle) : null);
    });
    if (corte) {
        items.splice(hasta + 1, items.length, el('li', { class: 'linea-tiempo__paso linea-tiempo__paso--corte' },
            el('span', { class: 'linea-tiempo__punto', 'aria-hidden': 'true' }),
            el('span', { class: 'linea-tiempo__nombre' }, insp.estado(i.estado))));
    }
    return el('ol', { class: 'linea-tiempo', 'aria-label': `Estado del pedido: ${insp.estado(i.estado)}` }, ...items);
}

// Quién firmó y cuándo. La huella (SHA-256) la guarda el back para controlar que el informe no cambió,
// pero no se muestra en ninguna pantalla.
export const datosFirma = (i) => filasDatos([
    i.patente ? ['Patente', insp.formatoPatente(i.patente)] : null,
    i.patente_foto ? ['Chapa', el('a', { href: API_URL + i.patente_foto, target: '_blank', rel: 'noopener' }, 'Ver la foto')] : null,
    ['Firmado por', i.firmado_por],
    ['Taller', i.taller_firma],
    ['Fecha', formato.fechaHora(i.firmada_at)],
]);

// "hace 3 meses": así se ve enseguida si un informe anterior es viejo
function hace(iso) {
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (dias < 1) return 'hoy';
    if (dias === 1) return 'ayer';
    if (dias < 31) return `hace ${dias} días`;
    const meses = Math.floor(dias / 30);
    if (meses < 12) return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
    const anios = Math.floor(meses / 12);
    return anios === 1 ? 'hace 1 año' : `hace ${anios} años`;
}

// La conclusión con el color de los resultados: verde, ámbar o rojo
const TONO_CONCLUSION = { recomendable: 'ok', con_reparos: 'observado', no_recomendable: 'falla' };

// Una inspección anterior del mismo auto: cuándo, con cuántos km, qué concluyó y qué ítems no estaban OK
function filaAnterior(a) {
    const datos = [a.titulo, a.anio, a.kilometraje !== null ? formato.km(a.kilometraje) : null, a.taller]
        .filter(Boolean).join(' · ');
    const fallas = a.fallas.length
        ? a.fallas.map((f) => el('span', { class: `etiqueta resultado resultado--${f.resultado}` },
            `${insp.nombreItem(f.codigo)}: ${insp.resultado(f.resultado).toLowerCase()}`))
        : [el('span', { class: 'etiqueta resultado resultado--ok' }, 'Todo OK')];
    return el('li', { class: 'historial-auto__item' },
        el('p', { class: 'historial-auto__cabeza' },
            el('strong', {}, hace(a.firmada_at)),
            el('span', { class: 'historial-auto__fecha' }, formato.fecha(a.firmada_at)),
            el('span', { class: `etiqueta resultado resultado--${TONO_CONCLUSION[a.conclusion] || 'sin'}` }, insp.conclusion(a.conclusion))),
        el('p', { class: 'historial-auto__datos' }, datos),
        el('p', { class: 'historial-auto__fallas' }, ...fallas),
        a.reclamo_procedente
            ? el('p', { class: 'historial-auto__reclamo' }, 'Hubo un reclamo que procedió: al mecánico se le pasó algo.')
            : null);
}

// El historial del auto que trae el informe (las otras inspecciones de la misma patente, GET /api/inspecciones/{id}).
// No se busca por patente: lo ven el comprador que pagó esta inspección y el mecánico. Si el aviso dice menos km
// que una inspección anterior, se avisa arriba: es la señal más clara de km bajados.
export function historialAuto(i) {
    const anteriores = i.anteriores || [];
    if (!anteriores.length) {
        return [el('p', { class: 'campo__ayuda' }, 'Es la primera inspección de este auto en AutoCar.')];
    }
    const maximo = Math.max(...anteriores.map((a) => a.kilometraje ?? 0));
    const kmBajados = i.kilometraje !== null && i.kilometraje < maximo;
    return [
        kmBajados ? el('p', { class: 'historial-auto__alerta', role: 'note' },
            el('strong', {}, 'Ojo con los km. '),
            `El aviso dice ${formato.km(i.kilometraje)}, pero en una inspección anterior tenía ${formato.km(maximo)}.`) : null,
        el('p', { class: 'campo__ayuda' }, anteriores.length === 1
            ? 'Este auto ya se revisó una vez en AutoCar:'
            : `Este auto ya se revisó ${anteriores.length} veces en AutoCar:`),
        el('ol', { class: 'historial-auto', role: 'list' }, ...anteriores.map(filaAnterior)),
    ].filter(Boolean);
}

// Para el comprador: qué pasa con la inspección y qué sigue, en una línea.
export function proximoPaso(i) {
    switch (i.estado) {
    case 'pedida': return 'Esperando que el mecánico acepte y te dé un turno.';
    case 'aceptada': return `Turno: ${formato.fechaHora(i.fecha_turno)} en ${i.mecanico.direccion}, ${i.mecanico.localidad}.`
        + (i.vehiculo_id ? (i.turno_confirmado_at ? ' El vendedor lo confirmó.' : ' Falta que el vendedor lo confirme.') : '');
    case 'rechazada': return `El mecánico no la puede hacer: ${i.motivo_rechazo}. Te devolvimos lo que pagaste.`;
    case 'cancelada': return 'La cancelaste. Te devolvimos lo que pagaste.';
    case 'no_realizada': return `El mecánico no la pudo hacer: ${i.motivo_rechazo}. Te devolvimos lo que pagaste.`;
    case 'caida': return i.motivo_rechazo || 'El auto se vendió antes del turno. Te devolvimos lo que pagaste.';
    case 'firmada':
        if (i.reclamo) return `Informe ${insp.conclusion(i.conclusion)}. Reclamo: ${insp.estadoReclamo(i.reclamo.estado)}.`;
        if (i.puede_reclamar) return `Informe ${insp.conclusion(i.conclusion)}. Podés reclamar hasta el ${formato.fecha(i.reclamo_hasta)}.`;
        return `Informe ${insp.conclusion(i.conclusion)}.`;
    default: return insp.estado(i.estado);
    }
}

// Etiqueta del estado, en oscuro los que terminaron bien o requieren atención.
export function etiquetaEstado(i) {
    return el('span', { class: `etiqueta etiqueta-insp etiqueta-insp--${i.estado}` }, insp.estado(i.estado));
}

// Qué revisa el mecánico y qué queda afuera (insp.ALCANCE), como <details> plegable.
// plazo: {dias, tope} para reclamar (los de la inspección, o los parámetros de hoy si todavía no se pidió).
export function bloqueAlcance(abierto, plazo) {
    const lista = (items) => el('ul', { class: 'pila' }, ...items.map((t) => el('li', {}, t)));
    return el('details', { class: 'alcance', open: abierto },
        el('summary', {}, 'Qué revisa el mecánico y qué queda afuera'),
        el('h3', { class: 'alcance__titulo' }, 'Revisa, sin desarmar el auto'),
        lista(insp.ALCANCE.cubre()),
        el('h3', { class: 'alcance__titulo' }, 'No cubre'),
        lista(insp.ALCANCE.noCubre),
        el('p', { class: 'campo__ayuda' }, insp.textoReclamo(plazo.dias, plazo.tope)));
}

// Link al aviso que se inspeccionó. Que el auto se venda o la publicación se dé de baja es lo normal: el informe
// sigue valiendo y queda en la patente, así que en lugar de un link que da "no existe" se dice eso.
// - Publicación de AutoCar: el link se arma con su id (no con la URL guardada, que pudo ser de otro dominio)
//   y si ya no está a la vista (aviso_publicado false), solo el texto.
// - Aviso de otro sitio: no sabemos si sigue publicado, así que va el link con la aclaración.
export function enlaceAviso(i, texto = `Ver en ${insp.fuente(i.fuente)}`, clase = null) {
    if (i.vehiculo_id) {
        if (i.aviso_publicado === false) {
            return el('span', { class: 'suave' }, 'La publicación ya no está en AutoCar (se vendió o la dieron de baja). El informe sigue valiendo y queda en la patente.');
        }
        return el('a', { class: clase, href: ruta(`vehiculo.html?id=${i.vehiculo_id}`) }, texto);
    }
    return el('span', {},
        el('a', { class: clase, href: i.url, target: '_blank', rel: 'noopener noreferrer' }, texto),
        el('span', { class: 'suave' }, ' (si el auto ya se vendió, puede que el aviso no esté más)'));
}

// Idea A, costo total: cada arreglo del informe con los presupuestos de otros talleres (el que revisó nunca
// presupuesta lo que encontró) y el total = precio del aviso + el presupuesto vigente más barato de cada arreglo.
// i: la inspección del detalle (trae presupuestos y costo_total). Devuelve los nodos del recuadro.
export function costoTotal(i) {
    const c = i.costo_total;
    if (!c || !c.items.length) {
        return [el('p', { class: 'campo__ayuda' }, 'El mecánico no marcó arreglos: no hay nada que presupuestar.')];
    }
    const porItem = (codigo) => (i.presupuestos || []).filter((p) => p.item_codigo === codigo);
    const filaPresupuesto = (p, mejor) => {
        let estado = '';
        if (p.estado === 'pedido') estado = 'Esperando respuesta';
        else if (p.estado === 'rechazado') estado = 'No lo hace';
        else if (!p.vigente) estado = `Vencido el ${formato.fecha(p.vigente_hasta)}`;
        else estado = `Vale hasta el ${formato.fecha(p.vigente_hasta)}`;
        const esMejor = p.vigente && p.monto === mejor;
        return el('li', { class: `presupuesto${esMejor ? ' presupuesto--mejor' : ''}` },
            el('span', { class: 'presupuesto__taller' },
                el('strong', {}, p.taller.nombre || 'Taller'), ` · ${p.taller.localidad || ''}`),
            el('span', { class: 'presupuesto__monto' }, p.monto !== null ? formato.precio(p.monto) : '—'),
            el('span', { class: 'presupuesto__detalle suave' }, [p.detalle, estado].filter(Boolean).join(' · ')),
            esMejor ? el('span', { class: 'etiqueta resultado resultado--ok' }, 'El más barato') : null);
    };
    const arreglos = c.items.map((a) => el('li', { class: 'costo-total__arreglo' },
        el('p', {},
            el('span', { class: `etiqueta resultado resultado--${a.resultado}` }, insp.nombreItem(a.codigo)), ' ',
            a.mejor !== null ? el('strong', {}, formato.precio(a.mejor)) : el('span', { class: 'suave' }, 'Sin presupuesto todavía')),
        el('ul', { class: 'pila', role: 'list' }, ...porItem(a.codigo).map((p) => filaPresupuesto(p, a.mejor)))));
    return [
        el('ul', { class: 'costo-total pila', role: 'list' }, ...arreglos),
        filasDatos([
            c.precio_publicado !== null ? ['Precio del aviso', formato.precio(c.precio_publicado)] : null,
            ['Arreglos', formato.precio(c.arreglos)],
            c.total !== null ? ['Costo total', el('strong', {}, formato.precio(c.total))] : null,
        ]),
        c.completo ? null : el('p', { class: 'campo__ayuda' },
            'Algún arreglo todavía no tiene presupuesto: el total suma lo que ya respondieron los talleres.'),
        el('p', { class: 'campo__ayuda' },
            'Los presupuestos son de otros talleres de la red: el mecánico que revisó el auto nunca presupuesta lo que encontró.'),
    ].filter(Boolean);
}
