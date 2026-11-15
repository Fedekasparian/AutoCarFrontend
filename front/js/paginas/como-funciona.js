// Cómo funciona: completa los números de la página con los parámetros de hoy (GET /api/parametros).
// En como-funciona.html cada número es un <span data-parametro="clave"> con un texto general por si no responde.
import * as parametros from '../api/parametros.js';
import * as formato from '../servicios/formato.js';

const PESOS = ['precio_minimo', 'precio_sugerido', 'precio_maximo'];

async function completar() {
    let p;
    try {
        p = await parametros.publicos();
    } catch {
        return; // queda el texto general
    }
    // Lo del mecánico es lo que no se queda AutoCar
    const valores = { ...p, parte_mecanico: 100 - p.comision_autocar };
    document.querySelectorAll('[data-parametro]').forEach((lugar) => {
        const valor = valores[lugar.dataset.parametro];
        if (valor === undefined) return;
        // Pesos con su formato; porcentajes y días como número redondo ("33,3" para un tercio)
        lugar.textContent = PESOS.includes(lugar.dataset.parametro)
            ? formato.precio(valor)
            : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(valor);
    });
}

completar();
