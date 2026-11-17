// Selects de marca y modelo con la lista del catálogo (GET /api/marcas-modelos, la misma de Publicar).
// Los usan el pedido de inspección (opcional) y el checklist del mecánico (obligatorio para firmar): con la marca y
// el modelo se miden las fallas típicas de cada modelo (idea B), con la misma clave que el comparador.
import { marcasModelos } from '../api/vehiculos.js';
import { el } from './vistas.js';

let lista = null; // se pide una sola vez por página

async function catalogo() {
    lista ??= (await marcasModelos()).marcas;
    return lista;
}

// Llena los dos selects y deja elegidos marca y modelo si vienen. Al cambiar la marca se cargan sus modelos.
// textoVacio: la primera opción de cada select ("No sé", "Elegí la marca"…).
export async function conectar(selectMarca, selectModelo, { marca = null, modelo = null, textoVacio = 'Elegí' } = {}) {
    const marcas = await catalogo();
    const vacia = (texto) => el('option', { value: '' }, texto);
    selectMarca.replaceChildren(vacia(textoVacio), ...marcas.map((m) => el('option', { value: m.marca }, m.marca)));
    const cargarModelos = (elegido = null) => {
        const deLaMarca = marcas.find((m) => m.marca === selectMarca.value)?.modelos || [];
        selectModelo.replaceChildren(vacia(textoVacio), ...deLaMarca.map((n) => el('option', { value: n }, n)));
        selectModelo.disabled = !deLaMarca.length;
        if (elegido) selectModelo.value = elegido;
    };
    selectMarca.addEventListener('change', () => cargarModelos());
    if (marca) selectMarca.value = marca;
    cargarModelos(modelo);
}
