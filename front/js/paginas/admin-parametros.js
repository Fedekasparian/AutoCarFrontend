// Parámetros del negocio (permiso parametros.editar, el admin): comisión de AutoCar, parte al fondo, tope de la
// compensación, días para reclamar y precio de la inspección. GET y PUT /api/admin/parametros.
// Los campos salen de la base: si se agrega un parámetro, aparece solo. El back valida los límites otra vez.
import * as api from '../api/parametros.js';
import * as formato from '../servicios/formato.js';
import * as formularios from '../servicios/formularios.js';
import * as sesion from '../servicios/sesion.js';
import { el } from '../servicios/vistas.js';

const form = document.getElementById('form-parametros');
const campos = document.getElementById('campos');
const listaCambios = document.getElementById('cambios');
const aviso = document.getElementById('aviso');

const UNIDADES = { porcentaje: '%', pesos: '$', dias: 'días', veces: 'veces el precio' };
let actuales = {}; // clave → valor que tiene hoy, para mandar solo lo que cambió

// Un valor con su unidad: "23 %", "$100.000", "15 días"
function conUnidad(valor, unidad) {
    if (unidad === 'pesos') return formato.precio(valor);
    return `${Number(valor.toFixed(2))} ${UNIDADES[unidad]}`;
}

function campoDe(p) {
    const ayuda = `Entre ${conUnidad(p.minimo, p.unidad)} y ${conUnidad(p.maximo, p.unidad)}.`
        + (p.cambiado_por ? ` Último cambio: ${p.cambiado_por}, ${formato.fecha(p.updated_at)}.` : '');
    const decimales = p.unidad === 'porcentaje' || p.unidad === 'veces';
    return el('div', { class: 'campo' },
        el('label', { class: 'campo__etiqueta', for: p.clave }, `${p.descripcion} (${UNIDADES[p.unidad]})`),
        el('input', {
            class: 'campo__input', id: p.clave, name: p.clave, type: 'number', required: true,
            min: p.minimo, max: p.maximo, step: decimales ? 'any' : 1, inputmode: decimales ? 'decimal' : 'numeric',
            value: Number(p.valor.toFixed(4)), 'aria-describedby': `${p.clave}-ayuda ${p.clave}-error`,
        }),
        el('span', { class: 'campo__ayuda', id: `${p.clave}-ayuda` }, ayuda),
        el('span', { class: 'campo__error', id: `${p.clave}-error` }));
}

function mostrar({ parametros, cambios }) {
    actuales = {};
    const unidades = {};
    parametros.forEach((p) => {
        actuales[p.clave] = p.valor;
        unidades[p.clave] = p.unidad;
    });
    campos.replaceChildren(...parametros.map(campoDe));

    const nombres = Object.fromEntries(parametros.map((p) => [p.clave, p.descripcion]));
    listaCambios.replaceChildren(...(cambios.length ? cambios.map((c) => el('li', { class: 'fila' },
        el('span', { class: 'fila__cuerpo' },
            el('span', { class: 'fila__titulo' }, nombres[c.clave] || c.clave), el('br'),
            el('span', { class: 'fila__meta' },
                `${conUnidad(c.valor_anterior, unidades[c.clave])} → ${conUnidad(c.valor_nuevo, unidades[c.clave])}`
                + ` · ${c.usuario || 'Alguien que ya no está'} · ${formato.fechaHora(c.fecha)}`))))
        : [el('li', { class: 'suave' }, 'Todavía nadie cambió nada.')]));
}

formularios.alEnviar(form, async (datos) => {
    // Solo los que cambiaron
    const valores = {};
    Object.entries(datos).forEach(([clave, texto]) => {
        const valor = Number(texto);
        if (valor !== actuales[clave]) valores[clave] = valor;
    });
    if (!Object.keys(valores).length) {
        formularios.alerta(form, 'No cambiaste ningún valor.');
        return;
    }
    mostrar(await api.guardar(valores));
    aviso.textContent = 'Guardamos los cambios. Las inspecciones nuevas ya se calculan con estos valores.';
    aviso.hidden = false;
    aviso.scrollIntoView();
});

async function iniciar() {
    try {
        mostrar(await api.todos());
    } catch (error) {
        aviso.textContent = error.message;
        aviso.hidden = false;
    }
}

if (sesion.requerirPermiso('parametros.editar')) iniciar();
