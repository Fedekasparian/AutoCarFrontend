import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fallas from '../../front/js/servicios/fallas.js';

const modelo = (mi_voto, confirman, descartan) => ({
    marca: 'Volkswagen', modelo: 'Gol Trend',
    fallas: [
        { id: 1, titulo: 'Bomba de agua', mi_voto, votos: { confirman, descartan } },
        { id: 2, titulo: 'Embrague', mi_voto: null, votos: { confirman: 0, descartan: 0 } },
    ],
});

test('votar por primera vez suma un voto de ese lado', () => {
    const d = fallas.conVoto(modelo(null, 1, 0), 1, true);
    assert.deepEqual(d.fallas[0].votos, { confirman: 2, descartan: 0 });
    assert.equal(d.fallas[0].mi_voto, true);
});

test('cambiar el voto lo pasa al otro lado, no suma dos veces', () => {
    const d = fallas.conVoto(modelo(true, 2, 0), 1, false);
    assert.deepEqual(d.fallas[0].votos, { confirman: 1, descartan: 1 });
    assert.equal(d.fallas[0].mi_voto, false);
});

test('votar lo mismo otra vez no cambia nada', () => {
    const antes = modelo(true, 2, 0);
    assert.deepEqual(fallas.conVoto(antes, 1, true), antes);
});

test('no toca las otras fallas ni el objeto original', () => {
    const antes = modelo(null, 0, 0);
    const d = fallas.conVoto(antes, 1, false);
    assert.equal(d.fallas[1], antes.fallas[1]);
    assert.deepEqual(antes.fallas[0].votos, { confirman: 0, descartan: 0 });
    assert.equal(antes.fallas[0].mi_voto, null);
});
