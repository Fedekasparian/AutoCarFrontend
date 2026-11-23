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

// Después de tocar "Pedir la inspección". Con Mercado Pago activo (MP_ACTIVO=true, como en dev y producción), el pedido
// lleva a pagar: se paga en el sandbox, sin cuenta y con una tarjeta de prueba de Mercado Pago (titular "APRO" = pago
// aprobado), y al volver el sitio le pregunta al back cómo quedó el pago (verificacion.html?pago=vuelta). Hasta que
// el comprador paga, el mecánico no la puede aceptar. Sin Mercado Pago, el pedido lleva a mis-inspecciones.html?nueva=N.
// → el id de la inspección
const TARJETA_PRUEBA = { numero: '5031755734530604', vencimiento: '1130', codigo: '123', titular: 'APRO', dni: '12345678' };
export async function pagarPedido(page) {
    await page.waitForURL(/mercadopago\.com|mis-inspecciones\.html\?nueva=\d+/, { timeout: 90_000 });
    if (!/mercadopago\.com/.test(page.url())) return Number(new URL(page.url()).searchParams.get('nueva'));

    // Mercado Pago muestra dos versiones de "cómo pagar": con botones, o con opciones y "Continuar"
    const opcion = page.getByRole('radio', { name: /Tarjeta/ });
    await expect(page.getByRole('button', { name: /Tarjeta/ }).or(opcion)).toBeVisible({ timeout: 60_000 });
    if (await opcion.count()) {
        await opcion.check({ force: true });
        await page.getByRole('button', { name: 'Continuar' }).click();
    } else {
        await page.getByRole('button', { name: /Tarjeta/ }).click();
    }
    // Número, vencimiento y código van en campos seguros (iframes de Mercado Pago): hay que tipearlos tecla por tecla
    const seguro = page.frameLocator('iframe[src*="secure-fields"]');
    await seguro.nth(0).locator('#cardNumber').pressSequentially(TARJETA_PRUEBA.numero, { delay: 40 });
    await page.locator('#cardholderName').pressSequentially(TARJETA_PRUEBA.titular, { delay: 40 });
    await seguro.nth(1).locator('#expirationDate').pressSequentially(TARJETA_PRUEBA.vencimiento, { delay: 40 });
    await seguro.nth(2).locator('#securityCode').pressSequentially(TARJETA_PRUEBA.codigo, { delay: 40 });
    await page.locator('#cardholderIdentificationNumber').pressSequentially(TARJETA_PRUEBA.dni, { delay: 40 });
    await page.locator('h1').click(); // sale del último campo
    // A veces el primer "Continuar" solo valida: se vuelve a tocar hasta que pasa a las cuotas
    await expect(async () => {
        await page.getByRole('button', { name: 'Continuar' }).click();
        await page.waitForURL(/installments/, { timeout: 8000 });
    }).toPass({ timeout: 60_000 });
    await page.getByText(/^1x/).first().click();
    await page.getByRole('button', { name: 'Pagar' }).click();
    await expect(page.locator('h1')).toContainText('se acreditó', { timeout: 60_000 });
    await page.getByRole('link', { name: 'Volver a la tienda' }).click();
    await page.waitForURL(/verificacion\.html\?id=\d+/, { timeout: 90_000 });
    const id = Number(new URL(page.url()).searchParams.get('id'));
    await expect(page.locator('#resumen')).toContainText('Pagado con Mercado Pago', { timeout: 60_000 });
    return id;
}
