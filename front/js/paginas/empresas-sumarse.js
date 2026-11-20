// "Sumá tu concesionaria": una empresa pide sumarse. POST /api/solicitudes-empresa (no hace falta sesión).
// La cuenta de la empresa es aparte de la personal (otro email). Queda pendiente hasta que la aprueba un admin
// (admin-empresas.html); recién ahí ingresa con el login de siempre. Si la rechazaron, se vuelve a mandar desde acá
// con el mismo email y la misma contraseña. Logueado no se muestra el formulario.
import * as empresas from '../api/empresas.js';
import * as auth from '../api/auth.js';
import * as parametros from '../api/parametros.js';
import * as formato from '../servicios/formato.js';
import * as formularios from '../servicios/formularios.js';
import * as sesion from '../servicios/sesion.js';
import * as vistas from '../servicios/vistas.js';
import { ruta } from '../servicios/rutas.js';

const { el } = vistas;
const form = document.getElementById('form-empresa');
const estadoSolicitud = document.getElementById('estado-solicitud');

function mostrarEstado(...contenido) {
    estadoSolicitud.replaceChildren(...contenido);
    estadoSolicitud.hidden = contenido.length === 0;
}

async function salirYVolver() {
    try {
        await auth.logout();
    } catch {
        // Sin conexión: se borra lo local igual.
    }
    sesion.cerrar();
    window.location.reload();
}

function iniciar() {
    if (!sesion.iniciada()) return;
    form.hidden = true;
    if (sesion.usuario().rol === 'empresa') {
        mostrarEstado(vistas.aviso('Tu empresa ya está en AutoCar.', 'Estás con la cuenta de tu concesionaria.',
            el('a', { class: 'boton', href: ruta('empresa-panel.html') }, 'Ir a mi panel')));
        return;
    }
    const salir = el('button', { class: 'boton', type: 'button' }, 'Cerrar sesión');
    salir.addEventListener('click', salirYVolver);
    mostrarEstado(vistas.aviso('La cuenta de la empresa es aparte de tu cuenta personal.',
        'Cerrá sesión y te mostramos el formulario para crearla.', salir));
}

formularios.alEnviar(form, async (datos) => {
    const respuesta = await empresas.enviarSolicitud({ ...datos, condiciones: form.elements.condiciones.checked });
    form.hidden = true;
    mostrarEstado(vistas.aviso('Tu solicitud está pendiente.',
        `Recibimos los datos de ${respuesta.solicitud.razon_social} el ${formato.fecha(respuesta.solicitud.creada)}. `
        + `Cuando un administrador la apruebe, vas a poder ingresar con ${respuesta.solicitud.email} y la contraseña que elegiste.`));
    estadoSolicitud.scrollIntoView();
});

// El abono es un parámetro que cambia el admin
async function mostrarAbono() {
    try {
        const p = await parametros.publicos();
        if (p.abono_empresa_mensual !== undefined) {
            document.getElementById('abono-ayuda').textContent = `Abono mensual: ${formato.precio(p.abono_empresa_mensual)}, `
                + 'el mismo para todas las empresas. Incluye el mantenimiento y la aparición de tus autos.';
        }
    } catch {
        // Sin los parámetros queda el texto general.
    }
}

iniciar();
mostrarAbono();
