# PRD — Sistema de gestión para forrajerías

**Versión:** 1.0
**Fecha:** Septiembre 2026
**Tipo de proyecto:** Producto propio (SaaS)
**Plataforma:** Web + Móvil

---

## 1. Resumen ejecutivo

Sistema de gestión pensado para forrajerías y agroveterinarias, orientado a resolver tres problemas centrales del rubro: **control de stock de productos que se compran en bolsa y se venden fraccionados por kilo**, **gestión de vencimientos y lotes en alimento balanceado y sanidad animal**, y **facturación simplificada** (incluyendo operaciones informales, "en negro") con cuenta corriente de clientes de campo.

El objetivo es ofrecer una alternativa liviana y específica del rubro frente a sistemas de gestión genéricos, que suelen ser o demasiado complejos (ERPs agropecuarios) o demasiado simples (planillas de Excel y cuaderno de fiado).

---

## 2. Problema a resolver

Las forrajerías manejan una lógica de stock particular: **el mismo producto se compra en una unidad y se vende en otra**. Una bolsa de 25 kg de alimento balanceado se vende suelta por kilo; el maíz o el alpiste entran por bolsa de 50 kg y salen en bolsitas de 1, 2 y 5 kg; los fardos de alfalfa se compran por camión y se venden por unidad con peso variable. A esto se suman **mezclas de elaboración propia** (mixtura para aves, ración para gallinas ponedoras) que consumen varios insumos en proporciones definidas y generan un producto nuevo.

En paralelo, el rubro convive con **productos con vencimiento y lote** (antiparasitarios, pipetas, vacunas, alimento medicado), **alta estacionalidad** (fardos y leña en invierno, antipulgas en verano), **cientos de SKUs de balanceado** que se diferencian por marca, línea, edad y tamaño del animal, y **listas de precios de proveedor que se actualizan permanentemente**.

Hoy todo esto se gestiona en papel, cuaderno y planillas sueltas: la merma del fraccionamiento no se registra, el stock del sistema deja de coincidir con el físico a las pocas semanas, se venden productos vencidos por no tener alerta, la actualización de precios se hace producto por producto, y las cuentas corrientes de productores y criaderos quedan anotadas a mano.

---

## 3. Objetivos del producto

- Dar visibilidad en tiempo real del stock, **expresado indistintamente en bolsas o en kilos**, con conversión automática entre unidades.
- Registrar el **fraccionamiento y las mezclas** como operaciones formales del sistema, incluyendo la merma, para que el stock físico y el del sistema no se separen.
- Controlar **vencimientos y lotes** de alimento y sanidad animal, con alertas antes de que el producto se vuelva invendible.
- Permitir **actualización masiva de precios** por proveedor, marca o rubro, en un rubro donde los costos se mueven todo el tiempo.
- Permitir facturación flexible: comprobantes internos/no fiscales ("en negro") como flujo principal del MVP, dejando la puerta abierta a integración fiscal (ARCA) en una etapa posterior.
- Reducir el tiempo administrativo del dueño/encargado de la forrajería.

---

## 4. Usuarios objetivo

- **Dueño/encargado de forrajería:** administra stock, precios, listas de proveedor, ve reportes y cuentas corrientes.
- **Vendedor/mostrador:** vende, consulta stock y precios, arma comprobantes, carga fiado.
- **Depósito/fraccionamiento:** registra entradas de mercadería, fraccionamientos, mezclas y ajustes.
- *(Opcional, fuera de MVP)* **Cliente de campo / criadero:** consulta su saldo de cuenta corriente y su historial de compras.

---

## 5. Alcance del MVP

**Prioridad definida:** stock con doble unidad y fraccionamiento primero, como base sobre la que se apoyan mezclas, vencimientos, venta y facturación.

### 5.1 Módulo de Stock y Fraccionamiento *(prioridad 1)*

- Alta de productos con **doble unidad de medida y factor de conversión** (ej: bolsa de 25 kg ↔ kg; fardo ↔ kg estimado).
- Stock único por producto, consultable y editable en cualquiera de las dos unidades.
- **Operación de fraccionamiento:** se abre una bolsa, se descuenta del stock cerrado y se acredita al stock suelto, registrando la **merma** (diferencia entre lo teórico y lo efectivamente obtenido).
- Historial de movimientos de stock (ingresos por compra, egresos por venta, fraccionamiento, mezcla, ajustes manuales, roturas/humedad).
- Alertas de stock mínimo, configurables por producto.
- Productos de peso variable (fardos, rollos): se vende por unidad, se descuenta stock por unidad, con peso de referencia para cálculo de precio.

### 5.2 Módulo de Mezclas y elaboración propia *(prioridad 2)*

- Definición de **recetas**: un producto final compuesto por N insumos en proporciones fijas (ej: mixtura para aves = 40% maíz partido + 30% alpiste + 20% mijo + 10% girasol).
- Ejecución de una mezcla: descuenta los insumos según la receta y da de alta el producto final en stock.
- Costo del producto final calculado automáticamente a partir del costo de los insumos.
- Registro de merma de elaboración.

### 5.3 Módulo de Vencimientos y lotes *(prioridad 3)*

- Carga de **lote y fecha de vencimiento** en el ingreso de productos que lo requieran (sanidad animal, alimento medicado, balanceado).
- Marcado de productos como "controla vencimiento" sí/no, para no complicar la carga de granos y accesorios.
- Alerta de próximos a vencer, con horizonte configurable (ej: 60 días).
- Reporte de stock vencido / a liquidar.
- Salida por lote más próximo a vencer (FEFO) sugerida al vender.

### 5.4 Módulo de Venta y comprobantes *(prioridad 4)*

- Venta rápida de mostrador con búsqueda por marca, animal y presentación.
- **Precios diferenciados por lista** (consumidor final, mayorista, criadero/productor), asignables por cliente.
- Emisión de comprobante interno de venta ("factura en negro"), sin integración con ARCA/AFIP en el MVP.
- Remito de entrega para pedidos que salen a domicilio o se retiran después, con numeración correlativa propia (no fiscal).
- Registro de medio de pago (efectivo, transferencia).
- **Cuenta corriente por cliente** (deuda/saldo a favor), con registro de pagos parciales.

### 5.5 Módulo de Precios y proveedores *(prioridad 5)*

- Lista de precios por proveedor con fecha de vigencia.
- **Actualización masiva por porcentaje**, filtrable por proveedor, marca o rubro.
- Margen configurable por rubro, con recálculo automático del precio de venta al cambiar el costo.
- Historial de costos por producto.

> **Nota:** la integración con facturación electrónica oficial (ARCA) queda fuera del MVP y se evalúa como fase posterior, dado que hoy se maneja por fuera del sistema en la mayoría de los casos del rubro. Lo mismo aplica a la trazabilidad SENASA de productos veterinarios.

---

## 6. Flujos clave

**Flujo de fraccionamiento:**
Ingresa mercadería por bolsa cerrada → se registra el ingreso en la unidad de compra → al abrir una bolsa para venta suelta se ejecuta un fraccionamiento → el sistema descuenta 1 bolsa y acredita los kilos correspondientes al stock suelto → al cerrar el fraccionamiento se registra la merma real → cada venta por kilo descuenta del stock suelto.

**Flujo de mezcla:**
Se selecciona una receta y la cantidad a elaborar → el sistema valida que haya stock de todos los insumos → descuenta los insumos y da de alta el producto final con su costo calculado → se registra la merma de elaboración.

**Flujo de venta:**
Venta de mostrador (o pedido con remito) → se aplica la lista de precios del cliente → el sistema sugiere el lote más próximo a vencer si el producto lo controla → se emite comprobante interno → se registra el pago o se imputa a cuenta corriente → se actualiza el stock.

**Flujo de actualización de precios:**
Llega lista nueva del proveedor → se aplica el aumento por porcentaje sobre el filtro correspondiente → el sistema recalcula precios de venta según el margen del rubro → los precios nuevos quedan vigentes desde una fecha, conservando el historial.

---

## 7. Requerimientos no funcionales

- **Web + móvil** (uso desde mostrador en PC/tablet, y consulta rápida desde celular en depósito o al recibir mercadería).
- Multiusuario con roles (dueño, vendedor, depósito).
- Funcionamiento aceptable con **conectividad inestable** (muchas forrajerías están en zonas periurbanas o rurales con mala señal).
- **Velocidad de mostrador:** la venta de un producto no debería requerir más de 3 acciones; el rubro tiene ticket bajo y alta frecuencia.
- Impresión de comprobantes y remitos en formato ticket o A4.
- Catálogo inicial precargado de marcas y presentaciones habituales del rubro, para que el alta de productos no sea una barrera de adopción.

---

## 8. Fuera de alcance (MVP)

- Facturación electrónica fiscal integrada con ARCA.
- Trazabilidad y registros SENASA / receta veterinaria digital.
- Integración con balanza / báscula.
- App para que el cliente final consulte su cuenta corriente.
- Gestión de compras a proveedores / órdenes de compra automáticas.
- Logística de reparto (fletes, hojas de ruta).
- Múltiples sucursales.
- Programa de fidelización o suscripción de reposición automática de alimento.

---

## 9. Métricas de éxito

- **Diferencia de stock físico vs. sistema** en controles periódicos, medida sobre productos fraccionables (es la métrica que valida el corazón del producto).
- **% de operaciones registradas en el sistema** vs. fuera de él.
- **Merma registrada vs. merma real estimada** — si la merma cargada es cero, el fraccionamiento no se está usando.
- Tiempo promedio de una venta de mostrador.
- **% de productos vencidos sobre el total de stock con vencimiento** (objetivo: reducirlo respecto de la línea de base).
- Tiempo para aplicar una actualización de lista de precios completa.

---

## 10. Preguntas abiertas

- ¿La merma del fraccionamiento se carga manualmente al cerrar la bolsa, o se estima con un porcentaje configurable por producto?
- ¿Cómo se resuelven los productos de **peso variable** (fardos, rollos): peso fijo de referencia, peso cargado en cada operación, o venta por unidad sin peso?
- ¿Las mezclas se elaboran contra pedido o por lote a stock? Esto cambia si la receta se ejecuta al momento de vender o como operación de depósito independiente.
- ¿Cuántas listas de precios distintas se necesitan realmente, y se define el precio por lista o por porcentaje sobre el costo?
- ¿El control de vencimiento debe ser por lote real o alcanza con una fecha de vencimiento por ingreso de mercadería?
- ¿En qué momento conviene evaluar la integración fiscal con ARCA y la trazabilidad SENASA, dado que la segunda puede ser un requisito legal y no una decisión comercial?
