# N4 · Guion de la demo (defensa del 30/11)

**Actualizado el 17/11/2026.** Unos 9 minutos. Se hace sobre la **URL pública** (https://autocar-zeta.vercel.app), como pidió la cátedra, con las cuentas de prueba de producción. Hay que ensayarla al menos dos veces: una el día anterior contra **dev** (el preview de Vercel de la rama `dev`) y otra esa mañana.

**Quién hace qué:** uno maneja la computadora y otro habla. Cada ventana es una persona distinta: comprador, vendedor, mecánico y admin. Cambiar de persona entre ellas ayuda a que se entienda que son cuatro roles.

## Antes de empezar

### Las cuentas

Todas son `@autocar.test` y tienen la misma contraseña (está en los apuntes del grupo, no en el repo). Están en producción y en dev.

| Ventana | Quién | Cuenta |
|---|---|---|
| 1 | Comprador | `lucia.martinez@autocar.test` (o una cuenta nueva creada en el momento: muestra la pregunta "¿Para qué buscás el auto?") |
| 2 | Vendedor | `diego.fernandez@autocar.test` (tiene 3 autos publicados) |
| 3 | Mecánico que revisa | `taller.ferreyra@autocar.test` (Taller Ferreyra Hnos., Mercedes) |
| 4 | Admin | La cuenta de admin del equipo |

Para el presupuesto (paso 6) la ventana 3 cambia a otro taller: `mecanica.gomez@autocar.test` (Mercedes).

### Esa mañana (30 minutos antes)

- [ ] **Despertar Render:** abrir `https://autocar-zeta.vercel.app/api/mecanicos` y esperar a que responda. La primera vez tarda hasta un minuto.
- [ ] **Abrir cuatro ventanas**, cada una con su propia sesión (normal, incógnito y otros perfiles de Chrome o Firefox) e ingresar con las cuentas de la tabla.
- [ ] **Elegir el auto** de Diego que se va a inspeccionar y anotar su id. Que no tenga una inspección en curso de Lucía (si no, el sitio avisa "Ya tenés una inspección en curso para ese auto").
- [ ] **Tener a mano una patente que ya se revisó**, para mostrar el historial del auto: por ejemplo `AD006DM` (en producción la tiene el Tracker de la inspección #17).
- [ ] Zoom del navegador al 125 %, notificaciones apagadas y la batería cargada.

## La demo

### 1. El problema (30 s, sin tocar nada)
> "Cuando comprás un usado, la revisión la hace alguien que elige el vendedor, o un inspector anónimo de la empresa que te lo vende. Si se equivoca, nadie responde. Y nadie te dice qué falla suele tener ese modelo ni cuánto te va a salir dejarlo bien."

### 2. El comprador encuentra el auto (1 min) · ventana 1
- **Explorar → el auto de Diego.** Mostrar el comparador ("¿Está bien el precio?": son precios de avisos, no de ventas) y, si el modelo tiene, **Fallas típicas de este modelo**.
- Tocar **Mandale un mecánico**: el link del auto queda fijo. Los mecánicos aparecen con su **puntaje** (sale de las inspecciones firmadas y de los reclamos que procedieron; nadie paga para subir).
- Elegir **Taller Ferreyra Hnos.** Mostrar el desglose: con un taller de $ 100.000, **$ 77.000 al mecánico y $ 23.000 a AutoCar, de los que $ 8.000 van al fondo de garantía**. Si Lucía tiene un crédito, aparece descontado.
- Abrir **qué revisa y qué no cubre**, marcar la casilla y **Pedir la inspección**.
> "Antes de pagar sabe de qué se hace responsable el mecánico. Todos estos números son parámetros que el admin cambia sin tocar código."

### 3. El mecánico acepta y el vendedor confirma (45 s) · ventanas 3 y 2
- Ventana 3, **Mi taller → Pedidos → Aceptar**, con un turno para mañana.
- Ventana 2, **Mis publicaciones → Turnos de inspección → Confirmar turno.** El vendedor ve el día y la localidad, **no quién es el mecánico**.
> "Si el vendedor vende el auto antes del turno, el pedido se cae solo y al comprador le devolvemos todo. Lo mostramos al final."

### 4. El mecánico revisa y firma (2 min) · ventana 3
- **Por revisar → Revisar y firmar.**
- **Patente:** escribir `AD006DM` y salir del campo: aparece **el historial del auto** (otra inspección de la misma patente, con sus km y lo que encontró). Sacar la **foto de la chapa**.
- **Marca y modelo** ya vienen de la publicación. Abajo aparecen las **fallas típicas del modelo**: votar una ("La vi") o **proponer una falla típica**. El ítem del checklist donde se ve queda marcado.
- Checklist: todo OK salvo **Carrocería → Observado** ("Rayón en la puerta trasera"). Conclusión **Con reparos**.
- **Firmar informe → Firmar.**
> "Firma con su nombre y desde acá no se puede editar. Guardamos una huella del informe: si alguien tocara una coma, nos daríamos cuenta. Sin patente, foto de la chapa, marca y modelo no se puede firmar."

### 5. El comprador ve el informe (1 min) · ventana 1
- **Mis inspecciones → la inspección:** el informe firmado, el **historial de este auto** (con el aviso "Ojo con los km" si el aviso dice menos km que antes), las **fallas típicas del modelo** y los **trámites** a pedir antes de pagar.
- **Costo total del auto:** la carrocería observada ya se les pidió a otros talleres de la red. Todavía dice "Esperando respuesta".
> "El que revisó nunca presupuesta lo que encontró: separamos al que revisa del que arregla."

### 6. Otro taller presupuesta (45 s) · ventana 3
- Salir y entrar con `mecanica.gomez@autocar.test`. **Mi taller → Presupuestos que te pidieron → Presupuestar:** $ 85.000, "Pulido y retoque de pintura".
- Ventana 1, recargar: **Costo total** = precio del aviso + el presupuesto más barato de cada arreglo.

### 7. El reclamo y el fondo de garantía (1 min 30 s) · ventanas 1 y 4
- Ventana 1, **Reclamo:** ítem *Estructura*, "Tenía un golpe en el zócalo derecho y el informe no lo marca". **Enviar.**
- Ventana 4, **Panel → Reclamos de inspecciones.** Arriba, el **fondo de garantía**: saldo, lo que entró y lo que salió, y el supuesto ("cierra si hay menos de 1 reclamo cada ~46 inspecciones").
- **Resolver → Procede.** Intentar una compensación más alta que el tope (no deja) y poner una dentro del tope. **Guardar.**
- En la tarjeta se ven la **devolución** y la **franquicia del mecánico** (40 % de lo que cobró), y el saldo del fondo cambia.
- **Mecánicos de la red:** Ferreyra bajó en el ranking y muestra "1 reclamo procedió".

### 8. Auto vendido (45 s, si hay tiempo) · ventanas 1, 3 y 2
- Lucía pide otra inspección de otro auto de Diego; Ferreyra la acepta con turno para mañana.
- Ventana 2, **Mis publicaciones → Marcar vendida** en ese auto.
- Ventana 1, recargar: la inspección dice **"Se cayó: el auto se vendió"** y el pago **"Te lo devolvimos"**.
> "Si el mecánico ya hubiera ido, firma igual: el informe queda en la patente y al comprador le damos un crédito del 30 %, no la devolución completa. Y si el auto se vende dentro de las 48 horas después de la firma con el turno confirmado, también. Todo se puede comprobar."

### 9. Variables y controles (30 s) · ventana 4
- **Panel → Parámetros:** comisión, fondo, tope, días de reclamo, precio mínimo y máximo, franquicia, crédito, horas del cupón, presupuestos por arreglo, mínimo de inspecciones para medir fallas… Cambiar uno y mostrar que **queda anotado quién y cuándo**.
- Abajo, **Cargar una falla típica de internet**: siempre con la fuente.

### 10. Cierre (20 s)
> "Kavak te muestra solo su stock y MercadoLibre solo sus avisos. Nosotros te dejamos elegir a alguien que revisa el auto y responde si se equivoca, te decimos qué falla suele tener ese modelo y cuánto te sale dejarlo bien."

## Si algo falla

| Pasa esto | Hacer |
|---|---|
| Render no responde | Esperar 30 segundos y recargar. Si sigue igual, pasar al **plan B** |
| "Ya tenés una inspección en curso para ese auto" | Elegir otro auto de Diego |
| No aparece el pedido de presupuesto en Gómez | Se les pide a 3 talleres de la red (primero los de la localidad del que revisó): probar con `acosta.service@` o `benitez.motor@` |
| El admin no ve el botón Resolver | Está ingresado con la cuenta del comprador o la del mecánico: el que tiene interés propio no puede resolver |
| No aparecen fallas típicas | El modelo todavía no tiene: proponer una desde el checklist (paso 4) |
| Algo raro en la pantalla | **Plan B:** la prueba automática hace el mismo recorrido sola, contra dev: `BASE_URL=https://autocar-git-dev-autocar4.vercel.app npx playwright test tests/e2e/inspecciones.spec.js tests/e2e/auto-vendido.spec.js --headed --project=chromium` |

## Después de cada ensayo

Cada recorrido deja datos (inspecciones, un reclamo que procedió, un presupuesto y quizás una falla propuesta). Por eso:
- **Ensayar en dev**, no en producción. En producción hacer la demo una sola vez, el día de la defensa.
- Si hay que repetir en producción, usar **otro auto** de Diego y otro taller (por ejemplo Acosta en vez de Ferreyra), para que el ranking siga mostrando el cambio.

## Preguntas que nos pueden hacer

- **¿Y si el mecánico arregla con el vendedor?** El vendedor no lo elige y no sabe quién es hasta el turno. Además, al mecánico le va el ranking y paga una franquicia si un reclamo procede.
- **¿Quién decide si un reclamo procede?** El moderador o el admin, con las pruebas. Quien tiene interés propio no puede resolver: el sistema no lo deja.
- **¿Cómo gana plata AutoCar?** Con el 23 % de cada inspección; un tercio de eso va al fondo, que solo paga reclamos. Neto, unos $ 13.200 por inspección de $ 100.000. El pago de esta versión es simulado (Mercado Pago queda para después).
- **¿Alcanza el fondo?** Entran $ 8.000 por inspección y un reclamo al tope cuesta ~$ 369.200 ($ 100.000 + $ 300.000 − $ 30.800 de franquicia): cierra con menos de 1 reclamo cada ~46 inspecciones. Es un supuesto, y los dos números son parámetros.
- **¿Qué pasa si el auto se vende?** Antes del turno, se cae solo y se devuelve todo. Si el mecánico ya fue, se firma igual y el comprador recibe un crédito del 30 %. El cupón exige turno confirmado y venta dentro de las 48 h: no se puede inventar.
- **¿De dónde salen las fallas típicas?** De internet (con la fuente), de los mecánicos (que las votan) y de nuestras inspecciones, que miden cuántos autos de ese modelo la tuvieron. Con menos de 20 inspecciones del modelo no mostramos el porcentaje.
- **¿Qué pasa con los papeles?** El mecánico verifica motor y chasis contra la cédula. Los trámites (dominio, deudas, VTV, 08) se le indican al comprador, porque no hay una API pública del Registro.
- **¿Cómo sabemos que anda?** Por las pruebas unitarias y de integración del back (en cada PR), y por las pruebas de punta a punta que hacen este mismo recorrido en el navegador.
