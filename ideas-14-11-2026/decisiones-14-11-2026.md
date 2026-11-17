# AutoCar — Decisiones del 14/11

*14 de noviembre de 2026*

Respuestas a las dudas que quedaron abiertas en `ideas-14-11-2026.md` después de la devolución del profe del 13/11. Todo lo que dijo el profe quedó cubierto: lo que él ya cerró se hace como lo pidió y lo que dejó abierto se decide acá.

**Estado al 17/11:** ya están programados (en `dev` y `main`) la tabla de parámetros, la patente con el historial dentro del informe, el precio validado entre $70.000 y $150.000, la privacidad y la pregunta de perfil. Lo que falta está en la sección 12 y en [`PENDIENTES.md`](../PENDIENTES.md).

## 1. Patente

- La carga **siempre el mecánico**, en cada inspección, con foto de la chapa como control.
- Es **obligatoria para firmar** (no para pedir la inspección).
- A las inspecciones que ya están en dev y prod **se les inventan patentes en la migración**. No se borra la base.

### Historial del auto (decidido el 15/11)

- **No hay buscador por patente.** Si cualquiera podía ver la conclusión de una inspección hecha ayer, el siguiente comprador no pagaba la suya. Además, el comprador casi nunca tiene la patente: los avisos no la muestran.
- **El historial viene con la inspección que se paga.** El informe firmado trae las inspecciones anteriores de la misma patente (aunque hayan sido por otro aviso o en otra página): fecha, km, conclusión, taller, qué ítems no estaban OK y si un reclamo procedió. Las notas y las fotos de esos informes no.
- **El mecánico también lo ve** al cargar la patente, así sabe dónde mirar.
- Si el aviso dice menos km que una inspección anterior, el informe avisa: es la señal más clara de km bajados.
- A futuro: vender la copia del informe completo al que terminó comprando el auto (30 % del precio) y las fallas típicas por modelo.

## 2. Auto vendido

- Si el mecánico ya fue y el auto se vendió, se firma igual y el comprador original recibe un **crédito del 30 %** del precio.
- El resto queda como lo pidió el profe: turno que confirma el vendedor y se cae si el aviso pasa a pausado o vendido, y cupón solo con turno confirmado y aviso vendido dentro de las 48 h.
- Se saca "sugerir una seña".

## 3. Precio de la inspección

- **Precio sugerido: $100.000** (antes $130.000). Referencias de este año en GBA: revisión precompra con informe entre $60.000 y $100.000. No encontramos precios publicados en Luján o Mercedes.
- El precio lo pone cada mecánico, pero **validado entre $70.000 y $150.000**. Un precio muy alto infla la compensación (3×) y uno muy bajo deja al fondo sin plata.
- Mínimo, sugerido y máximo van a la tabla de parámetros.

## 4. Franquicia del mecánico

- Si un reclamo procede, el mecánico paga una **franquicia del 40 % de lo que cobró**. Se ajusta sola con el precio:

| Precio | Cobra el mecánico (77 %) | Franquicia (40 %) |
|---|---|---|
| $70.000 | $53.900 | $21.560 |
| $100.000 | $77.000 | $30.800 |
| $150.000 | $115.500 | $46.200 |

## 5. Cómo se mueve la plata

> **17/11:** los pagos al mecánico y Mercado Pago **se deciden al final**. Esta sección queda como la propuesta; no se programa hasta definir si se usa Mercado Pago.

- El comprador paga a la **cuenta de Mercado Pago de AutoCar**.
- AutoCar le paga al mecánico si está todo bien:
  - **A los 10 días**: todo menos la franquicia.
  - **A los 15 días** (fin del plazo de reclamo): la franquicia, si nadie reclamó.
- Mercado Pago le acredita a AutoCar **a los 35 días**, que es el plazo con menor comisión (~1,5 % + IVA, contra ~6,3 % + IVA al instante). Al principio AutoCar adelanta los pagos al mecánico con plata propia.
- La **comisión de Mercado Pago la absorbe AutoCar** de su 23 %. El mecánico cobra siempre su 77 % completo.
- El **fondo es un tercio del 23 % completo**, para que no dependa de la comisión.
- Transferirle al mecánico desde el saldo de Mercado Pago no tiene costo.
- Si se devuelve un pago dentro de los 90 días, Mercado Pago no cobra la comisión de ese cobro. Si la devolución es parcial, la devuelve en proporción.

**Ejemplo con $100.000:**

| Día | Qué pasa | Monto |
|---|---|---|
| 0 | El comprador paga | $100.000 |
| 10 | AutoCar le paga al mecánico (sin la franquicia) | $46.200 |
| 15 | AutoCar le paga la franquicia, si no hubo reclamo | $30.800 |
| 35 | Mercado Pago le acredita a AutoCar | ~$98.200 |

| Lo que le queda a AutoCar | Monto |
|---|---|
| 23 % | $23.000 |
| Al fondo (1/3) | −$8.000 |
| Comisión de Mercado Pago (35 días, con IVA) | −$1.800 |
| **Neto por inspección** | **~$13.200** |

**Supuesto del fondo:** un reclamo cuesta hasta ~$370.000 ($100.000 de devolución + $300.000 de compensación − $30.800 de franquicia). Con $8.000 por inspección, el fondo cierra si hay **menos de 1 reclamo cada ~46 inspecciones**.

## 6. IVA y factura

- El precio que ve el comprador es **final** (incluye IVA si corresponde).
- **Supuesto:** AutoCar y los mecánicos son monotributistas al principio, así que no hay IVA para discriminar.
- **Factura el mecánico** al comprador por el total. AutoCar cobra en su nombre y le factura al mecánico su comisión del 23 %. Es como funcionan los marketplaces, y el ingreso de AutoCar es solo su comisión.
- Para aprobar un taller, el mecánico tiene que poder facturar.
- Es un supuesto: en la realidad habría que confirmarlo con un contador.

## 7. Costo de transferencia de un auto

- En provincia de Buenos Aires es **~4 % a 5 % del valor del auto**: 1 % de arancel del Registro Automotor (mínimo $13.100), 3 % de sellos y ~$60.000 de verificación policial.
- Con un auto de $15.000.000 da ~$660.000, que coincide con la referencia del profe.
- Va a la tabla de parámetros como **porcentaje**, no como monto fijo.

## 8. Revendedor

- Puede usar el sitio como cualquiera, pero **se saca el perfil revendedor y el orden por ganancia estimada**.
- Al revendedor le importa el precio, no la inspección (no deja plata), y compite con el comprador que sí paga la inspección.

## 9. Planes

- **Comprador:** sin plan pago. El metabuscador es gratis.
- **Vendedor:** **publicar es gratis y sin límite** para todos. Hay dos estados, con suscripción o sin suscripción. La suscripción da:
  - Prioridad de sus publicaciones (destacadas).
  - Precio sugerido y tiempo estimado de venta.
- Se sacan los niveles Bronce, Plata, Oro y Platino de la maqueta del front (`front/pages/info/plan.html`).
- Es lo último que se hace, si da el tiempo.

## 10. Precios de avisos, no de ventas

Todos los precios que juntamos son los que **piden** los vendedores en los avisos, no a los que se vendieron los autos. En el doc y en el sitio se dice "precio promedio publicado" o "según X avisos publicados", no "precio de mercado".

## 11. Tabla de parámetros (primera tarea)

Es lo principal que pidió el profe: "variables y controles". Los números de negocio pasan del código a una tabla en la base que el admin edita desde su panel.

- Solo números (porcentajes, montos y días). Las reglas, como "sin patente no se firma", quedan en el código.
- Cada parámetro tiene un mínimo y un máximo permitidos, validados en el back.
- Queda registrado quién cambió cada valor, cuándo, y el valor viejo y el nuevo. Solo puede hacerlo el admin.
- Cada inspección guarda los valores con los que se calculó, así un cambio no modifica las inspecciones viejas.

| Parámetro | Valor |
|---|---|
| Parte del mecánico / AutoCar | 77 % / 23 % |
| Parte de AutoCar que va al fondo | 1/3 |
| Tope de compensación | 3 veces el precio |
| Franquicia | 40 % de lo que cobra el mecánico |
| Precio mínimo / sugerido / máximo | $70.000 / $100.000 / $150.000 |
| Días para reclamar | 15 |
| Días para el primer pago al mecánico | 10 |
| Crédito si el auto se vendió | 30 % |
| Ventana del cupón | 48 h |
| Comisión de Mercado Pago | ~1,5 % + IVA (35 días) |
| Costo de transferencia | 1 % + 3 % + verificación |
| Comisión de arreglos | 6 % (secundario) |
| Precio de la copia del informe | 30 % del precio |

## 12. Orden de trabajo

El reparto entre el grupo queda para charlar.

### Para el miércoles 18/11

1. ~~Tabla de parámetros y pantalla del admin.~~ Hecho (14/11).
2. ~~Patente, foto de la chapa, migración con patentes inventadas e historial por patente.~~ Hecho (14/11); el historial viene dentro del informe desde el 15/11.
3. ~~Precio del taller validado entre $70.000 y $150.000.~~ Hecho (14/11).
4. Auto vendido: turno, firmar igual, crédito del 30 % y cupón de 48 h.
5. ~~Pagos al mecánico como estados que marca el admin (simulados): a los 10 y a los 15 días.~~ Pasa al final (17/11), junto con Mercado Pago.
6. ~~Corregir el documento de ideas con todo lo de este archivo.~~ Hecho (17/11): `PLAN.md`, el README del modelo de negocio y `PENDIENTES.md` quedaron iguales a este archivo.

### Decidido el 17/11 (también se programa)

- **Fondo de garantía con saldo real:** suma con cada inspección y de ahí salen las compensaciones, con la franquicia del mecánico.
- **Idea A, costo total con 3 presupuestos** e **idea B, fallas típicas por modelo**: dejan de ser "fase 2" (las pide la cátedra en el mapa de capas).
- El metabuscador queda. El aviso de cambio de precio ya existe (nuevos, bajaron y retirados en los resultados y en las búsquedas guardadas, dentro del sitio).
- La integración real andando es la corrida diaria del scraper en GitHub Actions: corre sola todos los días desde el 12/11 y carga el Firestore de producción.

### Del 21/11 al 30/11

7. Foto obligatoria al marcar una falla y auditorías al azar.
8. ~~Consentimiento y política de privacidad.~~ Hecho (14/11).
9. ~~Pocas preguntas de perfil al entrar.~~ Hecho (14/11): "¿Para qué buscás el auto?".
10. Mercado Pago sandbox real y pagos al mecánico (se decide al final).
11. Suscripción del vendedor.
12. Un test E2E por cada función nueva.

## 13. Queda abierto

- Cada cuánto y cómo se hacen las auditorías al azar.
- Precio y alcance de la suscripción del vendedor.
- Si los botones de submit de los formularios pueden quedar en el HTML (preguntarle al profe).

## Fuentes

- Comisiones de Mercado Pago 2026: https://www.guiadebancos.com/ar/blog/comisiones-mercado-pago-latam-2026
- Devoluciones en Mercado Pago: https://www.mercadopago.com.ar/ayuda/devolver-un-pago_4247
- Costo de transferencia: https://www.carchecking.com.ar/guias/costo-transferencia-auto-usado-argentina
- Revisión precompra en CABA y GBA: https://www.carchecking.com.ar/revision-vehiculo-en
