// Solicitudes de "Sumá tu concesionaria" (permiso usuarios.editar): pendientes, aprobadas y rechazadas.
// Aprobar: la cuenta de la empresa ya puede ingresar, publica sin límite y paga el abono. Rechazar: con un motivo que ve al querer ingresar.
import * as admin from '../api/admin.js';
import * as formato from '../servicios/formato.js';
import * as formularios from '../servicios/formularios.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { filasDatos } from '../servicios/informe.js';
import { campo, formularioEnHoja } from '../servicios/acciones.js';

const { el } = vistas;
const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];
const pedido = new URLSearchParams(window.location.search).get('estado');
const estadoActual = ESTADOS.includes(pedido) ? pedido : 'pendiente';

const lista = document.getElementById('lista');
const estado = document.getElementById('estado');
const aviso = document.getElementById('aviso');
// La ventana para rechazar la arma el JS (no está en admin-empresas.html)
const rechazarTaller = el('p', { class: 'suave' });
const { dialogo, formulario: form } = formularioEnHoja({
    titulo: 'Rechazar la solicitud',
    id: 'form-rechazar',
    enviar: 'Rechazar',
    campos: [
        rechazarTaller,
        campo('Motivo (lo ve el que la pidió)',
            el('textarea', { id: 'motivo', name: 'motivo', rows: 3, required: true, minlength: 5, maxlength: 300 })),
    ],
});
let elegida = null;

function avisar(texto) {
    aviso.textContent = texto;
    aviso.hidden = !texto;
}

async function aprobar(s, boton) {
    boton.disabled = true;
    try {
        await admin.resolverSolicitudEmpresa(s.usuario_id, { aprobar: true });
        avisar(`Listo: ${s.razon_social} ya está en AutoCar: puede ingresar y publicar con su insignia.`);
        await cargar();
    } catch (error) {
        boton.disabled = false;
        avisar(error.message);
    }
}

function abrirRechazo(s) {
    elegida = s;
    form.reset();
    rechazarTaller.textContent = `${s.razon_social} · ${s.responsable}`;
    formularios.alerta(form, '');
    dialogo.showModal();
}

function tarjeta(s) {
    const acciones = [];
    if (s.estado === 'pendiente') {
        const botonAprobar = el('button', { class: 'boton boton--chico', type: 'button' }, 'Aprobar');
        botonAprobar.addEventListener('click', () => aprobar(s, botonAprobar));
        const botonRechazar = el('button', { class: 'boton boton--secundario boton--chico', type: 'button' }, 'Rechazar');
        botonRechazar.addEventListener('click', () => abrirRechazo(s));
        acciones.push(botonAprobar, botonRechazar);
    }

    let resolucion = null;
    if (s.estado !== 'pendiente') {
        const partes = [s.estado === 'aprobado' ? 'Aprobada' : 'Rechazada'];
        if (s.resuelta_por) partes.push(s.resuelta_por);
        if (s.resuelta) partes.push(formato.fecha(s.resuelta));
        resolucion = ['Resolución', partes.join(' · ')];
    }
    let motivo = null;
    if (s.motivo_rechazo) motivo = ['Motivo', s.motivo_rechazo];

    return el('article', { class: 'recuadro pila' },
        el('h2', { class: 'titulo-seccion' }, s.razon_social),
        el('dl', { class: 'datos' }, ...filasDatos([
            ['Pedida', formato.fecha(s.creada)],
            ['Responsable', `${s.responsable} · ${s.email}`],
            ['CUIT', s.cuit],
            ['Localidad', s.localidad],
            ['Teléfono', s.telefono],
            ['Sitio web', s.sitio_web || '—'],
            resolucion,
            motivo,
        ])),
        acciones.length ? el('ul', { class: 'acciones-fila', role: 'list' }, ...acciones.map((a) => el('li', {}, a))) : null);
}

const VACIO = {
    pendiente: 'No hay solicitudes por revisar.',
    aprobado: 'Todavía no se aprobó ninguna solicitud.',
    rechazado: 'No hay solicitudes rechazadas.',
};

function marcarPestanas() {
    document.querySelectorAll('#pestanas [data-estado]').forEach((a) => {
        if (a.dataset.estado === estadoActual) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    });
}

async function cargar() {
    estado.replaceChildren(vistas.cargando());
    try {
        const { items } = await admin.solicitudesEmpresa(estadoActual);
        lista.replaceChildren(...items.map(tarjeta));
        estado.replaceChildren(items.length ? '' : vistas.aviso(VACIO[estadoActual]));
    } catch (error) {
        if (error.status === 401) {
            sesion.requerirLogin();
            return;
        }
        estado.replaceChildren(error.status === 403
            ? vistas.aviso('No tenés permiso para ver las solicitudes de empresas.')
            : vistas.avisoDeError(error));
    }
}

formularios.alEnviar(form, async ({ motivo }) => {
    await admin.resolverSolicitudEmpresa(elegida.usuario_id, { aprobar: false, motivo });
    dialogo.close();
    avisar(`Se rechazó la solicitud de ${elegida.razon_social}. ${elegida.responsable} ve el motivo y puede volver a mandarla.`);
    await cargar();
});

if (sesion.requerirPermiso('usuarios.editar')) {
    marcarPestanas();
    cargar();
}
