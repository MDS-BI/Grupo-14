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
   
### Historia de Usuario 1 - Crear y organizar entidades (Prioridad: P1)
Como usuario de negocio, quiero crear entradas de entidad con detalles claros para poder construir y mantener los datos maestros del módulo.

**Por qué esta prioridad**: Este es el valor central del producto porque, sin crear entidades, el resto de la experiencia no puede aportar valor.

**Prueba Independiente**: Un usuario puede abrir el módulo, añadir una nueva entidad y verla aparecer en la lista.

**Escenarios de Aceptación**:

1. **Dado** que un usuario está viendo la lista de entidades, **cuando** crea una nueva entidad con un nombre y un código, **entonces** la nueva entidad se guarda y aparece en la lista.
2. **Dado** que un usuario está creando una entidad, **cuando** deja la información obligatoria en blanco, **entonces** el sistema impide guardar y explica qué se necesita.

---

### Historia de Usuario 2 - Encargado de Compras (Prioridad: P1)
Como Encargado de Compras, quiero generar un documento de Orden de Compra vinculado a un proveedor específico, calculando los subtotales, impuestos y el total, para formalizar la transacción de los insumos solicitados. 

**Por qué esta prioridad**: Esta función es el núcleo del módulo, ya que formaliza legal y financieramente la adquisición de insumos con los proveedores externos, resolviendo problemas críticos como las compras duplicadas por falta de comunicación y el nulo control sobre los gastos. Además, garantiza que el sistema registre los campos obligatorios de una transacción ERP (serie, folio, subtotal, descuento, impuesto y total) para saber exactamente cuánto se gasta y a quién se le debe.

**Prueba Independiente**: Se realiza simulando la creación de una Orden de Compra asociada a un id_proveedor ficticio. En esta simulación, se ingresan los productos junto con sus cantidades y precios unitarios dentro de la tabla intermedia llamada Detalle_Orden. El objetivo de esta prueba es comprobar que la suma de los valores detallados genere los totales correctos en el documento principal. Además, se debe verificar que el ciclo de vida de la orden se active de forma adecuada desde los parámetros de configuración.
**Escenarios de Aceptación**:

1. **Dada** una Orden de Compra creada con un id_proveedor ficticio, cuando se agregan productos con cantidades y precios unitarios en la tabla Detalle_Orden, el sistema debe calcular matemáticamente los subtotales, descuentos, impuestos y el total final.
2. **Dada** la generación de un nuevo documento transaccional, cuando se asignan los datos, el sistema debe guardar correctamente la persistencia del ID del proveedor asignado y de los artículos comprados.
3. **Dada** una orden formalizada y vinculada a la configuración del módulo, cuando el proceso operativo avanza, el documento debe transicionar correctamente por los estados de su ciclo de vida (Emitida, Recibida, Pagada).


### Historia de Usuario 3 - Panel de inicio con acciones rápidas y estadísticas de registros (Prioridad: P1)

Como usuario de negocio, quiero aterrizar en un panel estilo ERP con botones de acción rápida claramente etiquetados para las tareas clave y totales de registros de un vistazo al abrir la aplicación, para poder empezar a trabajar de inmediato.

**Por qué esta prioridad**: El panel es el punto de entrada de la aplicación. Nada más puede alcanzarse sin él, y las acciones rápidas son la ruta más rápida hacia cada flujo de trabajo central.

**Prueba Independiente**: Un usuario abre la aplicación, ve un panel con múltiples botones de acción rápida y estadísticas de registros, inicia una nueva entidad o documento con un solo clic y ve estadísticas que reflejan los datos almacenados.

**Escenarios de Aceptación**:

1. **Dado** que el usuario abre la aplicación, **cuando** la aplicación carga, **entonces** se muestra el panel de inicio con al menos cuatro botones de acción rápida claramente etiquetados que cubren las tareas ERP clave: crear una nueva entidad, crear un nuevo documento, abrir la gestión de entidades y buscar registros.
2. **Dado** que se muestra el panel, **cuando** el usuario activa la acción de nueva entidad, **entonces** la aplicación abre el área de gestión de entidades con un formulario vacío listo para introducir datos.
3. **Dado** que se muestra el panel, **cuando** el usuario activa la acción de nuevo documento, **entonces** la aplicación abre el área de gestión de documentos con un formulario vacío listo para introducir datos.
4. **Dado** que se muestra el panel, **cuando** el usuario activa la acción de buscar registros, **entonces** la aplicación abre la pantalla de búsqueda con el campo de búsqueda enfocado.
5. **Dadas** entidades y documentos almacenados, **cuando** el usuario ve el panel, **entonces** las tarjetas de estadísticas muestran el recuento actual de entidades y documentos.
6. **Dado** que el usuario crea o elimina registros en otra parte de la aplicación, **cuando** vuelve al panel, **entonces** las estadísticas reflejan el cambio.

---

### Historia de Usuario 4 - Revisar y autorizar solicitudes de compra del departamento (Prioridad: P1)

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

### Historia de Usuario 5 - Definir un perfil de configuración del módulo (Prioridad: P1)

Como desarrollador de módulos, quiero declarar un único archivo de configuración que defina la identidad, terminología, campos personalizados y reglas de mi módulo, para adaptar el módulo base en un módulo específico sin modificar su código central.

**Por qué esta prioridad**: La adaptación mediante configuración es lo que convierte este proyecto de una aplicación fija en una base reutilizable. Sin ella, cada módulo personalizado requeriría editar archivos fuente centrales, lo que frustra el propósito de la plantilla; todas las historias de personalización posteriores dependen de que este mecanismo exista primero.

**Prueba Independiente**: Un desarrollador proporciona un archivo de configuración que define un perfil de Ventas (nombre del módulo, mapeos Entidad→Cliente, campos personalizados, ciclo de vida), y la aplicación se presenta plenamente como un módulo de Ventas; al quitar el archivo se restauran los valores predeterminados de la base sin errores.

**Escenarios de Aceptación**:

1. **Dado** que un archivo de configuración define el nombre del módulo, **cuando** la aplicación carga, **entonces** el panel de inicio y el marco del espacio de trabajo muestran el nombre configurado.
2. **Dada** una configuración completa (nombre, mapeos de términos, campos personalizados, ciclo de vida), **cuando** la aplicación carga, **entonces** el módulo se presenta plenamente bajo la identidad configurada sin que se vean términos del módulo base en ningún sitio.
3. **Dado** que no se proporciona configuración, **cuando** la aplicación carga, **entonces** la aplicación retrocede a los valores predeterminados integrados Entidad/Documento sin errores.
4. **Dada** una configuración con valores inválidos o conflictivos, **cuando** la aplicación carga, **entonces** el sistema informa del problema con claridad en lugar de fallar silenciosamente.

---

### Historia de Usuario 6 - Verificar y registrar la recepción de productos (Prioridad: P1)

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

### Historia de Usuario 9 - Registrar una fecha objetivo (Prioridad: P2)
Como usuario de negocio, quiero adjuntar una fecha objetivo opcional a una entidad para planificar y ordenar los registros según cuándo vence algo.

**Por qué esta prioridad**: La planificación consciente de fechas mejora el valor central cuando el conjunto de datos crece, pero no es necesaria para la gestión básica.

**Prueba Independiente**: Un usuario puede fijar una fecha en una entidad y verla mostrada en la lista.

**Escenarios de Aceptación**:

1. **Dado** que un usuario está creando o editando una entidad, **cuando** introduce una fecha objetivo, **entonces** la fecha se guarda y se muestra en la lista.
2. **Dada** una entidad con fecha fijada, **cuando** el usuario ve la lista, **entonces** las entidades con fechas pueden identificarse de un vistazo.
3. **Dado** que un usuario deja la fecha en blanco, **cuando** guarda la entidad, **entonces** la entidad igualmente se guarda sin fecha (campo opcional).

---

### Historia de Usuario 10 - Registrar los detalles de documentos de una entidad (Prioridad: P2)
Como usuario de negocio, quiero registrar detalles de documentos para una entidad, para mantener la actividad transaccional organizada junto a cada registro de datos maestros.

**Por qué esta prioridad**: Los documentos aportan valor operativo práctico una vez que las entidades están gestionadas, pero no son necesarios para la gestión central.

**Prueba Independiente**: Un usuario puede añadir un documento a una entidad y ver los detalles del documento mostrados junto a esa entidad.

**Escenarios de Aceptación**:

1. **Dada** una entidad en la lista, **cuando** el usuario añade un documento con detalles, **entonces** el documento se guarda y queda asociado a esa entidad.
2. **Dado** un documento existente para una entidad, **cuando** el usuario selecciona esa entidad en la pantalla de gestión, **entonces** los detalles del documento se muestran en la vista de gestión de documentos.
3. **Dada** una entidad eliminada, **cuando** se confirma la eliminación, **entonces** sus documentos asociados también se eliminan.
4. **Dado** que un usuario está creando un documento, **cuando** deja la información obligatoria del documento en blanco, **entonces** el sistema impide guardar y explica qué se necesita.

---

### Historia de Usuario 11 - Buscar entidades en una pantalla dedicada (Prioridad: P2)

Como usuario de negocio, quiero una pantalla de búsqueda dedicada para encontrar rápidamente entidades sin que los formularios de edición saturen la vista.

**Por qué esta prioridad**: La recuperación rápida es valiosa cuando el conjunto de datos crece, y una pantalla separada mantiene enfocada la experiencia de gestión, pero la búsqueda no es necesaria para la gestión básica.

**Prueba Independiente**: Un usuario puede abrir la pantalla de búsqueda desde la barra lateral o una acción rápida, introducir un término de búsqueda y ver solo las entidades coincidentes.

**Escenarios de Aceptación**:

1. **Dado** que el usuario está en la pantalla de búsqueda, **cuando** introduce un término coincidente, **entonces** solo se muestran las entidades coincidentes.
2. **Dada** una búsqueda sin coincidencias, **cuando** el usuario envía la búsqueda, **entonces** se muestra un estado vacío claro y puede volver a intentarlo.
3. **Dadas** cientos de entidades almacenadas, **cuando** el usuario busca desde la pantalla de búsqueda, **entonces** los resultados aparecen con prontitud sin retraso perceptible.
4. **Dado** que el usuario está en la pantalla de búsqueda, **cuando** activa el botón Panel en la barra lateral, **entonces** vuelve al panel de inicio.

---

### Historia de Usuario 12 - Configurar el ciclo de vida de estados de documentos (Prioridad: P2)

Como desarrollador de módulos, quiero definir los estados permitidos de los documentos y las transiciones permitidas, para que los documentos sigan el ciclo de vida del dominio en lugar de aceptar texto de estado arbitrario.

**Por qué esta prioridad**: Los módulos reales necesitan ciclos de vida controlados (p. ej., cotización → pedido → facturado), pero el estado de texto libre sigue siendo aceptable para extensiones simples, así que esto mejora la base sin ser necesario para la adaptación básica. Esta historia depende del perfil de configuración (Historia de Usuario 5).

**Prueba Independiente**: Un desarrollador configura un ciclo de vida cotización→pedido→facturado; el control de estado ofrece solo estados siguientes válidos, las transiciones inválidas se rechazan con una explicación, y el estado es visible de un vistazo en las listas.

**Escenarios de Aceptación**:

1. **Dado** un ciclo de vida configurado, **cuando** el usuario edita el estado de un documento, **entonces** solo se ofrecen los estados alcanzables mediante transiciones permitidas.
2. **Dado** que se intenta una transición inválida por cualquier vía, **cuando** se envía, **entonces** el sistema la rechaza con una explicación clara.
3. **Dado** un ciclo de vida configurado, **cuando** el usuario ve listas o detalles de documentos, **entonces** el estado actual es identificable de un vistazo.
4. **Dado** que no hay ciclo de vida configurado, **cuando** se editan documentos, **entonces** el estado permanece como texto libre igual que en el módulo base sin modificar.

---

### Historia de Usuario 13 - Marco de espacio de trabajo ERP con marca (Prioridad: P1)

Como usuario de negocio, quiero un espacio de trabajo estilo ERP consistente, con una barra superior con marca y una barra lateral de módulos presentes en cada pantalla, para que la aplicación se sienta como un sistema empresarial coherente en lugar de páginas sueltas.

**Por qué esta prioridad**: El marco aporta la marca y la navegación de todas las demás pantallas; construirlo como envoltorio evita tocar cada historia por separado y da al módulo su identidad ERP. Depende del perfil de configuración (Historia de Usuario 5) para el nombre del módulo y la terminología, y reestructura la navegación antes proporcionada por los botones de bienvenida y las pestañas de gestión (Historias de Usuario 3 y 4).

**Prueba Independiente**: En cada pantalla, una barra superior muestra un logotipo derivado del nombre del módulo junto al nombre del módulo, una barra lateral ofrece botones de módulo para Panel, Entidades, Documentos y Buscar con el módulo activo resaltado visualmente, y navegar entre módulos nunca pierde datos.

**Escenarios de Aceptación**:

1. **Dada** cualquier pantalla mostrada, **cuando** el usuario mira la página, **entonces** es visible una barra superior que contiene un logotipo SVG en línea derivado del nombre del módulo y el nombre del módulo configurado.
2. **Dada** cualquier pantalla mostrada, **cuando** el usuario mira la barra lateral, **entonces** se muestran botones de módulo para Panel, Entidades, Documentos y Buscar usando la terminología configurada.
3. **Dado** que el usuario está en cualquier pantalla, **cuando** mira la barra lateral, **entonces** el botón del módulo activo está resaltado visualmente.
4. **Dado** que la ventana gráfica es estrecha, **cuando** se usa la aplicación en una pantalla pequeña, **entonces** la barra lateral se contrae a una columna de iconos manteniéndose utilizable y etiquetada de forma accesible.
5. **Dada** una configuración que define un color de acento, **cuando** cualquier pantalla carga, **entonces** el marco lo usa consistentemente para resaltados y controles principales; sin valor configurado o con un valor inválido, se usan los valores predeterminados integrados sin errores.
6. **Dado** que el usuario navega entre módulos mediante la barra lateral, **cuando** inspecciona sus datos después, **entonces** todas las entidades y documentos almacenados permanecen intactos.

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

