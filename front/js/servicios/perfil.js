// "¿Para qué buscás el auto?": cuatro tarjetas, una por perfil. Con la elegida, el metabuscador ordena los autos
// para esa persona (GET /api/meta-busquedas/{id} → para_vos). Se usa en dos lugares:
// - pedirPerfil(): el cartel que aparece encima de cualquier página la primera vez que entra una cuenta personal.
//   No tiene botón de cerrar ni se va con Esc: sigue ahí hasta que elige una tarjeta (lo abre js/navegacion.js);
// - tarjetasPerfil(): las mismas tarjetas dentro de preferencias.html, para cambiarlo desde Mi cuenta.
import * as auth from '../api/auth.js';
import * as sesion from './sesion.js';
import { ruta } from './rutas.js';
import { el } from './vistas.js';

// Lo que dice cada tarjeta: el mismo orden y las mismas claves que Preferencias::USOS del back
export const PERFILES = [
    { uso: 'personal', titulo: 'Para mí', texto: 'Quiero pagar un precio justo y que no me dé sorpresas. Te mostramos primero los autos más baratos que otros parecidos.' },
    { uso: 'familia', titulo: 'Para la familia', texto: 'Quiero algo que no se rompa. Te mostramos primero los de menos kilómetros para su año.' },
    { uso: 'trabajo', titulo: 'Para trabajar', texto: 'Lo voy a usar mucho. Te mostramos primero el mejor precio, aunque tenga más kilómetros.' },
    { uso: 'aplicacion', titulo: 'Para manejar con aplicaciones', texto: 'Uber, Cabify o DiDi piden autos nuevos. Te mostramos primero los más nuevos y con pocos kilómetros.' },
];

// Las tarjetas. alElegir(uso) se llama al tocar una; "actual" queda marcada
export function tarjetasPerfil(alElegir, actual = null) {
    return el('div', { class: 'perfiles' }, ...PERFILES.map((p) => {
        const tarjeta = el('button', { class: 'perfil', type: 'button', 'aria-pressed': String(p.uso === actual) },
            el('span', { class: 'perfil__titulo' }, p.titulo),
            el('span', { class: 'perfil__texto' }, p.texto));
        tarjeta.addEventListener('click', () => alElegir(p.uso, tarjeta));
        return tarjeta;
    }));
}

// La casilla de la política de privacidad, para las cuentas que todavía no la aceptaron
export function casillaPrivacidad() {
    const enlace = el('a', { href: ruta('legales.html') + '#privacidad' }, 'la política de privacidad');
    return el('label', { class: 'casilla' },
        el('input', { type: 'checkbox', id: 'acepta_privacidad' }),
        el('span', {}, 'Leí y acepto ', enlace, '.'));
}

// Guarda el perfil elegido y actualiza la sesión. Si falta la casilla de privacidad, avisa y no guarda.
// → true si se guardó
export async function guardarPerfil(uso, contenedor, alerta) {
    const casilla = contenedor.querySelector('#acepta_privacidad');
    if (casilla && !casilla.checked) {
        alerta.textContent = 'Para seguir, aceptá la política de privacidad.';
        casilla.focus();
        return false;
    }
    alerta.textContent = '';
    try {
        const datos = { uso };
        if (casilla) datos.acepta_privacidad = true;
        const { preferencias } = await auth.guardarPreferencias(datos);
        sesion.actualizar({ usuario: { ...sesion.usuario(), preferencias, preferencias_pendientes: false, privacidad_pendiente: false } });
        return true;
    } catch (error) {
        alerta.textContent = error.message;
        return false;
    }
}

// El cartel obligatorio de la primera vez. La página de atrás se ve (borrosa) pero no se puede usar.
export function pedirPerfil(usuario) {
    const alerta = el('p', { class: 'formulario__alerta', role: 'alert' });
    const dialogo = el('dialog', { class: 'perfil-dialogo', 'aria-labelledby': 'perfil-titulo' },
        el('h2', { id: 'perfil-titulo' }, '¿Para qué buscás el auto?'),
        el('p', { class: 'suave' }, 'Con esto ordenamos los autos del buscador para vos. Lo podés cambiar cuando quieras desde Mi cuenta.'));
    let guardando = false;
    dialogo.append(tarjetasPerfil(async (uso) => {
        if (guardando) return;
        guardando = true;
        if (await guardarPerfil(uso, dialogo, alerta)) {
            dialogo.close();
            dialogo.remove();
        }
        guardando = false;
    }));
    if (usuario.privacidad_pendiente) dialogo.append(casillaPrivacidad());
    dialogo.append(alerta);
    // Esc no lo cierra: hay que elegir
    dialogo.addEventListener('cancel', (evento) => evento.preventDefault());
    document.body.append(dialogo);
    dialogo.showModal();
}
