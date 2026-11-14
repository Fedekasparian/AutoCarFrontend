// "¿Para qué buscás el auto?" (obligatoria la primera vez), la política de privacidad y los parámetros del admin.
// Crea cuentas nuevas: solo dev o local.
//   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD  (sin ellas se saltea la prueba de los parámetros)
import { test, expect } from '@playwright/test';
import { pagina, soloFueraDeProduccion, emailNuevo, PASSWORD } from './entorno.js';

soloFueraDeProduccion();

const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };

async function llenarRegistro(page) {
    await page.goto(pagina('pages/auth/registro.html'));
    await page.fill('#nombre', 'Preferencias E2E');
    await page.fill('#email', emailNuevo());
    await page.fill('#password', PASSWORD);
    await page.fill('#password_confirm', PASSWORD);
}

test('sin aceptar la política de privacidad no se crea la cuenta', async ({ page }) => {
    await llenarRegistro(page);
    await page.click('#form-registro button[type="submit"]');
    await expect(page.locator('#acepta_privacidad-error')).not.toBeEmpty();
    await expect(page).toHaveURL(/registro\.html/);
});

test('una cuenta nueva no puede seguir hasta contestar, y después lo ve en Mi cuenta', async ({ page }) => {
    await llenarRegistro(page);
    await page.check('#acepta_privacidad');
    await page.click('#form-registro button[type="submit"]');
    await expect(page).toHaveURL(/preferencias\.html/);

    // Aunque vaya a otra página, vuelve a la pregunta
    await page.goto(pagina('pages/vehiculos/favoritos.html'));
    await expect(page).toHaveURL(/preferencias\.html/);

    // Sin elegir para qué lo busca no se guarda
    await page.click('#form-preferencias button[type="submit"]');
    await expect(page.locator('#uso-error')).not.toBeEmpty();

    await page.check('input[name="uso"][value="trabajo"]');
    await page.selectOption('#tipo', 'pickup');
    await page.click('#form-preferencias button[type="submit"]');
    // Vuelve a la página que quería ver
    await expect(page).toHaveURL(/vehiculos\/favoritos\.html/); // no alcanza con ?volver=favoritos.html

    await page.goto(pagina('pages/auth/cuenta.html'));
    await expect(page.locator('#cuenta-preferencias')).toContainText('Para trabajar');
    await expect(page.locator('#cuenta-preferencias')).toContainText('Pickup');
});

test('el admin cambia un parámetro y queda anotado', async ({ page }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD.');
    await page.goto(pagina('pages/auth/login.html'));
    await page.fill('#email', ADMIN.email);
    await page.fill('#password', ADMIN.password);
    await page.click('#form-login button[type="submit"]');
    await expect(page).not.toHaveURL(/login\.html/);

    await page.goto(pagina('pages/admin/admin-parametros.html'));
    const dias = page.locator('#dias_reclamo');
    await expect(dias).toBeVisible();
    const original = await dias.inputValue();
    const nuevo = original === '16' ? '17' : '16';

    // Un valor fuera de los límites no se guarda
    await page.fill('#comision_autocar', '770');
    await page.click('#form-parametros button[type="submit"]');
    await expect(page.locator('#comision_autocar-error')).not.toBeEmpty();
    await page.reload();

    await dias.fill(nuevo);
    await page.click('#form-parametros button[type="submit"]');
    await expect(page.locator('#aviso')).toContainText('Guardamos los cambios');
    await expect(page.locator('#cambios li').first()).toContainText(`${original} días → ${nuevo} días`);

    // Lo deja como estaba
    await page.locator('#dias_reclamo').fill(original);
    await page.click('#form-parametros button[type="submit"]');
    await expect(page.locator('#cambios li').first()).toContainText(`${nuevo} días → ${original} días`);
});
