# Especificación de la Funcionalidad: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Rama de la funcionalidad**: 001-erp-base-module  
**Creada**: 2026-07-08  
**Estado**: Borrador  
**Entrada**: Descripción del usuario: "Construir un módulo base de software de planificación de recursos empresariales (ERP) que pueda extenderse en módulos ERP personalizados. Debe proporcionar gestión de datos maestros (entidades) y documentos transaccionales vinculados con capacidades de crear/editar/eliminar/buscar."

## Propósito

Este proyecto sirve como módulo base reutilizable para construir módulos ERP personalizados. Establece los patrones comunes que todo módulo ERP necesita: gestionar registros de datos maestros (**Entidades**) y sus **Documentos** transaccionales asociados, con navegación, validación, persistencia y búsqueda ya implementadas, de modo que los módulos personalizados solo necesiten definir sus campos y reglas específicos del dominio.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Administrar usuarios y permisos del módulo (Prioridad: P1)
Como administrador del sistema, quiero gestionar los usuarios, roles y permisos del módulo de Adquisiciones y Compras para controlar el acceso a las funcionalidades y garantizar que cada usuario realice únicamente las acciones autorizadas.

**Por qué esta prioridad**: Es una funcionalidad crítica de seguridad e infraestructura; sin la gestión de usuarios y permisos, no es posible operativizar el módulo garantizando la trazabilidad, el control de acceso ni la asignación de responsabilidades.

**Prueba Independiente**: Un administrador puede ingresar al módulo, crear un usuario, asignarle un rol específico (ej. Solicitante) y verificar que dicho usuario solo tiene acceso a las vistas y acciones permitidas para su rol.

**Escenarios de Aceptación**:

1. **Dado** que el administrador está en el panel de gestión de usuarios, **cuando** crea o modifica un usuario asignándole un rol (solicitante, encargado de compras, aprobador o encargado de recepción), **entonces** el sistema guarda la información y restringe o habilita el acceso a las funcionalidades según los permisos asociados a dicho rol.

2. **Dado** que un usuario registrado intenta ingresar al módulo, **cuando** accede con su cuenta, **entonces** el sistema le permite realizar únicamente las acciones explícitamente autorizadas para su rol.

3. **Dado** que el administrador consulta el listado de usuarios, **cuando** visualiza la información de la plataforma, **entonces** el sistema despliega la lista completa de usuarios registrados junto con sus roles asignados.

4. **Dado** que el administrador intenta desactivar a un usuario que tiene solicitudes u órdenes de compra pendientes en su flujo, **cuando** confirma la acción de desactivación, **entonces** el sistema muestra una advertencia y prohibe la desactivación hasta que dichos trámites sean reasignados o concluidos.
   

---

### Historia de Usuario 2 - Generar Orden de Compra vinculada a un proveedor con totales calculados (Prioridad: P1)

Como Encargado de Compras, quiero generar un documento de Orden de Compra vinculado a un proveedor específico, calculando los subtotales, impuestos y el total, para formalizar la transacción de los insumos solicitados. 

**Por qué esta prioridad**: Esta función es el núcleo del módulo, ya que formaliza legal y financieramente la adquisición de insumos con los proveedores externos, resolviendo problemas críticos como las compras duplicadas por falta de comunicación y el nulo control sobre los gastos. Además, garantiza que el sistema registre los campos obligatorios de una transacción ERP (serie, folio, subtotal, descuento, impuesto y total) para saber exactamente cuánto se gasta y a quién se le debe.

**Prueba Independiente**: Se realiza simulando la creación de una Orden de Compra asociada a un id_proveedor ficticio. En esta simulación, se ingresan los productos junto con sus cantidades y precios unitarios dentro de la tabla intermedia llamada Detalle_Orden. El objetivo de esta prueba es comprobar que la suma de los valores detallados genere los totales correctos en el documento principal. Además, se debe verificar que el ciclo de vida de la orden se active de forma adecuada desde los parámetros de configuración.
**Escenarios de Aceptación**:

1. **Dada** una Orden de Compra creada con un id_proveedor ficticio, cuando se agregan productos con cantidades y precios unitarios en la tabla Detalle_Orden, el sistema debe calcular matemáticamente los subtotales, descuentos, impuestos y el total final.
2. **Dada** la generación de un nuevo documento transaccional, cuando se asignan los datos, el sistema debe guardar correctamente la persistencia del ID del proveedor asignado y de los artículos comprados.
3. **Dada** una orden formalizada y vinculada a la configuración del módulo, cuando el proceso operativo avanza, el documento debe transicionar correctamente por los estados de su ciclo de vida (Emitida, Recibida, Pagada).

---

### Historia de Usuario 3 - Aprobar o cancelar solicitudes de cotización (Prioridad: P1)
Como Encargado de Adquisiciones, quiero revisar y cambiar el estado de las solicitudes de cotización a "Aprobado" o "Cancelado" para poder autorizar formalmente las compras a proveedores validando sus condiciones comerciales y límites de crédito.

**Por qué esta prioridad**: Este es el valor central del módulo de Adquisiciones y Compras porque, sin aprobar las órdenes, el flujo transaccional se paraliza y no es posible avanzar a las etapas de recepción en bodega ni facturación.

**Prueba Independiente**: Un usuario puede seleccionar una Solicitud de Cotización pendiente, autorizarla para cambiar su estado a "Aprobado" y verificar que la orden oficial (OC-XXXX) quede registrada correctamente.

**Escenarios de Aceptación**:
1. **Dado** que un Encargado de Adquisiciones está viendo un documento en estado cotización, cuando selecciona la opción de aprobar validando que el proveedor cumple con sus datos comerciales (taxId, categoriaProveedor, paymentTerms y creditLimit), entonces el documento cambia su estado a aprobado, se le asigna su serie/folio oficial (OC-XXXX) y se guardan los cambios en el almacenamiento.
2.	**Dado** que un Encargado de Adquisiciones intenta aprobar un documento, cuando el monto total excede el límite de crédito del proveedor o faltan campos obligatorios de la entidad, entonces el sistema impide guardar la aprobación y despliega un mensaje de error explicando qué información se requiere.
3.	**Dado** que un Encargado de Adquisiciones aprueba o cancela una orden, cuando guarda la actualización, entonces el panel de inicio (dashboard) refleja los contadores y métricas de documentos en vivo sin necesidad de recargar la página.

---

### Historia de Usuario 4 - Revisar, autorizar o rechazar solicitudes de compra del departamento (Prioridad: P1)

Como aprobador o jefe de área, quiero revisar, autorizar o rechazar las solicitudes de compra generadas por los miembros de mi departamento, para asegurar el cumplimiento de las políticas de la empresa y controlar el uso del presupuesto asignado.

**Por qué esta prioridad**: Es el punto de control financiero y operativo del módulo; sin la validación del jefe de área, las adquisiciones avanzarían sin control de gasto ni justificación formal hacia las etapas comerciales de cotización y compras.

**Prueba Independiente**: Un jefe de área puede ingresar a la vista de pendientes, abrir una solicitud enviada por un solicitante de su área, examinar su justificación y líneas de detalle, y registrar exitosamente una autorización (avanzando el flujo a adquisiciones) o un rechazo con justificación obligatoria.

**Escenarios de Aceptación**:

1. **Dado** que el jefe de área ingresa a la bandeja de solicitudes pendientes de su departamento, **cuando** consulta el listado, **entonces** el sistema despliega las solicitudes de compra generadas por su equipo junto con el nombre del solicitante, fecha y motivo de compra.

2. **Dado** que el jefe de área selecciona una solicitud pendiente específica, **cuando** abre su detalle, **entonces** el sistema muestra los productos o servicios solicitados con sus respectivas cantidades y el saldo presupuestario disponible de la partida del área.

3. **Dado** que una solicitud cumple con las normativas internas y cuenta con fondos disponibles, **cuando** el jefe de área confirma la acción de autorizar, **entonces** el sistema actualiza el estado de la solicitud a aprobada y la habilita en la cola de trabajo del encargado de adquisiciones.

4. **Dado** que una solicitud no está debidamente justificada o excede el presupuesto, **cuando** el jefe de área presiona rechazar e ingresa el motivo de la decisión, **entonces** el sistema actualiza el estado a rechazada, bloquea su avance y registra las observaciones para consulta del solicitante.

5. **Dado** que el jefe de área intenta rechazar una solicitud sin completar la retroalimentación, **cuando** confirma la acción, **entonces** el sistema muestra una advertencia, mantiene el estado pendiente y exige ingresar un motivo obligatorio antes de proceder.


---
### Historia de Usuario 5 - Gestionar solicitudes autorizadas y generar la solicitud de cotización al proveedor (Prioridad: P1)

Como Encargado de Compras, quiero revisar las solicitudes de compra autorizadas por los jefes de área y generar a partir de ellas una solicitud de cotización dirigida a un proveedor, para obtener las condiciones comerciales y los precios que se evaluarán antes de formalizar la compra.

**Por qué esta prioridad**: Es el puente entre la autorización del departamento (Historia de Usuario 4) y la aprobación de la cotización (Historia de Usuario 3). Sin ella, las solicitudes autorizadas quedan sin atender y la aprobación no tiene un documento que revisar. Depende del rol de encargado de compras definido por el administrador (Historia de Usuario 1) y de la existencia de proveedores registrados.

**Prueba Independiente**: Un encargado de compras ingresa a la bandeja de solicitudes autorizadas, abre una de ellas, selecciona un proveedor activo, registra los precios unitarios cotizados de cada línea y genera la solicitud de cotización. Comprueba que el documento queda en estado “En cotización”, vinculado a la solicitud original, y que esta deja de aparecer como pendiente de atender.

**Escenarios de Aceptación**:

1. **Dado** que el encargado de compras ingresa a la bandeja de solicitudes autorizadas, **cuando** consulta el listado, **entonces** el sistema despliega solo las solicitudes en estado Aprobada que aún no tienen cotización, con su folio, área solicitante, fecha de autorización y motivo de compra.
2. **Dado** que el encargado selecciona una solicitud autorizada, **cuando** abre su detalle, **entonces** el sistema muestra los productos o servicios solicitados con sus cantidades, la justificación original y la decisión de autorización del jefe de área.
3. **Dado** que el encargado asigna un proveedor activo y registra el precio unitario de cada línea, **cuando** confirma la generación de la cotización, **entonces** el sistema crea la solicitud de cotización en estado “En cotización”, calcula subtotal, impuestos y total, la vincula a la solicitud de compra original y muestra esta última como “En cotización”.
4. **Dado** que el encargado intenta generar la cotización sin proveedor, con un proveedor inactivo o con datos comerciales incompletos, o con una línea sin precio, con precio negativo o no numérico, cuando confirma la acción, **entonces** el sistema impide guardar e indica qué dato debe corregirse.
5. **Dado** que un usuario sin rol de encargado de compras intenta generar una cotización, **cuando** accede a la acción, **entonces** el sistema la bloquea según los permisos de su rol.

---

### Historia de Usuario 6 - Verificar y registrar la recepción de productos contra la Orden de Compra (Prioridad: P1)

Como encargado de bodega o recepción, quiero verificar los productos que llegan del proveedor contra la Orden de Compra emitida y registrar las cantidades efectivamente entregadas, para dejar constancia de lo recibido, detectar faltantes o productos dañados y permitir que la orden avance en su ciclo de vida solo con información confirmada.

**Por qué esta prioridad**: La recepción cierra el ciclo operativo de la compra; sin ella no es posible saber si el proveedor cumplió con lo pactado, el inventario quedaría sin respaldo y la orden podría pasar a pago sin que los insumos hayan llegado realmente. Depende de la Orden de Compra (Historia de Usuario 2) y del rol de encargado de recepción definido por el administrador (Historia de Usuario 1).

**Prueba Independiente**: Un encargado de recepción abre una Orden de Compra en estado Emitida, ve sus líneas de detalle con las cantidades solicitadas, ingresa las cantidades recibidas (una completa, una parcial y una con observación de producto dañado), confirma la recepción y comprueba que el sistema guarda el registro con fecha y responsable, muestra las diferencias y actualiza el estado de la orden según corresponda.

**Escenarios de Aceptación**:

1. **Dado** que el encargado de recepción ingresa a la bandeja de órdenes por recibir, **cuando** consulta el listado, **entonces** el sistema despliega solo las Órdenes de Compra en estado Emitida o Recibida parcialmente, con su folio, proveedor y fecha de emisión.

2. **Dado** que el encargado selecciona una Orden de Compra pendiente de recepción, **cuando** abre su detalle, **entonces** el sistema muestra cada producto con la cantidad solicitada, la cantidad ya recibida en entregas anteriores y la cantidad pendiente.

3. **Dado** que todos los productos llegan completos y en buen estado, **cuando** el encargado registra las cantidades recibidas iguales a las pendientes y confirma la recepción, **entonces** el sistema guarda el registro de recepción con fecha, hora y responsable, y cambia el estado de la orden a Recibida.

4. **Dado** que el proveedor entrega menos unidades de las solicitadas en una o más líneas, **cuando** el encargado registra las cantidades efectivamente recibidas y confirma, **entonces** el sistema guarda la recepción, deja la orden en estado Recibida parcialmente y muestra las cantidades que siguen pendientes.

5. **Dado** que uno o más productos llegan dañados o no corresponden a lo solicitado, **cuando** el encargado marca la línea como rechazada e ingresa el motivo, **entonces** el sistema no contabiliza esas unidades como recibidas y conserva la observación asociada a la recepción.

6. **Dado** que el encargado ingresa una cantidad recibida mayor a la pendiente, una cantidad negativa o un valor no numérico, **cuando** intenta confirmar la recepción, **entonces** el sistema impide guardar y explica qué línea debe corregirse.

7. **Dado** que un usuario sin rol de encargado de recepción intenta registrar una recepción, **cuando** accede a la acción, **entonces** el sistema la bloquea según los permisos de su rol.

---

# Historia de Usuario 7: Solicitar productos y servicios con justificación

**Prioridad:** P1
**Etiquetas:** `user-story`, `modulo-compras`, `frontend`, `backend`

## Descripción

> **Como** solicitante,
> **quiero** registrar una solicitud de productos o servicios incluyendo la justificación de la necesidad de compra,
> **para que** los responsables de aprobación cuenten con el contexto necesario para autorizarla.

## Por qué esta prioridad
El proceso de compras depende de que las solicitudes estén correctamente fundamentadas. Si el solicitante no puede detallar el motivo técnico o comercial de la necesidad en el mismo módulo, el proceso de evaluación se retrasa o requiere comunicación externa, rompiendo el flujo del sistema. Esta historia es el punto de partida del módulo de adquisiciones.

## Prueba Independiente
Un solicitante accede al formulario, agrega los productos requeridos, redacta un texto en el campo obligatorio de justificación y envía el formulario; el sistema guarda el registro en estado "Pendiente de aprobación". Si el usuario intenta guardar dejando la justificación en blanco, el sistema bloquea el envío.

## Escenarios de Aceptación

- [ ] **1.** **Dado** un formulario de nueva solicitud de compra, **cuando** el usuario intenta enviarlo con el campo de justificación vacío, **entonces** el sistema bloquea la acción y muestra un mensaje de error indicando que la justificación es obligatoria.
- [ ] **2.** **Dado** un formulario con los productos/servicios seleccionados y una justificación redactada, **cuando** el usuario confirma el envío, **entonces** la solicitud se guarda exitosamente y su estado inicial se establece como "Pendiente de aprobación".
- [ ] **3.** **Dada** una solicitud enviada previamente, **cuando** el solicitante visualiza el detalle o el historial de su registro, **entonces** el texto de la justificación se muestra completo en la interfaz.
- [ ] **4.** **Dada** una solicitud pendiente, **cuando** el aprobador correspondiente abre el documento para su revisión, **entonces** la justificación de compra es visible inmediatamente antes de los botones de aprobar o rechazar.
### Historia de Usuario 8 - Buscar y encontrar entidades rápidamente (Prioridad: P2)
Como usuario de negocio, quiero buscar mis entidades por detalles clave para encontrar rápidamente el registro que necesito.

**Por qué esta prioridad**: La recuperación rápida mejora la utilidad cuando el conjunto de datos crece más allá de un pequeño número de entradas.

**Prueba Independiente**: Un usuario puede introducir un término de búsqueda y ver solo las entidades coincidentes.

**Escenarios de Aceptación**:

1. **Dadas** múltiples entidades almacenadas, **cuando** el usuario busca con un término coincidente, **entonces** solo se muestran las entidades coincidentes.
2. **Dada** una búsqueda sin coincidencias, **cuando** el usuario envía la búsqueda, **entonces** el sistema muestra un estado vacío claro y permite volver a intentarlo.
3. **Dadas** cientos de entidades almacenadas, **cuando** el usuario busca, **entonces** los resultados coincidentes aparecen con prontitud sin retraso perceptible.

---

### Historia de Usuario 9 - Gestionar el maestro de proveedores con validación comercial y fiscal (Prioridad: P1)

**Descripción**

Como Encargado de Compras, quiero registrar, editar y activar/desactivar proveedores incluyendo su RUT chileno validado, categoría, condiciones de pago y límite de crédito asignado, para mantener un catálogo confiable y evitar emitir órdenes a proveedores inactivos o sin respaldo comercial.

**Por qué esta prioridad**

Las Historias 2, 3 y 5 dependen directamente de que existan proveedores activos con taxId, categoriaProveedor, paymentTerms y creditLimit válidos; sin este maestro controlado, el flujo de cotización y aprobación carece de fuente oficial.

**Prueba Independiente**

Un Encargado de Compras abre el catálogo de proveedores, registra uno nuevo con RUT chileno válido, define su límite de crédito en CLP y plazo de pago, y verifica que aparezca disponible al crear una cotización; luego intenta registrar otro con RUT duplicado o dígito verificador inválido y comprueba que el sistema bloquea el guardado.

**Escenarios de Aceptación**

1. **Dado** el formulario de registro de proveedor, **cuando** el usuario ingresa razón social, RUT chileno válido (módulo 11), categoría, condición de pago (Contado, 30 días, 60 días) y límite de crédito mayor o igual a cero, **entonces** el sistema formatea el RUT (XX.XXX.XXX-X), guarda el proveedor en estado Activo y lo habilita en los selectores de compra.
2. **Dado** el ingreso de un RUT con dígito verificador incorrecto o ya existente en el sistema, **cuando** el usuario intenta guardar, **entonces** el sistema impide el registro y muestra un mensaje específico bajo el campo indicando el error.
3. **Dado** un proveedor con Órdenes de Compra en curso (en estado Emitida o Recibida parcialmente), **cuando** el usuario intenta cambiar su estado a Inactivo, **entonces** el sistema muestra una advertencia con los folios activos y bloquea la desactivación hasta que las órdenes concluyan.
4. **Dado** un proveedor en estado Inactivo, **cuando** un Encargado de Compras intenta asignarlo a una nueva solicitud de cotización u Orden de Compra, **entonces** el sistema lo excluye de las opciones seleccionables.

---

### Historia de Usuario 10 - Controlar presupuestos por departamento y comprometer fondos en tiempo real (Prioridad: P1)

**Descripción**

Como Jefe de Área o Administrador, quiero asignar y visualizar el presupuesto disponible, comprometido y ejecutado por departamento/centro de costo, para evitar sobregiros financieros al autorizar solicitudes de compra y mantener trazabilidad del gasto del área.

**Por qué esta prioridad**

La Historia 4 exige validar el "saldo presupuestario disponible de la partida del área" antes de autorizar una solicitud, pero sin una gestión explícita de presupuestos por departamento ese saldo es estático o inexistente.

**Prueba Independiente**

Un administrador asigna un presupuesto de $1.000.000 CLP al área de Operaciones; luego un Jefe de Operaciones autoriza una solicitud estimada en $400.000 CLP y verifica que el saldo disponible baje automáticamente a $600.000 CLP (y que si la solicitud es rechazada o cancelada posteriormente, el monto comprometido se libere).

**Escenarios de Aceptación**

1. **Dado** un departamento registrado en el módulo, **cuando** el administrador define o actualiza su monto presupuestario asignado en CLP, **entonces** el sistema calcula y muestra en tiempo real tres indicadores: Presupuesto Asignado, Monto Comprometido (solicitudes aprobadas y OCs activas) y Saldo Disponible.
2. **Dado** un jefe de área revisando una solicitud pendiente en la bandeja de aprobación, **cuando** el monto estimado de la solicitud supera el Saldo Disponible de su departamento, **entonces** el sistema destaca una alerta presupuestaria en rojo y bloquea la autorización (o exige autorización extraordinaria de rol Administrador).
3. **Dado** una solicitud previamente autorizada que es rechazada o cancelada en etapas posteriores (cotización u OC), **cuando** se confirma la cancelación, **entonces** el sistema libera automáticamente el monto comprometido y lo reintegra al Saldo Disponible del área.

---

### Historia de Usuario 11 - Registrar factura de proveedor y cerrar ciclo de Orden de Compra a "Pagada" (Prioridad: P1)

**Descripción**

Como Encargado de Compras o Finanzas, quiero asociar el número de factura tributaria (DTE) y fecha de pago a una Orden de Compra que ya fue recibida, verificando que el monto facturado coincida con lo efectivamente recepcionado, para cerrar formalmente el ciclo de vida de la orden en estado Pagada.

**Por qué esta prioridad**

En la Historia 2 se exige que la orden transicione por el ciclo de vida completo (Emitida → Recibida → Pagada), y en la Historia 6 se establece que una orden no debe pasar a pago sin recepción confirmada. Esta historia cierra ese ciclo operativo y financiero.

**Prueba Independiente**

Un usuario con permisos abre una Orden de Compra en estado Recibida, ingresa el folio de factura del proveedor y el monto total coincidente con los ítems recibidos, confirma el registro de pago y verifica que la orden pase a estado Pagada en modo solo lectura.

**Escenarios de Aceptación**

1. **Dado** una Orden de Compra en estado Emitida o Recibida parcialmente, **cuando** un usuario intenta registrar factura o marcarla como Pagada, **entonces** el sistema bloquea la acción indicando que la orden debe estar completamente Recibida primero.
2. **Dado** una Orden de Compra en estado Recibida, **cuando** el usuario ingresa el número de factura del proveedor, fecha de emisión de factura y monto facturado, **entonces** el sistema valida que el monto coincida con el total de unidades efectivamente recepcionadas (descontando ítems rechazados o dañados).
3. **Dado** que el monto de la factura difiere del total recepcionado, **cuando** el usuario intenta guardar, **entonces** el sistema muestra la diferencia exacta en pesos (CLP) y exige registrar una nota de ajuste o bloquear el pago hasta corregir la factura.
4. **Dado** un registro de factura y pago válido, **cuando** se confirma la operación, **entonces** la orden cambia a estado Pagada, actualiza el crédito utilizado del proveedor y bloquea cualquier edición posterior del documento.

---

### Historia de Usuario 12 - Consultar historial de auditoría y trazabilidad por documento (Prioridad: P2)

**Descripción**

Como Administrador o Auditor Interno, quiero visualizar una línea de tiempo cronológica con cada cambio de estado, usuario responsable, fecha, hora y observaciones de cada Solicitud de Compra y Orden de Compra, para garantizar transparencia y trazabilidad completa de quién solicitó, aprobó, cotizó y recepcionó cada compra.

**Por qué esta prioridad**

La Historia 1 define la trazabilidad y asignación de responsabilidades como pilar del módulo; sin una bitácora visible por documento no es posible auditar quién aprobó un gasto o por qué se rechazó una entrega.

**Prueba Independiente**

Un usuario abre el detalle de una Orden de Compra que haya pasado por solicitud, aprobación y recepción, despliega la pestaña o sección Historial / Auditoría y comprueba que figuran todos los eventos ordenados cronológicamente con el nombre y rol de quien ejecutó cada acción.

**Escenarios de Aceptación**

1. **Dado** cualquier evento de creación, edición, aprobación, rechazo, generación de OC, recepción parcial/total o pago, **cuando** se guarda en el almacenamiento (storage.js), **entonces** el sistema registra automáticamente una entrada inmutable con timestamp, usuarioId, nombreUsuario, rol, accion, estadoAnterior, estadoNuevo y comentario.
2. **Dado** que un usuario abre el detalle de una solicitud u Orden de Compra, **cuando** consulta su historial de actividad, **entonces** el sistema despliega la línea de tiempo cronológica mostrando cada transición y las observaciones asociadas (como motivos de rechazo o daños en recepción).
3. **Dado** el registro de auditoría de un documento, **cuando** cualquier usuario (incluido el Administrador) intenta editar o eliminar una entrada histórica desde la interfaz, **entonces** el sistema no ofrece opciones de modificación, garantizando la integridad de la bitácora.

---

### Historia de Usuario 13 - Monitorear indicadores operativos y alertas en el Dashboard ejecutivo (Prioridad: P2)

**Descripción**

Como Encargado de Adquisiciones o Jefe de Área, quiero visualizar métricas clave, gráficos de gasto por categoría/proveedor y alertas de documentos pendientes o atrasados en el Panel de Inicio, para priorizar las tareas urgentes del día y tomar decisiones basadas en datos en tiempo real.

**Por qué esta prioridad**

Potencia la Historia 3 (Escenario 3) convirtiendo el dashboard en una herramienta real de gestión que evita cuellos de botella en aprobaciones y recepciones pendientes.

**Prueba Independiente**

Un usuario ingresa al Panel de Inicio, observa los contadores activos de solicitudes por aprobar, cotizaciones pendientes y OCs por recibir, hace clic en una tarjeta o alerta (ej. "3 solicitudes pendientes de aprobación") y el sistema lo redirige directamente a esa bandeja filtrada.

**Escenarios de Aceptación**

1. **Dado** el ingreso al Panel de Inicio (Dashboard), **cuando** carga la vista, **entonces** el sistema muestra tarjetas KPI actualizadas en vivo con: Total Comprometido/Comprado del Mes (CLP), Solicitudes Pendientes de Aprobación, Cotizaciones en Evaluación y Órdenes Pendientes de Recepción.
2. **Dado** que existen órdenes emitidas cuya fecha estimada de entrega ya venció sin recepción completa, **cuando** se renderiza el panel, **entonces** el sistema muestra una sección de Alertas Operativas destacando los folios atrasados y el proveedor correspondiente.
3. **Dado** cualquier cambio de estado realizado en otra vista del módulo (aprobar una solicitud, emitir una OC o registrar una recepción), **cuando** el usuario vuelve al Panel de Inicio, **entonces** todos los KPIs, tablas de actividad reciente y alertas se actualizan automáticamente sin recargar la página.

---

### Historia de Usuario 14 - Exportar reportes transaccionales y respaldar/restaurar datos del sistema (Prioridad: P3)

**Descripción**

Como Encargado de Compras o Administrador, quiero exportar el listado de Órdenes de Compra y recepciones a formato CSV/imprimible, y descargar o restaurar respaldos completos de la base local en JSON, para respaldar la información operativa fuera del navegador y generar informes externos.

**Por qué esta prioridad**

Dado que el sistema persiste datos localmente en el navegador (localStorage), contar con exportación y respaldo previene pérdida de información durante pruebas o presentaciones y permite analizar gastos en hojas de cálculo.

**Prueba Independiente**

Un usuario aplica un filtro de fechas o proveedor en Órdenes de Compra, presiona Exportar CSV y descarga una planilla con los registros filtrados; además prueba exportar un respaldo .json, modifica un dato y restaura el respaldo comprobando que todo vuelve al estado guardado.

**Escenarios de Aceptación**

1. **Dado** el listado de Órdenes de Compra o Recepciones (con o sin filtros aplicados), **cuando** el usuario hace clic en Exportar CSV, **entonces** el sistema genera y descarga un archivo .csv codificado en UTF-8 con columnas de folio, fecha, proveedor, RUT, neto, IVA, total y estado.
2. **Dado** el detalle de una Orden de Compra oficial (OC-XXXX), **cuando** el usuario presiona Imprimir / Guardar PDF, **entonces** el sistema formatea el documento ocultando los menús laterales y mostrando encabezado formal de empresa, datos del proveedor, tabla de ítems y totales.
3. **Dado** el panel de configuración o barra de almacenamiento, **cuando** el administrador selecciona Exportar respaldo JSON o Restaurar respaldo, **entonces** el sistema permite descargar toda la estructura del localStorage o cargarla desde un archivo .json válido verificando su integridad antes de sobrescribir.

---

### Historia de Usuario 15 - Iniciar sesión y gestionar la sesión activa (Prioridad: P1)

Como usuario registrado del módulo de Adquisiciones y Compras, quiero iniciar sesión con mis credenciales y cerrarla cuando termine, para que el sistema sepa quién está operando, me muestre solo las funciones de mi rol y registre mis acciones a mi nombre.

**Por qué esta prioridad**: La Historia de Usuario 1 supone la existencia de un inicio de sesión, pero ninguna historia lo define. Sin identificar al usuario activo no es posible aplicar los roles y permisos, garantizar la segregación de funciones (quien solicita no aprueba su propia solicitud) ni registrar el usuario responsable en la bitácora de auditoría (Historia de Usuario 12).

**Prueba Independiente**: Un usuario abre la aplicación sin sesión y es dirigido a la pantalla de inicio de sesión; ingresa credenciales válidas y accede al panel con el menú filtrado según su rol y su nombre visible en la barra superior; luego cierra sesión y comprueba que al intentar volver a una pantalla interna el sistema lo redirige al inicio de sesión. Finalmente intenta ingresar con una contraseña incorrecta y con un usuario desactivado, y verifica que ambos accesos son rechazados.

**Escenarios de Aceptación**:

1. **Dado** que un usuario no tiene una sesión activa, **cuando** intenta abrir cualquier pantalla del módulo (incluso mediante enlace directo o recarga del navegador), **entonces** el sistema lo redirige a la pantalla de inicio de sesión y no muestra ningún dato del módulo.

2. **Dado** que un usuario activo ingresa su nombre de usuario y contraseña correctos, **cuando** confirma el inicio de sesión, **entonces** el sistema crea la sesión, muestra su nombre y rol en la barra superior y habilita únicamente los módulos y acciones autorizados para su rol.

3. **Dado** que un usuario ingresa credenciales incorrectas o corresponde a una cuenta desactivada, **cuando** intenta iniciar sesión, **entonces** el sistema rechaza el acceso y muestra un mensaje genérico que no revela cuál de los datos es incorrecto.

4. **Dado** que un usuario tiene una sesión activa, **cuando** selecciona la opción Cerrar sesión, **entonces** el sistema elimina la sesión, lo devuelve a la pantalla de inicio de sesión y bloquea el acceso a las pantallas internas hasta que vuelva a autenticarse.

5. **Dado** que un usuario con sesión activa ejecuta una acción (crear, aprobar, rechazar, cotizar, recepcionar o pagar), **cuando** el sistema guarda la operación, **entonces** registra automáticamente su identificador, nombre y rol como responsable en el documento y en la bitácora de auditoría.

6. **Dado** que un usuario es solicitante de una solicitud de compra, **cuando** intenta autorizarla con su propia sesión aunque tenga también rol de aprobador, **entonces** el sistema bloquea la acción por segregación de funciones e indica que otro aprobador debe revisarla.

---

### Historia de Usuario 16 - Administrar departamentos y centros de costo (Prioridad: P1)

Como administrador del sistema, quiero registrar los departamentos o centros de costo de la empresa, asignar a cada uno su jefe de área aprobador y vincular a cada usuario con el departamento al que pertenece, para que las solicitudes se dirijan al aprobador correcto y cada compra se descuente del presupuesto que corresponde.

**Por qué esta prioridad**: La Historia de Usuario 4 necesita saber qué solicitudes pertenecen al área de cada jefe, y la Historia de Usuario 10 necesita saber de qué presupuesto descontar cada compra. Actualmente no existe ningún lugar donde se defina qué usuario pertenece a qué área ni quién la aprueba, por lo que ambas historias carecen de su dato de origen.

**Prueba Independiente**: Un administrador crea el departamento "Operaciones" con código de centro de costo, le asigna un jefe de área con rol de aprobador y vincula a dos solicitantes; luego uno de esos solicitantes crea una solicitud de compra y se comprueba que la solicitud queda asociada a Operaciones, que aparece únicamente en la bandeja de pendientes de ese jefe y que su monto se compara contra el presupuesto de Operaciones.

**Escenarios de Aceptación**:

1. **Dado** que el administrador está en la gestión de departamentos, **cuando** registra un departamento con nombre, código de centro de costo único y jefe de área aprobador, **entonces** el sistema lo guarda en estado Activo y lo deja disponible para asignar usuarios y presupuestos.

2. **Dado** que el administrador intenta guardar un departamento sin nombre, con un código de centro de costo duplicado o con un jefe que no tiene rol de aprobador, **cuando** confirma la acción, **entonces** el sistema impide el guardado e indica bajo el campo correspondiente qué dato debe corregirse.

3. **Dado** que el administrador crea o edita un usuario, **cuando** le asigna un departamento, **entonces** el sistema guarda la pertenencia y toda solicitud de compra que ese usuario cree queda asociada automáticamente a ese departamento y a su centro de costo.

4. **Dado** que una solicitud de compra pertenece a un departamento, **cuando** se envía a aprobación, **entonces** el sistema la dirige exclusivamente a la bandeja del jefe de área de ese departamento y descuenta el monto comprometido del presupuesto de ese mismo centro de costo.

5. **Dado** que el administrador intenta desactivar o eliminar un departamento que tiene usuarios asignados, presupuesto comprometido o solicitudes en curso, **cuando** confirma la acción, **entonces** el sistema muestra una advertencia con los elementos asociados y bloquea la operación hasta que sean reasignados o concluidos.

---

### Historia de Usuario 17 - Gestionar el catálogo de productos y servicios (Prioridad: P1)

Como Encargado de Compras, quiero mantener un catálogo de productos y servicios con código, descripción, unidad de medida, categoría y precio de referencia, para que los solicitantes elijan los insumos desde una lista oficial en lugar de escribirlos a mano y se puedan detectar compras duplicadas.

**Por qué esta prioridad**: Las Historias de Usuario 2, 5 y 7 trabajan con "productos", pero ninguna define de dónde provienen. Sin catálogo, cada solicitante escribe los insumos a mano, se pierden los precios de referencia y no es posible detectar compras duplicadas, que es uno de los problemas que el módulo busca resolver.

**Prueba Independiente**: Un Encargado de Compras registra el producto "Resma papel carta" con código, unidad "Caja", categoría "Oficina" y precio de referencia en CLP; luego un solicitante crea una solicitud de compra, busca el producto por nombre o código, lo agrega con su cantidad y comprueba que la unidad y el precio de referencia se completan automáticamente. Finalmente, se intenta registrar otro producto con el mismo código y se verifica que el sistema bloquea el guardado.

**Escenarios de Aceptación**:

1. **Dado** el formulario de registro de producto o servicio, **cuando** el Encargado de Compras ingresa código único, descripción, tipo (producto o servicio), unidad de medida, categoría y precio de referencia mayor o igual a cero en CLP, **entonces** el sistema guarda el ítem en estado Activo y lo habilita en los selectores de solicitudes, cotizaciones y órdenes de compra.

2. **Dado** el ingreso de un código ya existente, una descripción vacía o un precio de referencia negativo o no numérico, **cuando** el usuario intenta guardar, **entonces** el sistema impide el registro y muestra un mensaje específico bajo el campo con error.

3. **Dado** que un solicitante está creando una solicitud de compra, **cuando** busca un producto por código, descripción o categoría y lo selecciona, **entonces** el sistema agrega la línea con la unidad de medida y el precio de referencia del catálogo, y calcula el monto estimado de la solicitud a partir de las cantidades.

4. **Dado** que ya existe una solicitud de compra en curso del mismo departamento que incluye el mismo producto, **cuando** un solicitante agrega ese producto a una nueva solicitud, **entonces** el sistema muestra una advertencia de posible compra duplicada con el folio de la solicitud existente antes de permitir el envío.

5. **Dado** un producto o servicio en estado Inactivo, **cuando** un usuario crea una nueva solicitud, cotización u Orden de Compra, **entonces** el sistema lo excluye de las opciones seleccionables, manteniéndolo visible en los documentos históricos que ya lo incluían.

---

### Historia de Usuario 18 - Emitir la Orden de Compra con fecha de entrega y datos de despacho (Prioridad: P1)

Como Encargado de Compras, quiero emitir la Orden de Compra a partir de la cotización aprobada indicando la fecha estimada de entrega, la dirección y las instrucciones de despacho, para que el proveedor sepa cuándo y dónde entregar y el equipo de recepción pueda controlar el cumplimiento de los plazos.

**Por qué esta prioridad**: Sin una fecha comprometida de entrega no funcionan las alertas de atraso del panel de inicio (Historia de Usuario 13) ni es posible evaluar el cumplimiento de los proveedores. Además, esta historia conecta la aprobación de la cotización (Historia de Usuario 3) con la recepción de productos (Historia de Usuario 6), formalizando el paso a estado Emitida.

**Prueba Independiente**: Un Encargado de Compras abre una cotización en estado Aprobado, ingresa una fecha estimada de entrega posterior a la fecha actual, la dirección de despacho y una instrucción para el proveedor, y confirma la emisión. Comprueba que la Orden de Compra pasa a estado Emitida con su fecha de emisión, que aparece en la bandeja del encargado de recepción y que, al simular el vencimiento de la fecha de entrega sin recepción completa, el folio figura en las alertas operativas del panel.

**Escenarios de Aceptación**:

1. **Dado** que el Encargado de Compras abre una cotización en estado Aprobado, **cuando** ingresa la fecha estimada de entrega, la dirección de despacho y, opcionalmente, instrucciones o contacto de recepción, y confirma la emisión, **entonces** el sistema cambia la Orden de Compra a estado Emitida, registra la fecha de emisión y el responsable, y la habilita en la bandeja de órdenes por recibir.

2. **Dado** que el Encargado de Compras intenta emitir la orden sin fecha estimada de entrega, con una fecha inválida o anterior a la fecha de emisión, o sin dirección de despacho, **cuando** confirma la acción, **entonces** el sistema impide la emisión e indica qué dato debe corregirse.

3. **Dado** una Orden de Compra en estado Emitida o Recibida parcialmente, **cuando** su fecha estimada de entrega vence sin recepción completa, **entonces** el sistema la marca como atrasada y la incluye en las Alertas Operativas del panel de inicio con su folio y proveedor.

4. **Dado** una Orden de Compra Emitida, **cuando** el encargado de recepción o el Encargado de Compras abre su detalle o su versión imprimible, **entonces** el sistema muestra la fecha estimada de entrega, la dirección y las instrucciones de despacho junto a los datos del proveedor y los ítems.

5. **Dado** que se requiere modificar la fecha estimada de entrega de una orden Emitida por acuerdo con el proveedor, **cuando** el Encargado de Compras guarda la nueva fecha con un motivo obligatorio, **entonces** el sistema actualiza la fecha, conserva la fecha original y registra el cambio en la bitácora de auditoría.

---



### Casos Límite

- ¿Qué ocurre cuando un usuario intenta guardar una entidad sin nombre o código obligatorio?
- ¿Cómo gestiona el sistema una búsqueda que no devuelve coincidencias?
- ¿Qué ocurre si un usuario intenta editar o eliminar una entidad que ya no existe?
- ¿Qué ocurre cuando un usuario introduce una fecha objetivo que no es una fecha de calendario válida?
- ¿Qué ocurre con los documentos de una entidad cuando esta se elimina?
- ¿Qué ocurre cuando un usuario introduce una fecha final anterior a la fecha inicial en un documento?
- ¿Qué ocurre cuando la configuración declara un campo personalizado cuya clave choca con un nombre de campo base?
- ¿Qué ocurre cuando la configuración referencia un tipo de campo desconocido o una definición de transición de ciclo de vida inválida?
- ¿Qué ocurre cuando los registros almacenados contienen valores de campos personalizados que ya no están declarados en la configuración?
- ¿Qué ocurre cuando un usuario abre la aplicación directamente en la pantalla de gestión o búsqueda (p. ej., vía enlace profundo o recarga del navegador) sin pasar por el panel de inicio?
- ¿Qué ocurre cuando un usuario pulsa el botón atrás del navegador estando en la pantalla de gestión o búsqueda?
- ¿Qué ocurre si un usuario navega fuera de la pantalla de gestión mientras un formulario aún tiene cambios sin guardar?
- ¿Permanecen intactas las entidades y los documentos al navegar entre el panel, la gestión y la búsqueda?
- ¿Qué ocurre cuando el panel se abre con cero entidades o cero documentos (valores estadísticos)?
- ¿Qué ocurre cuando el color de acento configurado no es un valor de color válido?
- ¿Cómo mantiene la barra lateral contraída las etiquetas de módulo accesibles en ventanas gráficas estrechas?
- ¿Qué ocurre cuando el proveedor entrega más unidades de las solicitadas en la Orden de Compra?
- ¿Qué ocurre si se intenta registrar una recepción sobre una Orden de Compra que ya está Recibida por completo, anulada o aún no emitida?
- ¿Qué ocurre cuando una entrega llega en varias partes en días distintos?
- ¿Qué ocurre si dos encargados intentan registrar la recepción de la misma orden al mismo tiempo?
- ¿Qué ocurre si una solicitud ya tiene una cotización generada y otro usuario intenta cotizarla de nuevo?
- ¿Qué ocurre si dos encargados abren la misma solicitud autorizada al mismo tiempo?
- ¿Qué ocurre si la solicitud es modificada, anulada o devuelta después de abrirla pero antes de generar la cotización?

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: El sistema DEBE permitir a los usuarios crear un registro de entidad con al menos un nombre y un código.
- **FR-002**: El sistema DEBE permitir a los usuarios editar los detalles de un registro de entidad existente.
- **FR-003**: El sistema DEBE permitir a los usuarios eliminar un registro de entidad existente.
- **FR-004**: El sistema DEBE permitir a los usuarios buscar registros de entidad por nombre, código, categoría u otras palabras clave descriptivas.
- **FR-005**: El sistema DEBE mostrar una lista clara de entidades e indicar cuándo ningún resultado coincide con una búsqueda.
- **FR-006**: El sistema DEBE presentar retroalimentación clara cuando falta información obligatoria o no se puede completar una acción.
- **FR-007**: El sistema DEBE mantener los datos de entidad consistentes tras operaciones de creación, edición y eliminación.
- **FR-008**: El sistema DEBE permitir a los usuarios añadir, editar y eliminar detalles de documentos de una entidad.
- **FR-009**: El sistema DEBE asociar cada documento exactamente a una entidad y eliminar los documentos asociados cuando la entidad se elimina.
- **FR-010**: El sistema DEBE mostrar un panel de inicio como vista inicial, con botones de acción rápida claramente etiquetados para las tareas ERP clave.
- **FR-011**: El sistema DEBE envolver cada pantalla en un marco de espacio de trabajo persistente compuesto por una barra superior con marca y una barra lateral de navegación de módulos.
- **FR-012**: La barra lateral DEBE proporcionar botones de módulo para Panel, Entidades, Documentos y Buscar, etiquetados desde la configuración del módulo.
- **FR-013**: El botón de módulo Entidades DEBE mostrar el contenido de gestión de entidades.
- **FR-014**: El botón de módulo Documentos DEBE mostrar el contenido de gestión de documentos en la pantalla de gestión.
- **FR-015**: El botón de módulo Panel DEBE devolver al usuario al panel de inicio.
- **FR-016**: La pantalla de gestión NO DEBE mostrar la lista de entidades.
- **FR-017**: La pantalla de gestión DEBE proporcionar la funcionalidad de crear, editar y eliminar entidades.
- **FR-018**: La pantalla de gestión DEBE proporcionar la funcionalidad de crear, editar y eliminar documentos.
- **FR-019**: El sistema DEBE navegar a una pantalla de búsqueda dedicada cuando se selecciona el botón Buscar en la barra lateral.
- **FR-020**: La pantalla de búsqueda DEBE permitir buscar entidades por nombre, código, categoría, descripción o fecha objetivo.
- **FR-021**: La pantalla de búsqueda DEBE ser accesible tanto desde la barra lateral como desde la acción rápida de buscar registros del panel.
- **FR-022**: El sistema DEBE mantener los datos de entidades y documentos intactos y consistentes durante la navegación entre pantallas.
- **FR-023**: El sistema DEBE cargar la configuración del módulo al arrancar y aplicarla en todas las pantallas.
- **FR-024**: El sistema DEBE retroceder a los valores predeterminados integrados (terminología Entidad/Documento, sin campos personalizados, sin ciclo de vida) cuando no se proporciona configuración.
- **FR-025**: El sistema DEBE informar claramente de una configuración inválida o conflictiva en lugar de fallar silenciosamente.
- **FR-026**: El sistema DEBE mostrar los campos personalizados declarados en los formularios de creación/edición con tipos de entrada que coincidan con sus tipos declarados.
- **FR-027**: El sistema DEBE validar los valores de campos personalizados, incluidos los obligatorios, antes de guardar, usando la misma experiencia de retroalimentación que la validación base.
- **FR-028**: El sistema DEBE incluir los valores de campos personalizados en los resultados de búsqueda y mostrarlos en listas y vistas de detalle.
- **FR-029**: El sistema DEBE derivar todas las etiquetas visibles para el usuario de la configuración del módulo en lugar de texto fijo en el código.
- **FR-030**: El sistema DEBE aplicar las transiciones de estado configuradas en los documentos independientemente de cómo se envíe un cambio.
- **FR-031**: El sistema DEBE mantener el estado del documento como texto libre cuando no hay ciclo de vida configurado.
- **FR-032**: El sistema DEBE mantener el renderizado de listas y la búsqueda ágiles y correctos para conjuntos de datos de al menos 500 registros de entidad.
- **FR-033**: El panel DEBE ofrecer al menos cuatro botones de acción rápida: nueva entidad, nuevo documento, abrir gestión de entidades y buscar registros.
- **FR-034**: Activar la acción rápida de nueva entidad o nuevo documento DEBE abrir el área de gestión correspondiente con un formulario vacío listo para introducir datos.
- **FR-035**: El panel DEBE mostrar tarjetas de estadísticas con el número de entidades y documentos almacenados, actualizadas cada vez que se muestra el panel.
- **FR-036**: La barra superior DEBE mostrar un logotipo derivado del nombre del módulo junto con el nombre del módulo configurado en cada pantalla.
- **FR-037**: La barra lateral DEBE resaltar visualmente el módulo activo en cada pantalla.
- **FR-038**: La configuración PUEDE definir un color de acento; el sistema DEBE aplicarlo consistentemente en todo el marco y retroceder de forma segura a los valores integrados cuando esté ausente o sea inválido.
- **FR-039**: En ventanas gráficas estrechas, la barra lateral DEBE contraerse a una columna de iconos manteniéndose operable.
- **FR-040**: El sistema DEBE ofrecer al encargado de recepción una bandeja con las Órdenes de Compra en estado Emitida o Recibida parcialmente.
- **FR-041**: El sistema DEBE mostrar, por cada línea de la Orden de Compra, la cantidad solicitada, la cantidad recibida acumulada y la cantidad pendiente.
- **FR-042**: El sistema DEBE permitir registrar, por cada línea, la cantidad recibida y, opcionalmente, una cantidad rechazada con su motivo obligatorio.
- **FR-043**: El sistema DEBE impedir guardar una recepción con cantidades negativas, no numéricas o mayores a la cantidad pendiente, indicando la línea a corregir.
- **FR-044**: El sistema DEBE guardar cada recepción como un registro propio asociado a la Orden de Compra, con fecha, hora, responsable y observaciones, sin sobrescribir recepciones anteriores.
- **FR-045**: El sistema DEBE cambiar el estado de la Orden de Compra a Recibida cuando todas sus líneas estén completas, y a Recibida parcialmente cuando quede alguna cantidad pendiente.
- **FR-046**: El sistema DEBE permitir registrar recepciones únicamente a usuarios con el rol de encargado de recepción.
- **FR-047**: El sistema NO DEBE permitir registrar recepciones sobre órdenes Recibidas por completo, anuladas o no emitidas.

### Requisitos de Extensibilidad *(obligaciones del módulo base)*

Los módulos personalizados construidos sobre esta base DEBEN poder:

- **XR-001**: Extender los registros de entidad y documento con campos adicionales específicos del dominio sin cambiar la estructura de almacenamiento base.
- **XR-002**: Reetiquetar pantallas, pestañas, formularios y listas con terminología específica del módulo sin alterar el comportamiento de navegación.
- **XR-003**: Añadir reglas de validación específicas del módulo junto a las reglas de validación base.
- **XR-004**: Apoyarse en el módulo base para generación de identidad, marcas de tiempo, integridad referencial entre entidades y documentos, y eliminación en cascada.
- **XR-005**: Remarcar el espacio de trabajo —nombre del módulo, logotipo derivado y color de acento— únicamente mediante configuración.

### Entidades Clave *(incluir si la funcionalidad implica datos)*

- **Entidad**: Un registro de datos maestros gestionado por el módulo, que incluye su nombre, código de negocio, detalles descriptivos, categoría de clasificación, una fecha objetivo opcional y un entity_id autogenerado. Los módulos personalizados definen qué representa una Entidad en el mundo real (p. ej., cliente, producto, activo).
- **Documento**: Detalles transaccionales adjuntos a una entidad, vinculados a ella por el entity_id de la entidad. Los módulos personalizados definen qué representa un Documento (p. ej., pedido, factura, contrato).
- **ModuleConfig**: El objeto de adaptación cargado al arrancar que define el nombre del módulo, las etiquetas de terminología, las definiciones de campos personalizados y el ciclo de vida de estados de documentos. Consulte data-model.md para su forma completa.
- **Recepción**: Registro de una entrega física asociada a una Orden de Compra; incluye fecha y hora, encargado responsable, observaciones generales y sus líneas de recepción.
- **Línea de Recepción**: Detalle de un producto dentro de una recepción; indica la línea de la Orden de Compra a la que corresponde, la cantidad recibida conforme, la cantidad rechazada y el motivo del rechazo.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Los usuarios pueden crear una nueva entidad y verla en la lista en menos de 2 minutos.
- **SC-002**: Los usuarios pueden encontrar una entidad existente mediante la búsqueda en menos de 10 segundos tras introducir un término relevante.
- **SC-003**: Al menos el 90% de los usuarios de prueba pueden completar tareas de crear, editar, eliminar y buscar sin ayuda.
- **SC-004**: El sistema sigue siendo utilizable para un conjunto de datos de al menos 500 registros de entidad sin pérdida de funcionalidad central.
- **SC-005**: Un usuario puede alcanzar las pantallas de gestión y búsqueda desde el panel o la barra lateral en menos de 10 segundos en el primer uso.
- **SC-006**: Toda la funcionalidad existente de gestión de entidades y documentos sigue operativa tras el rediseño del marco ERP y el panel (sin regresiones).
- **SC-007**: Los usuarios pueden navegar entre las pantallas de panel, gestión y búsqueda sin perder ninguna entidad ni documento almacenado.
- **SC-008**: Un desarrollador puede producir un módulo adaptado usando solo el archivo de configuración, con cero modificaciones en archivos fuente centrales.
- **SC-009**: Cada pantalla presenta el mismo marco con marca, y los usuarios pueden identificar en qué módulo están de un vistazo.
- **SC-010**: Las estadísticas de registros mostradas en el panel siempre coinciden con el número de entidades y documentos almacenados.
- **SC-011**: Un encargado de recepción puede registrar la recepción de una Orden de Compra de hasta 10 líneas en menos de 3 minutos.
- **SC-012**: El 100% de las recepciones registradas quedan asociadas a su Orden de Compra con fecha, responsable y cantidades, y la cantidad pendiente de cada línea siempre coincide con lo solicitado menos lo recibido.
- **SC-013**: Ninguna Orden de Compra puede quedar en estado Recibida mientras alguna de sus líneas tenga cantidades pendientes.

## Suposiciones

- El módulo base gestiona datos para un único espacio de trabajo en lugar de una base de datos multiinquilino compartida.
- La adaptación a un módulo específico se realiza mediante un archivo de configuración del módulo en lugar de editando archivos fuente centrales.
- Cada entidad incluye información básica suficiente para identificación y seguimiento; los módulos personalizados aportan los campos específicos del dominio.
- La versión inicial se centra en la gestión central de datos maestros y documentos en lugar de capacidades ERP avanzadas como flujos de aprobación, períodos de contabilización o informes.
- La búsqueda se realiza sobre los registros de entidad almacenados.
- La pantalla de gestión consolida los formularios de añadir/editar entidad y añadir/editar documento en una sola pantalla de gestión.
- La navegación entre áreas ocurre mediante una barra lateral persistente; la pantalla de gestión aloja ambos paneles de gestión y no muestra la lista de entidades.
- El logotipo se genera como un monograma SVG en línea derivado del nombre del módulo; no se requieren recursos de imagen externos.
- Se puede configurar un color de acento opcional para la marca; el resto de la paleta base permanece fija.
- Solo se muestra una pantalla a la vez; no hay diseño lado a lado del contenido de gestión y búsqueda.
- La navegación entre pantallas se maneja dentro de la aplicación (p. ej., cambio de vistas), y el botón atrás del navegador debe comportarse de forma predecible.
- Los datos siguen persistiéndose en el localStorage del navegador y no se ven afectados por la navegación entre pantallas.
- La pantalla de búsqueda se centra en encontrar y ver entidades; la edición permanece en la pantalla de gestión.
- La recepción se registra contra una Orden de Compra existente; no se reciben productos sin orden previa. Las entregas en exceso no se aceptan como recibidas y se gestionan fuera del sistema con el proveedor.
- El ciclo de vida de la Orden de Compra (Historia de Usuario 2) incorpora el estado intermedio Recibida parcialmente entre Emitida y Recibida.
- La actualización de existencias de inventario a partir de la recepción queda fuera del alcance de esta historia.
- El contenido del usuario introducido por el usuario (nombres, descripciones, notas de documentos) DEBE sanitizarse antes de renderizarse en el DOM para prevenir ataques de inyección de scripts (XSS). El módulo base DEBE escapar HTML y atributos de eventos al mostrar datos de localStorage.

