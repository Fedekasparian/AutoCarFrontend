// Estadísticas del admin (POST /api/eventos): qué recomendaciones vio y tocó el comprador, para el embudo
// "vio → tocó Mandale un mecánico → pagó la inspección". Solo cuentas personales; cada evento se manda una vez
// por sesión del navegador, juntos de a varios. Si falla no pasa nada: son datos para estadísticas.
// origen: para_vos | destacado | metabuscador | publicacion
import { post } from './cliente.js';
import * as sesion from '../servicios/sesion.js';

const YA_MANDADOS = 'autocar.eventos';
const pendientes = [];
let espera;

function yaMandado(clave) {
    try {
        const mandados = new Set(JSON.parse(sessionStorage.getItem(YA_MANDADOS) || '[]'));
        if (mandados.has(clave)) return true;
        mandados.add(clave);
        sessionStorage.setItem(YA_MANDADOS, JSON.stringify([...mandados].slice(-500)));
    } catch {
        // Sin almacenamiento: se manda igual
    }
    return false;
}

function mandar() {
    while (pendientes.length) {
        post('/api/eventos', { eventos: pendientes.splice(0, 50) }).catch(() => {});
    }
}

// tipo: 'mostrado' (la recomendación estuvo en pantalla) o 'tocado' (tocó "Mandale un mecánico" ahí)
export function registrar(tipo, origen, ref = null) {
    if (sesion.usuario()?.rol !== 'usuario') return;
    if (yaMandado(`${tipo}|${origen}|${ref ?? ''}`)) return;
    pendientes.push({ tipo, origen, ref });
    clearTimeout(espera);
    espera = setTimeout(mandar, 800);
}
