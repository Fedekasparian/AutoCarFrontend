// Datos comunes de las pruebas E2E.
import { test, expect } from '@playwright/test';

// Las páginas cuelgan de /front/ (Vercel sirve la raíz del repo).
export const pagina = (ruta) => `/front/${ruta}`;

// Las pruebas que crean datos nunca corren contra producción.
export const esProduccion = /autocar-zeta\.vercel\.app/.test(process.env.BASE_URL || '');
export function soloFueraDeProduccion() {
    test.skip(esProduccion, 'Esta prueba escribe datos: corre contra dev o local, nunca contra producción.');
}

// Email único por corrida, para que el registro no choque con uno anterior.
export const emailNuevo = () => `e2e+${Date.now()}${Math.floor(Math.random() * 1000)}@autocar.test`;
export const PASSWORD = 'Prueba1234';

// Desde el 14/11 una cuenta personal nueva tiene que contestar "¿Para qué buscás el auto?" antes de seguir:
// el sitio la lleva a preferencias.html. Contesta "Para la familia" y espera volver a donde iba.
export async function contestarPreferencias(page) {
    await expect(page).toHaveURL(/preferencias\.html/);
    await page.check('input[name="uso"][value="familia"]');
    await page.click('#form-preferencias button[type="submit"]');
    await expect(page).not.toHaveURL(/preferencias\.html/);
}
