// Fallas típicas de internet (idea B, permiso parametros.editar, el admin): las carga con la fuente obligatoria
// (POST /api/admin/fallas-tipicas). Al elegir marca y modelo se ven las que ese modelo ya tiene, para no repetirlas
// (GET /api/fallas-tipicas). Los mecánicos las votan desde el checklist.
import * as inspecciones from '../api/inspecciones.js';
import * as fallas from '../servicios/fallas.js';
import * as insp from '../servicios/inspecciones.js';
import * as marcas from '../servicios/marcas.js';
import * as formularios from '../servicios/formularios.js';
import * as sesion from '../servicios/sesion.js';
import { el } from '../servicios/vistas.js';

const form = document.getElementById('form-falla');
const aviso = document.getElementById('aviso');
const cargadas = document.getElementById('cargadas');

form.elements.item_codigo.append(...insp.CHECKLIST.map((c) => el('option', { value: c.codigo }, c.nombre)));

// Las fallas que ya tiene el modelo elegido (o nada, si todavía no eligió)
function mostrarCargadas(d) {
    cargadas.hidden = false;
    document.getElementById('cargadas-titulo').textContent = `Las que ya tiene el ${d.marca} ${d.modelo}`;
    document.getElementById('cargadas-explicacion').textContent = fallas.explicacion(d);
    document.getElementById('cargadas-lista').replaceChildren(...(d.fallas.length || d.medidas.length
        ? fallas.lista(d)
        : [el('p', { class: 'suave' }, 'Todavía no tiene ninguna cargada.')]));
}

async function verModelo() {
    const { marca, modelo } = form.elements;
    if (!marca.value || !modelo.value) {
        cargadas.hidden = true;
        return;
    }
    try {
        mostrarCargadas((await inspecciones.fallasTipicas(marca.value, modelo.value)).fallas_tipicas);
    } catch {
        cargadas.hidden = true; // sin la lista igual se puede cargar
    }
}

form.elements.marca.addEventListener('change', () => { cargadas.hidden = true; });
form.elements.modelo.addEventListener('change', verModelo);

formularios.alEnviar(form, async (datos) => {
    const r = await inspecciones.cargarFallaInternet(datos);
    const d = r.fallas_tipicas;
    // Se queda con la marca y el modelo, por si quiere cargar otra del mismo
    ['item_codigo', 'titulo', 'descripcion', 'fuente_url'].forEach((campo) => { form.elements[campo].value = ''; });
    mostrarCargadas(d);
    aviso.textContent = `Cargamos la falla. El ${d.marca} ${d.modelo} tiene ${d.fallas.length} fallas típicas; los mecánicos ya la pueden votar.`;
    aviso.hidden = false;
    aviso.scrollIntoView();
});

if (sesion.requerirPermiso('parametros.editar')) {
    marcas.conectar(form.elements.marca, form.elements.modelo).catch(() => {});
}
