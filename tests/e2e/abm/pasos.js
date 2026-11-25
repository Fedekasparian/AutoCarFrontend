// Navegación del formulario por pasos de publicar.html ("Paso 3 de 6 · Fotos"): va hacia adelante o atrás
// hasta el paso cuyo nombre empieza con `nombre`. "Siguiente" guarda el paso en el que está.
import { expect } from '@playwright/test';

const PASOS = ['Vehículo', 'Ficha técnica', 'Fotos', 'Precio', 'Ubicación', 'Revisi'];

export async function irAlPaso(page, nombre) {
    const destino = PASOS.findIndex((p) => p.toLowerCase().startsWith(nombre.toLowerCase().slice(0, 5)));
    if (destino < 0) throw new Error(`Paso desconocido: ${nombre}`);
    const texto = page.locator('#pasos-texto');
    await expect(texto).toBeVisible({ timeout: 60_000 });
    for (let i = 0; i < 8; i++) {
        const actual = Number((await texto.textContent()).match(/Paso (\d+)/)[1]) - 1;
        if (actual === destino) return;
        await page.click(actual < destino ? '#paso-siguiente' : '#paso-anterior');
        await expect(texto).not.toContainText(`Paso ${actual + 1} `);
    }
    throw new Error(`No llegó al paso ${nombre}`);
}
