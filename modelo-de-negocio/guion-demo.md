# N4 · Guion de la demo (defensa del 30/11)

**Actualizado el 23/11/2026** (sin reclamos, sin fondo de garantía y sin historial por patente). Unos 8 minutos. Se hace sobre la **URL pública** (https://autocar-zeta.vercel.app), como pidió la cátedra, con las cuentas de prueba de producción. Hay que ensayarla al menos dos veces: una el día anterior contra **dev** (el preview de Vercel de la rama `dev`) y otra esa mañana.

**Quién hace qué:** uno maneja la computadora y otro habla. Cada ventana es una persona distinta: comprador, vendedor, mecánico y admin. Cambiar de persona entre ellas ayuda a que se entienda que son cuatro roles.

## Antes de empezar

### Las cuentas

Todas son `@autocar.test` y tienen la misma contraseña (está en los apuntes del grupo, no en el repo). Están en producción y en dev.

| Ventana | Quién | Cuenta |
|---|---|---|
| 1 | Comprador | `lucia.martinez@autocar.test` (o una cuenta nueva creada en el momento: muestra la pregunta "¿Para qué buscás el auto?") |
| 2 | Vendedor | `diego.fernandez@autocar.test` (tiene 3 autos publicados: Etios, Onix y Ranger) |
| 3 | Mecánico que revisa | `taller.ferreyra@autocar.test` (Taller Ferreyra Hnos., Mercedes) |
| 4 | Admin | La cuenta de admin del equipo |

Para el presupuesto (paso 6) la ventana 3 cambia a otro taller: `mecanica.gomez@autocar.test` (Mercedes).

### Esa mañana (30 minutos antes)

- [ ] **Despertar Render:** abrir `https://autocar-zeta.vercel.app/api/mecanicos` y esperar a que responda. La primera vez tarda hasta un minuto.
- [ ] **Abrir cuatro ventanas**, cada una con su propia sesión (normal, incógnito y otros perfiles de Chrome o Firefox) e ingresar con las cuentas de la tabla.
- [ ] **Elegir el auto** de Diego que se va a inspeccionar y anotar su id. Que no tenga una inspección en curso de Lucía (si no, el sitio avisa "Ya tenés una inspección en curso para ese auto").
- [ ] **Tener a mano una patente** para cargar en el checklist (cualquiera con formato válido, por ejemplo `AD123CD`).
- [ ] Zoom del navegador al 125 %, notificaciones apagadas y la batería cargada.

## La demo

### 1. El problema (30 s, sin tocar nada)
> "Cuando comprás un usado, la revisión la hace alguien que elige el vendedor, o un inspector anónimo de la empresa que te lo vende. Nadie firma lo que vio. Y nadie te dice qué falla suele tener ese modelo ni cuánto te va a salir dejarlo bien."

### 2. El comprador encuentra el auto (1 min) · ventana 1
- **Explorar → el Chevrolet Onix de Diego.** Mostrar el comparador ("¿Está bien el precio?": son precios de avisos, no de ventas) y **Fallas típicas de este modelo**: en producción el Onix tiene 20 inspecciones firmadas, así que muestra el porcentaje medido (frenos 35 %), fallas de internet con su fuente y las que votaron los mecánicos. El Gol Trend (24 firmadas) también sirve, en el metabuscador o con un link de afuera.
- Tocar **Mandale un mecánico**: el link del auto queda fijo. Los mecánicos aparecen ordenados por **experiencia**: cuántas inspecciones firmaron y cuántas de ese modelo (nadie paga para subir).
- Elegir **Taller Ferreyra Hnos.** Mostrar el desglose: con un taller de $ 100.000, **$ 77.000 al mecánico y $ 23.000 a AutoCar**. Si Lucía tiene un crédito, aparece descontado.
- Abrir **qué revisa y qué no cubre**, marcar la casilla y **Pedir la inspección**.
> "Antes de pagar sabe qué revisa el mecánico y qué no: el informe reduce el riesgo, no lo elimina. Todos estos números son parámetros que el admin cambia sin tocar código."

### 3. El mecánico acepta y el vendedor confirma (45 s) · ventanas 3 y 2
- Ventana 3, **Mi taller → Pedidos → Aceptar**, con un turno para mañana.
- Ventana 2, **Mis publicaciones → Turnos de inspección → Confirmar turno.** El vendedor ve el día y la localidad, **no quién es el mecánico**.
> "Si el vendedor vende el auto antes del turno, el pedido se cae solo y al comprador le devolvemos todo. Lo mostramos al final."

### 4. El mecánico revisa y firma (2 min) · ventana 3
- **Por revisar → Revisar y firmar.**
- **Patente:** escribirla y sacar la **foto de la chapa**: prueban que el informe es de ese auto.
- **Marca y modelo** ya vienen de la publicación. Abajo aparecen las **fallas típicas del modelo**: votar una ("La vi") o **proponer una falla típica**. El ítem del checklist donde se ve queda marcado.
- Checklist: todo OK salvo **Carrocería → Observado** ("Rayón en la puerta trasera"). Conclusión **Con reparos**.
- **Foto obligatoria de una falla** (si hay tiempo): marcar **Frenos → Falla** ("Disco delantero rayado") y tocar Firmar: no deja, pide la foto. Tocar **Sacale una foto** y subir `foto-de-prueba-falla.jpg` (está en la carpeta de la presentación). En "observado" la foto es opcional.
- **Firmar informe → Firmar.**
> "Firma con su nombre y desde acá no se puede editar. Guardamos una huella del informe: si alguien tocara una coma, nos daríamos cuenta. Sin patente, foto de la chapa, foto de cada falla, marca y modelo no se puede firmar."

### 5. El comprador ve el informe (1 min) · ventana 1
- **Mis inspecciones → la inspección:** el informe firmado, **qué cubre y qué no** ("reduce el riesgo, no lo elimina: la decisión es tuya"), las **fallas típicas del modelo** y los **trámites** a pedir antes de pagar.
- Si hubo una falla, su foto aparece debajo del ítem (tocándola se abre grande).
- **Costo total del auto:** la carrocería observada ya se les pidió a otros talleres de la red. Todavía dice "Esperando respuesta". Para mostrar uno ya completo, abrir otra inspección firmada de Lucía (por ejemplo, el Fiat Argo: precio + $ 269.000 de arreglos).
> "El que revisó nunca presupuesta lo que encontró: separamos al que revisa del que arregla."

### 6. Otro taller presupuesta (45 s) · ventana 3
- Salir y entrar con `mecanica.gomez@autocar.test`. **Mi taller → Presupuestos que te pidieron → Presupuestar:** $ 85.000, "Pulido y retoque de pintura".
- Ventana 1, recargar: **Costo total** = precio del aviso + el presupuesto más barato de cada arreglo.

### 7. Auto vendido (45 s, si hay tiempo) · ventanas 1, 3 y 2
- Lucía pide otra inspección de otro auto de Diego; Ferreyra la acepta con turno para mañana.
- Ventana 2, **Mis publicaciones → Marcar vendida** en ese auto.
- Ventana 1, recargar: la inspección dice **"Se cayó: el auto se vendió"** y el pago **"Te lo devolvimos"**.
> "Si el mecánico ya hubiera ido, firma igual y al comprador le damos un crédito del 30 %, no la devolución completa. Y si el auto se vende dentro de las 48 horas después de la firma con el turno confirmado, también. Todo se puede comprobar."

### 8. Variables y controles (30 s) · ventana 4
- **Panel → Parámetros:** comisión, precio mínimo y máximo, crédito, horas del cupón, presupuestos por arreglo, mínimo de inspecciones para medir fallas, pesos de "para vos", mínimo del ranking… Cambiar uno y mostrar que **queda anotado quién y cuándo**.
- Abajo, **Cargar una falla típica de internet**: siempre con la fuente.

### 9. Cierre (20 s)
> "Kavak te muestra solo su stock y MercadoLibre solo sus avisos. Nosotros te dejamos elegir a alguien que revisa el auto y firma lo que vio, te decimos qué falla suele tener ese modelo y cuánto te sale dejarlo bien. La decisión es tuya, pero la tomás sabiendo lo que comprás."

## Si algo falla

| Pasa esto | Hacer |
|---|---|
| Render no responde | Esperar 30 segundos y recargar. Si sigue igual, pasar al **plan B** |
| "Ya tenés una inspección en curso para ese auto" | Elegir otro auto de Diego |
| No aparece el pedido de presupuesto en Gómez | Se les pide a 3 talleres de la red (primero los de la localidad del que revisó): probar con `acosta.service@` o `benitez.motor@` |
| No aparecen fallas típicas | El modelo todavía no tiene: usar el Onix o el Gol Trend, o proponer una desde el checklist (paso 4) |
| Algo raro en la pantalla | **Plan B:** la prueba automática hace el mismo recorrido sola, contra dev: `BASE_URL=https://autocar-git-dev-autocar4.vercel.app npx playwright test tests/e2e/inspecciones.spec.js tests/e2e/auto-vendido.spec.js --headed --project=chromium` |

## Después de cada ensayo

Cada recorrido deja datos (inspecciones, un presupuesto y quizás una falla propuesta). Por eso:
- **Ensayar en dev**, no en producción. En producción hacer la demo una sola vez, el día de la defensa.
- Si hay que repetir en producción, usar **otro auto** de Diego y otro taller (por ejemplo Acosta en vez de Ferreyra).

## Preguntas que nos pueden hacer

- **¿Y si el mecánico arregla con el vendedor?** El vendedor no lo elige y no sabe quién es hasta el turno. Además, el mecánico firma con su nombre, con fotos y la patente.
- **¿Y si el mecánico se equivoca? ¿Hay reclamo?** No. El informe reduce el riesgo antes de comprar, no lo elimina: si se le pasa algo, ese es el punto ciego del servicio y es un riesgo que asume el comprador. Un reclamo no se puede verificar (nadie sabe si la falla estaba ese día o apareció después) y llega cuando el auto ya se compró. Lo sacamos el 23/11.
- **¿Por qué no muestran las inspecciones anteriores de ese auto?** Un auto puede dejar de estar publicado a las dos semanas y esas inspecciones quedan sin sentido; además se regalaba la inspección al siguiente comprador.
- **¿Cómo se ordenan los mecánicos?** Por experiencia: cuántas inspecciones firmó cada uno y, para ese auto, cuántas de ese modelo o marca. Nadie paga para subir.
- **¿Cómo gana plata AutoCar?** Con el 23 % de cada inspección: unos $ 21.200 netos por inspección de $ 100.000 (descontando Mercado Pago). El pago de esta versión es simulado.
- **¿Qué pasa si el auto se vende?** Antes del turno, se cae solo y se devuelve todo. Si el mecánico ya fue, se firma igual y el comprador recibe un crédito del 30 %. El cupón exige turno confirmado y venta dentro de las 48 h: no se puede inventar.
- **¿De dónde salen las fallas típicas?** De internet (con la fuente), de los mecánicos (que las votan) y de nuestras inspecciones, que miden cuántos autos de ese modelo la tuvieron. Con menos de 20 inspecciones del modelo no mostramos el porcentaje.
- **¿Qué pasa con los papeles?** El mecánico verifica motor y chasis contra la cédula. Los trámites (dominio, deudas, VTV, 08) se le indican al comprador, porque no hay una API pública del Registro.
- **¿Cómo sabemos que anda?** Por las pruebas unitarias y de integración del back (en cada PR), y por las pruebas de punta a punta que hacen este mismo recorrido en el navegador.
