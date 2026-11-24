// Listado de vehículos con filtros (home.html y buscar.html).
// Los filtros viajan en la URL (formularios GET), así que se puede recargar, compartir o volver atrás.
// Mientras carga se ven fichas grises (esqueletos); arriba del listado, un chip por filtro aplicado para sacarlo.
import { carrusel } from '../servicios/carrusel.js';
import * as vehiculos from '../api/vehiculos.js';
import * as corazones from '../servicios/corazones.js';
import * as formato from '../servicios/formato.js';
import * as vistas from '../servicios/vistas.js';
import { ruta } from '../servicios/rutas.js';
import { PERFILES } from '../servicios/perfil.js';

// orden: sin valor = "Más relevantes" (el mismo cálculo que el metabuscador, con el perfil de quien mira); recientes = los más nuevos
const FILTROS = ['q', 'zona', 'marca', 'combustible', 'precio_max', 'vendedor', 'orden', 'page'];

const params = new URLSearchParams(window.location.search);
const filtros = Object.fromEntries(FILTROS.map((f) => [f, params.get(f) || '']));

const grilla = document.getElementById('resultados');
const total = document.getElementById('resultados-total');
const lugarPaginacion = document.getElementById('paginacion');
const { el } = vistas;

// Los formularios muestran los filtros que están aplicados.
function completarFormularios() {
    document.querySelectorAll('form[method="get"]').forEach((formulario) => {
        FILTROS.forEach((f) => {
            const control = formulario.elements[f];
            if (control && filtros[f]) control.value = filtros[f];
        });
    });
}

// En Explorar se pueden combinar criterios antes de enviarlos juntos.
function prepararBarra(formulario) {
    if (!formulario) return;
    const segmentos = [...formulario.querySelectorAll('details')];
    const actualizar = () => segmentos.forEach(segmento => {
        const resumen = segmento.querySelector('[data-resumen]');
        const valores = [...segmento.querySelectorAll('input[type=search], input:checked, select')]
            .filter(control => control.value)
            .map(control => {
                if (control.type === 'radio') return control.labels[0].textContent.trim();
                if (control.tagName === 'SELECT') return control.selectedOptions[0].textContent;
                return control.value;
            });
        resumen.textContent = valores.join(' · ') || resumen.dataset.porDefecto;
    });
    for (const segmento of segmentos) {
        const resumen = segmento.querySelector('[data-resumen]');
        resumen.dataset.porDefecto = resumen.textContent;
    }
    actualizar();
    formulario.addEventListener('input', actualizar);
    formulario.addEventListener('change', actualizar);
    document.addEventListener('click', evento => {
        for (const segmento of segmentos) {
            if (segmento.open && !segmento.contains(evento.target)) segmento.open = false;
        }
    });
    formulario.addEventListener('keydown', evento => {
        const segmento = evento.target.closest('details[open]');
        if (evento.key === 'Escape' && segmento) {
            segmento.open = false;
            segmento.querySelector('summary').focus();
        }
    });
    formulario.addEventListener('submit', evento => {
        evento.preventDefault();
        const parametros = new URLSearchParams();
        for (const [nombre, valor] of new FormData(formulario)) {
            if (valor.trim()) parametros.set(nombre, valor.trim());
        }
        const destino = new URL(formulario.action);
        destino.search = parametros.toString();
        window.location.assign(destino);
    });
    return actualizar;
}

// Buscar en escritorio: los filtros quedan abiertos en el panel de la izquierda
function abrirPanelEnEscritorio() {
    const panel = document.querySelector('.vista-buscar details.recuadro');
    if (!panel) return;
    const escritorio = matchMedia('(min-width: 1100px)');
    const ajustar = () => { if (escritorio.matches) panel.open = true; };
    ajustar();
    panel.addEventListener('toggle', ajustar); // en escritorio no se cierra
    escritorio.addEventListener?.('change', ajustar);
}

// Un chip por filtro aplicado; la cruz lleva a la misma búsqueda sin ese filtro
function chipsDeFiltros() {
    const textos = {
        q: (v) => `“${v}”`,
        zona: (v) => v,
        marca: (v) => v,
        combustible: (v) => formato.combustible(v),
        precio_max: (v) => `Hasta ${formato.precio(Number(v))}`,
        vendedor: (v) => (v === 'empresa' ? 'Solo concesionarias' : 'Solo particulares'),
    };
    const activos = Object.keys(textos).filter((f) => filtros[f]);
    if (!activos.length) return;
    const sin = (...quitar) => {
        const p = new URLSearchParams(window.location.search);
        [...quitar, 'page'].forEach((f) => p.delete(f));
        const query = p.toString();
        return query ? `?${query}` : window.location.pathname;
    };
    const lista = el('ul', { class: 'filtros-activos', role: 'list', 'aria-label': 'Filtros aplicados' },
        ...activos.map((f) => el('li', {},
            el('a', { class: 'chip-filtro', href: sin(f), 'aria-label': `Sacar el filtro ${textos[f](filtros[f])}` },
                el('span', {}, textos[f](filtros[f])), el('span', { class: 'chip-filtro__cruz', 'aria-hidden': 'true' }, '×')))),
        activos.length > 1
            ? el('li', {}, el('a', { class: 'chip-filtro chip-filtro--limpiar', href: sin(...activos) }, 'Limpiar todo'))
            : null);
    total.closest('.resultados__barra').after(lista);
}

async function cargarZonas() {
    const grupo = document.getElementById('explorar-zonas');
    if (!grupo) return;
    const opcion = zona => el('label', { class: 'explorar-opcion' },
        el('input', { type: 'radio', name: 'zona', value: zona, checked: zona === filtros.zona }),
        el('span', {}, zona));
    if (filtros.zona) grupo.append(opcion(filtros.zona));
    try {
        const { zonas, seleccionada } = await vehiculos.zonas(filtros.zona);
        const nombres = new Set([...zonas, seleccionada].filter(Boolean));
        for (const zona of [...nombres].sort((a, b) => a.localeCompare(b, 'es'))) {
            if (zona !== filtros.zona) grupo.append(opcion(zona));
        }
    } catch {
        // La zona de la URL queda disponible aunque la API no responda.
    }
}

async function cargarMarcas() {
    const selects = document.querySelectorAll('select[name="marca"]');
    if (!selects.length) return;
    if (filtros.marca) selects.forEach(select => select.add(new Option(filtros.marca, filtros.marca, true, true)));
    try {
        const { marcas } = await vehiculos.marcas();
        selects.forEach((select) => {
            select.append(...marcas.filter(m => m !== filtros.marca).map((m) => el('option', { value: m }, m)));

        });
    } catch {
        // Sin marcas el filtro queda en "Marca" y el listado funciona igual.
    }
}

// "Más relevantes": arriba de la grilla, según qué está ordenado y el link a "¿Para qué buscás el auto?"
function introRecomendados(r) {
    const caja = document.getElementById('explorar-intro');
    if (!caja) return;
    caja.hidden = r.orden !== 'relevantes' || !r.items.length;
    if (caja.hidden) return;
    const nombre = PERFILES.find((p) => p.uso === r.perfil)?.titulo;
    const cambiar = el('a', { href: ruta('preferencias.html') }, nombre ? 'Cambiar' : 'Contanos para qué buscás el auto');
    caja.replaceChildren(...(nombre
        ? [el('strong', {}, 'Ordenados para vos'), ` según lo que nos contaste: "${nombre}". `, cambiar]
        : [el('strong', {}, 'Ordenados por mejor precio frente a autos parecidos'), '. ', cambiar, ' y te los ordenamos para vos.']));
}

function textoTotal(cantidad) {
    const base = cantidad === 1 ? '1 publicación' : `${cantidad} publicaciones`;
    return filtros.q ? `${base} para "${filtros.q}"` : base;
}

// "Cargando…" solo para lectores de pantalla (los esqueletos ya lo muestran); si a los 5 segundos sigue,
// se hace visible con la aclaración del servidor dormido.
function estadoDeCarga() {
    const nodo = vistas.cargando();
    nodo.classList.add('solo-lector');
    setTimeout(() => nodo.classList.remove('solo-lector'), 5000);
    return nodo;
}

async function cargarListado() {
    grilla.setAttribute('aria-busy', 'true');
    grilla.replaceChildren(...vistas.esqueletoFichas(8));
    const estado = estadoDeCarga();
    grilla.after(estado);
    try {
        const r = await vehiculos.listar(filtros);
        estado.remove();
        grilla.removeAttribute('aria-busy');
        total.textContent = textoTotal(r.total);
        introRecomendados(r);
        if (!r.items.length) {
            grilla.replaceChildren();
            grilla.after(vistas.aviso('No hay publicaciones con estos filtros.',
                'Probá con menos filtros o buscá por marca y modelo.'));
            return;
        }
        const fichas = r.items.map(vistas.fichaVehiculo);
        let lista = grilla;
        if (grilla.dataset.carrusel) {
            const seccion = carrusel(grilla.dataset.carrusel, fichas, { id: grilla.id });
            lista = seccion.querySelector('ul');
            grilla.replaceWith(seccion);
            lista.before(document.getElementById('explorar-intro'));
        } else {
            fichas.forEach((li, i) => li.style.setProperty('--n', String(i)));
            grilla.replaceChildren(...fichas);
            grilla.classList.add('grilla-vehiculos--entra');
        }
        lugarPaginacion.replaceWith(Object.assign(vistas.paginacion(r.pagina, r.paginas), { id: 'paginacion' }));
        corazones.poner(lista, r.items);
    } catch (error) {
        grilla.replaceChildren();
        grilla.removeAttribute('aria-busy');
        estado.replaceWith(vistas.avisoDeError(error));
        total.textContent = '';
    }
}

const zonasCargadas = cargarZonas();
const marcasCargadas = cargarMarcas();
completarFormularios();
const actualizarBarra = prepararBarra(document.querySelector('.explorar-busqueda'));
abrirPanelEnEscritorio();
chipsDeFiltros();
zonasCargadas.then(() => actualizarBarra?.());
marcasCargadas.then(() => actualizarBarra?.());
cargarListado();
