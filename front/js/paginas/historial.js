// Historial por patente: las inspecciones firmadas de un auto (GET /api/historial-patente, con sesión).
// La patente viaja en la URL (?patente=AB123CD), así se puede volver atrás o mandar el link.
// Se llega desde el informe de una inspección ("ver el historial"), desde "Patentes" en la barra de arriba o escribiéndola acá.
import * as api from '../api/inspecciones.js';
import * as formato from '../servicios/formato.js';
import * as insp from '../servicios/inspecciones.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { ruta } from '../servicios/rutas.js';

const { el } = vistas;
const form = document.getElementById('form-historial');
const lista = document.getElementById('lista');
const estado = document.getElementById('estado');
const error = document.getElementById('patente-error');

function fila(i) {
    const detalles = [
        i.anio ? String(i.anio) : null,
        i.kilometraje !== null ? formato.km(i.kilometraje) : null,
        i.observaciones ? `${i.observaciones} ${i.observaciones === 1 ? 'ítem observado o con falla' : 'ítems observados o con falla'}` : 'Todo OK',
    ].filter(Boolean).join(' · ');
    return el('li', { class: 'fila' },
        el('span', { class: 'fila__cuerpo' },
            el('span', { class: 'fila__titulo' }, `${formato.fecha(i.firmada_at)} · ${insp.conclusion(i.conclusion)}`), el('br'),
            el('span', { class: 'fila__meta' }, `${i.titulo || 'Auto'} · ${detalles}`), el('br'),
            el('span', { class: 'fila__meta' }, `Firmó ${i.firmado_por}, ${i.taller}`
                + (i.reclamo_procedente ? '. Hubo un reclamo que procedió: el mecánico pasó algo por alto.' : ''))));
}

async function buscar(patente) {
    form.elements.patente.value = insp.formatoPatente(patente);
    estado.replaceChildren(vistas.cargando());
    lista.replaceChildren();
    try {
        const r = await api.historial(patente);
        estado.replaceChildren();
        if (!r.items.length) {
            estado.replaceChildren(vistas.aviso(`No hay inspecciones de ${insp.formatoPatente(r.patente)}.`,
                'Si lo vas a comprar, mandale un mecánico desde el aviso y va a ser la primera.',
                el('a', { class: 'boton boton--secundario', href: ruta('home.html') }, 'Explorar autos')));
            return;
        }
        lista.replaceChildren(...r.items.map(fila));
    } catch (e) {
        if (e.status === 401) sesion.requerirLogin();
        estado.replaceChildren(vistas.avisoDeError(e));
    }
}

// Buscar: se normaliza acá para avisar enseguida si el formato no es de una patente
form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    error.textContent = '';
    const patente = insp.normalizarPatente(form.elements.patente.value);
    if (!patente) {
        error.textContent = 'Escribila como está en la chapa: ABC123 o AB123CD.';
        form.elements.patente.focus();
        return;
    }
    window.history.replaceState(null, '', `?patente=${patente}`);
    buscar(patente);
});

if (sesion.requerirLogin()) {
    const pedida = insp.normalizarPatente(new URLSearchParams(window.location.search).get('patente'));
    if (pedida) buscar(pedida);
}
