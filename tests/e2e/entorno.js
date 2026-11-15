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
// encima de la página aparece el cartel con los cuatro perfiles y no se va hasta elegir uno. Elige "Para la familia".
export async function contestarPreferencias(page) {
    const cartel = page.locator('dialog.perfil-dialogo');
    await expect(cartel).toBeVisible();
    await cartel.getByRole('button', { name: /Para la familia/ }).click();
    await expect(cartel).toHaveCount(0);
}
