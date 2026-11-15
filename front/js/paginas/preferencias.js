// "¿Para qué buscás el auto?" desde Mi cuenta: las mismas cuatro tarjetas del cartel de la primera vez
// (js/servicios/perfil.js). Al tocar una se guarda y vuelve a donde estaba.
import * as auth from '../api/auth.js';
import * as sesion from '../servicios/sesion.js';
import { tarjetasPerfil, guardarPerfil, casillaPrivacidad } from '../servicios/perfil.js';
import { ruta } from '../servicios/rutas.js';

const lugar = document.getElementById('perfiles');
const alerta = document.getElementById('perfil-alerta');

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
    const { preferencias } = await auth.preferencias();
    let guardando = false;
    lugar.replaceChildren(tarjetasPerfil(async (uso) => {
        if (guardando) return;
        guardando = true;
        if (await guardarPerfil(uso, lugar, alerta)) window.location.replace(sesion.destinoDespuesDelLogin());
        guardando = false;
    }, preferencias?.uso));
    if (usuario.privacidad_pendiente) lugar.append(casillaPrivacidad());
    lugar.removeAttribute('aria-busy');
}

if (sesion.requerirLogin()) cargar();
