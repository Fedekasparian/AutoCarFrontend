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

const UNIDADES = { porcentaje: '%', pesos: '$', dias: 'días', veces: 'veces', horas: 'horas', puntos: 'puntos' };
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

// La fórmula de "Recomendados" (parámetros peso_<perfil>_<criterio>): una grilla perfil × criterio en vez de 16 campos
const PERFILES = { personal: 'Uso personal', familia: 'Familia', trabajo: 'Trabajo', aplicacion: 'Aplicación (Uber, Cabify)' };
const CRITERIOS = { precio: 'Precio', km: 'Kilómetros', dias: 'Días publicado', anio: 'Año' };
// Lo que se ve abajo de la grilla al pasar el mouse (o tocar) una columna: qué mide y qué pasa si le subís el peso
const AYUDA_CRITERIOS = {
    precio: 'Compara el precio del auto con el de autos parecidos. Más peso: suben los autos más baratos que el resto.',
    km: 'Compara los kilómetros del auto con los típicos de autos parecidos. Más peso: suben los autos con menos km.',
    dias: 'Cuántos días lleva publicado desde que lo vimos por primera vez. Más peso: suben los avisos viejos (más margen para negociar).',
    anio: 'Compara el año del auto con el año típico de la búsqueda. Más peso: suben los autos más nuevos.',
};
const esPeso = (p) => p.clave.startsWith('peso_');

function formula(pesos) {
    if (!pesos.length) return null;
    const porClave = Object.fromEntries(pesos.map((p) => [p.clave, p]));
    const celda = (perfil, criterio) => {
        const p = porClave[`peso_${perfil}_${criterio}`];
        if (!p) return el('td', {}, '—');
        return el('td', {}, el('input', {
            class: 'campo__input formula__peso', id: p.clave, name: p.clave, type: 'number', required: true,
            min: p.minimo, max: p.maximo, step: 'any', inputmode: 'decimal', value: Number(p.valor.toFixed(2)),
            'data-criterio': criterio, 'aria-label': `${PERFILES[perfil]}: peso de ${CRITERIOS[criterio].toLowerCase()}`, 'aria-describedby': `${p.clave}-error`,
        }), el('span', { class: 'campo__error', id: `${p.clave}-error` }));
    };
    const { minimo, maximo } = pesos[0];
    const textoInicial = 'Pasá el mouse por una columna (o tocá un casillero) para ver qué mide y qué pasa si le subís el peso.';
    const ayuda = el('p', { class: 'formula__ayuda', 'aria-live': 'polite' }, textoInicial);
    const tabla = el('table', { class: 'tabla formula__tabla' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Perfil'), ...Object.entries(CRITERIOS).map(([criterio, c]) => el('th', { class: 'formula__criterio', 'data-criterio': criterio, tabindex: 0 }, c)))),
        el('tbody', {}, ...Object.entries(PERFILES).map(([perfil, nombre]) => el('tr', {},
            el('th', { scope: 'row' }, nombre), ...Object.keys(CRITERIOS).map((criterio) => celda(perfil, criterio))))));
    const explicar = (evento) => {
        const criterio = evento.target.closest('[data-criterio]')?.dataset.criterio;
        if (criterio) ayuda.replaceChildren(el('strong', {}, `${CRITERIOS[criterio]}: `), AYUDA_CRITERIOS[criterio]);
    };
    tabla.addEventListener('mouseover', explicar);
    tabla.addEventListener('focusin', explicar);
    return el('section', { class: 'pila formula', 'aria-labelledby': 'formula-titulo' },
        el('h2', { id: 'formula-titulo' }, 'Fórmula de "Recomendados"'),
        el('p', { class: 'campo__ayuda' }, `Cuánto pesa cada cosa al ordenar el metabuscador según para qué busca el auto cada comprador: de ${minimo} (no cuenta) a ${maximo} (lo que más importa). Mirá en Estadísticas → Recomendaciones si "Recomendados" convierte y ajustalo acá.`),
        el('p', { class: 'formula__cuenta' }, 'Puntaje = (peso precio × precio + peso km × km + peso días × días + peso año × año) ÷ suma de los pesos'),
        comoSeCalcula(),
        el('div', { class: 'tabla-desplazable' }, tabla),
        ayuda);
}

// Cómo sale el puntaje de cada auto (MetaBusqueda\ParaVos del back). Los topes son fijos; los pesos, los de la grilla.
function comoSeCalcula() {
    return el('details', { class: 'formula__explicacion' },
        el('summary', {}, 'Cómo se calcula el puntaje de cada auto'),
        el('p', {}, 'Cada auto del metabuscador se compara con autos parecidos (mismo modelo y sitio, año ±2 y km ±30 %). Se miran cuatro cosas y cada una da un valor entre −1 (en contra) y 1 (a favor):'),
        el('ul', {},
            el('li', {}, el('strong', {}, 'Precio: '), '% más barato que los parecidos ÷ 20. 20 % más barato (o más) suma 1; 20 % más caro resta 1.'),
            el('li', {}, el('strong', {}, 'Kilómetros: '), '(km típicos de los parecidos − km del auto) ÷ km típicos ÷ 0,5. La mitad de km (o menos) suma 1.'),
            el('li', {}, el('strong', {}, 'Días publicado: '), 'días desde que apareció ÷ 60. Con 60 días o más suma 1 (hay margen para negociar).'),
            el('li', {}, el('strong', {}, 'Año: '), '(año del auto − año típico de la búsqueda) ÷ 5. 5 años más nuevo suma 1; 5 más viejo resta 1.')),
        el('p', {}, 'Da entre −1 y 1. "Recomendado" ordena de mayor a menor y el motivo que ve el comprador son las dos cosas que más suman. Ejemplo para "Familia" (2, 3, 1, 1): un auto 10 % más barato (0,5), con 25 % menos km (0,5), 30 días publicado (0,5) y del año típico (0) da (2×0,5 + 3×0,5 + 1×0,5 + 1×0) ÷ 7 = 0,43.'),
        el('p', {}, 'Si un perfil tiene todos los pesos en 0, sus autos no llevan puntaje y se ordenan por la diferencia con el precio típico.'));
}

// Cómo se arma el ranking de los mecánicos (Inspecciones\Ranking del back), con los valores de hoy de Parámetros
// (ranking_*, se cambian en los campos de arriba). El 5 es fijo: el sitio dibuja cinco estrellas.
function rankingMecanicos(parametros) {
    const valor = Object.fromEntries(parametros.map((p) => [p.clave, p.valor]));
    const veces = valor.ranking_veces_reclamo ?? 2;
    const minimo = valor.ranking_minimo_firmadas ?? 3;
    const buena = valor.ranking_especialidad_buena ?? 2.5;
    const coma = (x) => String(Number(x.toFixed(2))).replace('.', ',');
    const ejemplo = Math.max(0, 5 * (1 - (veces * 1) / 10));
    const caja = document.getElementById('ranking-mecanicos') ?? el('section', { class: 'pila', id: 'ranking-mecanicos', 'aria-labelledby': 'ranking-titulo' });
    caja.replaceChildren(
        el('h2', { id: 'ranking-titulo' }, 'Cómo se arma el ranking de los mecánicos'),
        el('p', { class: 'campo__ayuda' }, 'Sale solo de cómo trabajó cada mecánico, nunca de un pago. Los números se cambian en los campos "Ranking de mecánicos" de arriba.'),
        el('p', { class: 'formula__cuenta' }, `Puntaje = 5 × (1 − ${coma(veces)} × reclamos que procedieron ÷ inspecciones firmadas), con mínimo 0`),
        el('ul', {},
            el('li', {}, `Con menos de ${coma(minimo)} inspecciones firmadas no tiene puntaje: aparece como "Nuevo en la red" y va al final.`),
            el('li', {}, `Ejemplo: 10 firmadas y 1 reclamo que procedió → 5 × (1 − ${coma(veces)} × 1 ÷ 10) = ${coma(ejemplo)}.`),
            el('li', {}, 'Orden del ranking general: mayor puntaje primero; si empatan, el que más firmó.'),
            el('li', {}, `Al pedir una inspección de un auto, primero van los buenos en ese modelo, después los buenos en esa marca, después los que no revisaron ninguno y al final los que tuvieron reclamos en esos autos. "Bueno" = la misma cuenta, pero solo con las inspecciones de ese modelo (o de la marca), con ${coma(buena)} o más.`)));
    return caja;
}

// El ranking de autos recomendados de cada tipo de usuario: qué parte del puntaje es cada cosa con los pesos de hoy
// (peso ÷ suma de los pesos de ese perfil). Se rearma cada vez que se guardan los parámetros.
function rankingAutos(pesos) {
    const valor = Object.fromEntries(pesos.map((p) => [p.clave, p.valor]));
    const caja = document.getElementById('ranking-autos') ?? el('section', { class: 'pila', id: 'ranking-autos', 'aria-labelledby': 'ranking-autos-titulo' });
    const perfiles = Object.entries(PERFILES).map(([perfil, nombre]) => {
        const partes = Object.entries(CRITERIOS).map(([criterio, texto]) => [texto, valor[`peso_${perfil}_${criterio}`] ?? 0]);
        const suma = partes.reduce((s, [, v]) => s + v, 0);
        if (!suma) return el('li', {}, el('strong', {}, `${nombre}: `), 'todos los pesos en 0, se ordena por la diferencia con el precio típico.');
        const ordenadas = partes.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        const sinPeso = partes.filter(([, v]) => !v).map(([t]) => t.toLowerCase());
        const cuenta = `Puntaje = (${partes.filter(([, v]) => v > 0).map(([t, v]) => `${Number(v.toFixed(2))} × ${t.toLowerCase()}`).join(' + ')}) ÷ ${Number(suma.toFixed(2))}`;
        return el('li', {}, el('strong', {}, `${nombre}: `),
            ordenadas.map(([t, v]) => `${t.toLowerCase()} ${Math.round((v / suma) * 100)} % (peso ${Number(v.toFixed(2))})`).join(' · '),
            sinPeso.length ? `. No cuenta: ${sinPeso.join(', ')}.` : '.',
            el('span', { class: 'campo__ayuda' }, ` Prioriza ${ordenadas[0][0].toLowerCase()}.`),
            el('p', { class: 'formula__cuenta' }, cuenta));
    });
    caja.replaceChildren(
        el('h2', { id: 'ranking-autos-titulo' }, 'Cómo se arma el ranking de autos recomendados'),
        el('p', { class: 'campo__ayuda' }, 'En el metabuscador, "Recomendado" ordena los autos por el puntaje de la fórmula de arriba, con los pesos del tipo de usuario del comprador ("¿Para qué buscás el auto?"). Cada porcentaje es qué parte del puntaje decide esa cosa (su peso ÷ la suma de los pesos de ese perfil). Un comprador sin perfil ve los autos ordenados por la diferencia con el precio típico.'),
        el('ul', {}, ...perfiles));
    return caja;
}

function mostrar({ parametros, cambios }) {
    actuales = {};
    const unidades = {};
    parametros.forEach((p) => {
        actuales[p.clave] = p.valor;
        unidades[p.clave] = p.unidad;
    });
    campos.replaceChildren(...parametros.filter((p) => !esPeso(p)).map(campoDe), formula(parametros.filter(esPeso)) ?? '');
    form.after(rankingMecanicos(parametros));
    if (parametros.some(esPeso)) form.after(rankingAutos(parametros.filter(esPeso)));

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
