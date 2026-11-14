// "¿Para qué buscás el auto?" con PUT /api/me/preferencias. Es obligatoria para las cuentas personales: mientras no
// la contesten (o no acepten la política de privacidad), js/navegacion.js los trae a esta página desde cualquier otra.
// También se entra desde Mi cuenta para cambiar las respuestas.
import * as auth from '../api/auth.js';
import * as sesion from '../servicios/sesion.js';
import { alEnviar } from '../servicios/formularios.js';
import { ruta } from '../servicios/rutas.js';
import { el } from '../servicios/vistas.js';

const formulario = document.getElementById('form-preferencias');

// Si la cuenta todavía no aceptó la política de privacidad, la casilla va antes del botón (obligatoria)
function agregarCasillaPrivacidad() {
    const enlace = el('a', { href: ruta('legales.html') + '#privacidad' }, 'la política de privacidad');
    const casilla = el('div', { class: 'campo' },
        el('label', { class: 'casilla' },
            el('input', { type: 'checkbox', id: 'acepta_privacidad', name: 'acepta_privacidad', required: true,
                'aria-describedby': 'acepta_privacidad-error' }),
            el('span', {}, 'Leí y acepto ', enlace, '.')),
        el('span', { class: 'campo__error', id: 'acepta_privacidad-error' }));
    formulario.querySelector('[type="submit"]').before(casilla);
}

// Completa el formulario con lo que ya contestó
function completar(preferencias) {
    if (!preferencias) return;
    const opcion = formulario.querySelector(`input[name="uso"][value="${preferencias.uso}"]`);
    if (opcion) opcion.checked = true;
    formulario.elements.tipo.value = preferencias.tipo || '';
    formulario.elements.presupuesto.value = preferencias.presupuesto || '';
    formulario.elements.localidad.value = preferencias.localidad || '';
}

async function cargar() {
    // Los datos de la sesión pueden ser viejos: se piden de nuevo
    const respuesta = await auth.me();
    sesion.actualizar(respuesta);
    const usuario = respuesta.usuario;
    // El equipo y los talleres no compran: no tienen nada que contestar acá
    if (usuario.rol !== 'usuario') {
        window.location.replace(ruta('cuenta.html'));
        return;
    }
    if (usuario.privacidad_pendiente) agregarCasillaPrivacidad();
    completar((await auth.preferencias()).preferencias);
}

alEnviar(formulario, async (datos) => {
    const { preferencias } = await auth.guardarPreferencias(datos);
    // Ya contestó: la navegación deja de traerlo acá
    sesion.actualizar({ usuario: { ...sesion.usuario(), preferencias, preferencias_pendientes: false, privacidad_pendiente: false } });
    window.location.replace(sesion.destinoDespuesDelLogin());
});

if (sesion.requerirLogin()) cargar();
