# Tareas: Módulo Adquisiciones y Compras (Módulo Base ERP)

**Entrada**: Documentos de diseño desde `/specs/001-erp-base-module/`
**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para las historias de usuario), research.md, data-model.md, contracts/

**Nota de reorganización**: esta lista se alinea con las historias de usuario vigentes en `spec.md` (HU1, HU2, HU3, HU4, HU6, HU7 y HU8). No existe una HU5 en `spec.md`; por eso la numeración de historias salta de US4 a US6. Las tareas base ya entregadas se conservan marcadas como completadas para mantener la trazabilidad.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Historia]**: Historia de usuario a la que pertenece la tarea (US1, US2, US3, US4, US6, US7, US8)
- Incluir rutas de archivo exactas en las descripciones

## Convenciones de Rutas

- Aplicación web de un solo proyecto: `src/`, `tests/` e `index.html` en la raíz del repositorio
- Componentes de interfaz en `src/components/`
- Lógica de datos en `src/storage.js`, configuración en `src/module-config.js` y permisos en `src/auth.js`

---

## Fase 1: Configuración (Infraestructura Compartida)

**Propósito**: Inicializar la estructura Vite y las herramientas compartidas.

- [X] T001 Crear la estructura de la aplicación Vite con `src/`, `tests/` y archivos de configuración
- [X] T002 Instalar las dependencias de Vite y Vitest para el proyecto
- [X] T003 [P] Configurar el linting y formateo para la aplicación JavaScript ligera

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: Base ya entregada más la infraestructura transversal que necesitan las historias de roles, órdenes y recepción.

**⚠️ CRÍTICO**: Ninguna historia de usuario puede comenzar hasta completar las tareas pendientes de esta fase.

- [X] T004 Crear la capa de almacenamiento y validación de entidades y documentos en `src/storage.js`
- [X] T005 [P] Implementar el cargador, normalización y validación de configuración en `src/module-config.js`
- [X] T006 [P] Construir el marco del espacio de trabajo (barra superior, barra lateral) y el panel en `src/components/shell.js` y `src/components/dashboard.js`
- [X] T007 [P] Definir el catálogo de roles (administrador, solicitante, aprobador, encargado de compras, encargado de recepción) y sus permisos en `src/auth.js`
- [X] T008 Implementar el contexto de sesión y el guard `can(permission)` en `src/auth.js`
- [X] T009 [P] Añadir claves y helpers de persistencia para usuarios, solicitudes, recepciones y líneas de recepción en `src/storage.js`
- [X] T010 [P] Activar `lineasDetalle` en `userConfig` y validar `unidadesMedida`, `maxPorcentajeDescuento` y `camposExtra` en `src/module-config.js`
- [X] T011 Integrar `applyTotalesToCabecera` en el guardado de documentos para recalcular subtotal, impuesto y total desde las líneas en `src/storage.js`
- [X] T012 [P] Crear utilidades de pruebas y datos semilla de roles en `tests/setup/roles.js`

**Punto de control**: La base, los roles y el cálculo de totales están listos; las historias pueden implementarse sin tocar infraestructura compartida.

---

## Fase 3: Historia de Usuario 1 - Administrar usuarios y permisos del módulo (Prioridad: P1) 🎯 MVP

**Objetivo**: Permitir al administrador crear usuarios, asignarles rol y controlar el acceso a vistas y acciones según sus permisos.

**Prueba Independiente**: Un administrador crea un usuario con rol Solicitante y verifica que ese usuario solo accede a las vistas y acciones permitidas; además, el listado muestra todos los usuarios con su rol y no permite desactivar a quien tiene trámites pendientes.

### Pruebas para la Historia de Usuario 1

- [X] T013 [P] [US1] Añadir pruebas unitarias de validación de usuarios, asignación de rol y bloqueo de desactivación en `tests/unit/auth.test.js`
- [X] T014 [P] [US1] Añadir pruebas de integración de la gestión de usuarios y la navegación restringida por rol en `tests/integration/user-management.test.js`

### Implementación de la Historia de Usuario 1

- [X] T015 [P] [US1] Implementar el CRUD de usuarios (`loadUsers`, `addUser`, `updateUser`, `deactivateUser`) en `src/storage.js`
- [X] T016 [P] [US1] Añadir el marcado de la vista de gestión de usuarios (listado, formulario, selector de rol) en `index.html`
- [X] T017 [US1] Crear `src/components/user-management.js` para renderizar el listado, asignar roles y activar/desactivar usuarios
- [X] T018 [US1] Aplicar el guard de permisos a la navegación por módulos y a las acciones en `src/app.js`
- [X] T019 [US1] Impedir la desactivación de usuarios con solicitudes u órdenes pendientes y mostrar la advertencia en `src/storage.js` y `src/components/user-management.js`
- [X] T020 [US1] Añadir un selector de sesión/usuario para verificar el acceso por rol en `src/components/shell.js`
- [X] T021 [P] [US1] Dar estilo a la vista de usuarios y a las insignias de rol en `src/styles.css`

**Punto de control**: La gestión de usuarios y permisos funciona y es comprobable de forma independiente.

---

## Fase 4: Historia de Usuario 7 - Solicitar productos y servicios con justificación (Prioridad: P1)

**Objetivo**: Permitir al solicitante registrar una solicitud de compra con justificación obligatoria y estado inicial "Pendiente de aprobación".

**Prueba Independiente**: Un solicitante crea una solicitud con productos y una justificación; el sistema la guarda como Pendiente de aprobación y bloquea el envío si la justificación está vacía. La justificación se muestra completa en el detalle y antes de los botones de aprobar/rechazar.

### Pruebas para la Historia de Usuario 7

- [X] T022 [P] [US7] Añadir pruebas unitarias de validación de solicitudes (justificación obligatoria, estado inicial) en `tests/unit/requisition.test.js`
- [X] T023 [P] [US7] Añadir pruebas de integración de creación, historial y visualización de la justificación en `tests/integration/requisition.test.js`

### Implementación de la Historia de Usuario 7

- [X] T024 [P] [US7] Implementar la colección de solicitudes y su validación (justificación obligatoria, estado inicial "Pendiente de aprobación") en `src/storage.js`
- [X] T025 [P] [US7] Añadir el marcado del formulario de solicitud (productos/servicios, justificación, envío) en `index.html`
- [X] T026 [US7] Crear `src/components/requisition-form.js` con justificación obligatoria y líneas de productos/servicios
- [X] T027 [US7] Crear `src/components/requisition-list.js` para mostrar el historial y el detalle con la justificación completa
- [X] T028 [US7] Conectar la creación y el listado de solicitudes a la navegación y al panel en `src/app.js` y `src/components/dashboard.js`
- [X] T029 [US7] Exponer la justificación en el detalle del aprobador, antes de las acciones de aprobar/rechazar, en `src/components/requisition-list.js`
- [X] T030 [P] [US7] Dar estilo al formulario, al campo de justificación y al historial en `src/styles.css`

**Punto de control**: El solicitante puede crear y consultar solicitudes justificadas de forma independiente.

---

## Fase 5: Historia de Usuario 4 - Revisar y autorizar solicitudes de compra del departamento (Prioridad: P1)

**Objetivo**: Permitir al jefe de área revisar, autorizar o rechazar las solicitudes de su departamento, con control presupuestario y motivo de rechazo obligatorio.

**Prueba Independiente**: Un aprobador abre la bandeja de pendientes de su departamento, revisa una solicitud con su justificación y líneas, autoriza una (pasa a la cola de compras) y rechaza otra exigiendo un motivo; sin motivo, el sistema mantiene el estado pendiente.

### Pruebas para la Historia de Usuario 4

- [X] T031 [P] [US4] Añadir pruebas unitarias de autorización, rechazo y motivo obligatorio en `tests/unit/area-approval.test.js`
- [X] T032 [P] [US4] Añadir pruebas de integración de bandeja por departamento, detalle con presupuesto y flujos de autorizar/rechazar en `tests/integration/area-approval.test.js`

### Implementación de la Historia de Usuario 4

- [X] T033 [P] [US4] Extender las solicitudes con departamento, solicitante, partida presupuestaria y campos de aprobación en `src/storage.js`
- [X] T034 [P] [US4] Añadir el marcado de la bandeja del aprobador (pendientes, detalle, saldo presupuestario, botones autorizar/rechazar) en `index.html`
- [X] T035 [US4] Crear `src/components/approval-inbox.js` para listar solicitudes del departamento con solicitante, fecha y motivo
- [X] T036 [US4] Implementar la autorización (estado aprobada y envío a la cola del encargado de compras) en `src/storage.js` y `src/app.js`
- [X] T037 [US4] Implementar el rechazo con motivo obligatorio, manteniendo el estado pendiente si falta el motivo, en `src/storage.js` y `src/components/approval-inbox.js`
- [X] T038 [US4] Calcular y mostrar el saldo presupuestario disponible por departamento/partida en `src/storage.js` y `src/components/approval-inbox.js`
- [X] T039 [US4] Restringir la bandeja de aprobación al rol aprobador y a su departamento en `src/auth.js` y `src/app.js`
- [X] T040 [P] [US4] Dar estilo a la bandeja, las insignias de estado y el diálogo de rechazo en `src/styles.css`

**Punto de control**: El control financiero del departamento funciona de forma independiente sobre las solicitudes de la Fase 4.

---

## Fase 6: Historia de Usuario 2 - Generar una Orden de Compra con líneas de detalle y totales (Prioridad: P1)

**Objetivo**: Permitir al encargado de compras crear una Orden de Compra vinculada a un proveedor, capturar líneas de detalle y calcular subtotales, descuentos, impuestos y total.

**Prueba Independiente**: Se crea una Orden de Compra con un proveedor ficticio y líneas en Detalle_Orden; el sistema calcula correctamente subtotal, descuento, impuesto y total, persiste el proveedor y los artículos, y activa el ciclo de vida configurado.

### Pruebas para la Historia de Usuario 2

- [X] T041 [P] [US2] Añadir pruebas unitarias del subtotal de línea y la cascada de totales de cabecera en `tests/unit/detail-lines.test.js`
- [X] T042 [P] [US2] Añadir pruebas de integración de creación de orden con líneas, proveedor y totales en `tests/integration/purchase-order.test.js`

### Implementación de la Historia de Usuario 2

- [X] T043 [P] [US2] Persistir `lineasDetalle` dentro del documento con la FK `documento_id` asignada por el storage en `src/storage.js`
- [X] T044 [P] [US2] Añadir la sección de líneas de detalle al formulario de documento en `index.html`
- [X] T045 [US2] Crear `src/components/detail-lines.js` para agregar, editar y eliminar líneas (producto, cantidad, unidad, precio, descuento)
- [X] T046 [US2] Conectar las líneas al formulario y recalcular subtotal, descuento, impuesto y total con `computeSubtotalLinea`, `subtotalFromLineas` y `applyTotalesToCabecera` en `src/components/document-form.js` y `src/module-config.js`
- [X] T047 [US2] Guardar el `entity_id` del proveedor y las líneas junto con la orden en `src/storage.js`
- [X] T048 [US2] Inicializar el estado del ciclo de vida al crear la orden y exponer solo las transiciones configuradas en `src/storage.js` y `src/components/document-form.js`
- [X] T049 [P] [US2] Dar estilo a la tabla de líneas y al resumen de totales en `src/styles.css`

**Punto de control**: La Orden de Compra con líneas y totales funciona de forma independiente.

---

## Fase 7: Historia de Usuario 3 - Aprobación y gestión del ciclo de vida de Órdenes de Compra (Prioridad: P1)

**Objetivo**: Permitir al encargado de adquisiciones aprobar o cancelar documentos, validando datos comerciales y límite de crédito del proveedor, asignando serie/folio oficial y reflejando métricas en vivo.

**Prueba Independiente**: Se selecciona una solicitud de cotización pendiente, se aprueba validando los datos del proveedor y el crédito, se asigna el folio oficial OC-XXXX y el panel actualiza sus contadores sin recargar; con datos faltantes o crédito excedido, la aprobación se bloquea con un mensaje claro.

### Pruebas para la Historia de Usuario 3

- [X] T050 [P] [US3] Añadir pruebas unitarias de validación comercial del proveedor, límite de crédito y transiciones de ciclo de vida en `tests/unit/order-approval.test.js`
- [X] T051 [P] [US3] Añadir pruebas de integración de aprobación con folio oficial, cancelación y actualización del panel en `tests/integration/order-approval.test.js`

### Implementación de la Historia de Usuario 3

- [X] T052 [US3] Implementar la aprobación validando `taxId`, `categoriaProveedor`, `paymentTerms` y `creditLimit`, y que `totalAmount` no exceda el crédito, en `src/storage.js`
- [X] T053 [US3] Generar la serie/folio oficial (p. ej. `OC-XXXX`) al aprobar en `src/storage.js`
- [X] T054 [US3] Implementar la cancelación y hacer cumplir las transiciones permitidas del ciclo de vida en `src/storage.js`
- [X] T055 [US3] Añadir los controles de aprobar/cancelar a la gestión de órdenes en `src/components/document-form.js` e `index.html`
- [X] T056 [US3] Refrescar los contadores del panel tras aprobar o cancelar sin recargar la página en `src/components/dashboard.js` y `src/app.js`
- [X] T057 [US3] Mostrar mensajes de error claros por datos del proveedor faltantes o crédito excedido en `src/components/document-form.js`
- [X] T058 [P] [US3] Dar estilo a los controles de aprobación/cancelación y a los mensajes de error en `src/styles.css`

**Punto de control**: El flujo de aprobación y el ciclo de vida de la orden funcionan de forma independiente sobre la Fase 6.

---

## Fase 8: Historia de Usuario 6 - Verificar y registrar la recepción de productos (Prioridad: P1)

**Objetivo**: Permitir al encargado de recepción registrar entregas contra una Orden de Compra, con cantidades recibidas/rechazadas, observaciones y actualización del estado de la orden.

**Prueba Independiente**: Un encargado de recepción abre una orden Emitida, registra cantidades completas, parciales y rechazadas con motivo, y el sistema guarda la recepción con fecha y responsable, muestra pendientes y actualiza el estado de la orden.

### Pruebas para la Historia de Usuario 6

- [X] T059 [P] [US6] Añadir pruebas unitarias de validación de cantidades (negativas, no numéricas, mayores a lo pendiente) y actualización de estado en `tests/unit/reception.test.js`
- [X] T060 [P] [US6] Añadir pruebas de integración de recepción completa, parcial, líneas rechazadas y restricción por rol en `tests/integration/reception.test.js`

### Implementación de la Historia de Usuario 6

- [X] T061 [P] [US6] Implementar las colecciones de recepciones y líneas de recepción (fecha/hora, responsable, observaciones) en `src/storage.js`
- [X] T062 [P] [US6] Añadir el marcado de la bandeja de recepción y del detalle de recepción en `index.html`
- [X] T063 [US6] Crear `src/components/reception-list.js` para listar órdenes Emitida/Recibida parcialmente con folio, proveedor y fecha
- [X] T064 [US6] Crear `src/components/reception-form.js` mostrando por línea la cantidad solicitada, la recibida acumulada y la pendiente
- [X] T065 [US6] Validar cantidades recibidas/rechazadas y exigir motivo de rechazo en `src/storage.js` y `src/components/reception-form.js`
- [X] T066 [US6] Guardar cada recepción como registro propio sin sobrescribir recepciones anteriores en `src/storage.js`
- [X] T067 [US6] Actualizar el estado de la orden a Recibida o Recibida parcialmente según las cantidades pendientes en `src/storage.js`
- [X] T068 [US6] Impedir recepciones sobre órdenes completas, canceladas o no emitidas y restringirlas al rol de recepción en `src/storage.js` y `src/auth.js`
- [X] T069 [P] [US6] Dar estilo a la bandeja, las cantidades pendientes y los campos de motivo de rechazo en `src/styles.css`

**Punto de control**: El ciclo operativo de la compra se cierra de forma independiente sobre la Fase 6.

---

## Fase 9: Historia de Usuario 8 - Buscar y encontrar entidades rápidamente (Prioridad: P2)

**Objetivo**: Mantener la búsqueda de entidades por nombre, código, categoría, descripción y fecha objetivo, con estado vacío y buen rendimiento.

**Prueba Independiente**: Un usuario introduce un término y ve solo las entidades coincidentes; una búsqueda sin coincidencias muestra un estado vacío claro; con cientos de entidades los resultados aparecen sin retraso perceptible.

### Pruebas para la Historia de Usuario 8

- [X] T070 [P] [US8] Añadir pruebas unitarias de la lógica de filtrado de búsqueda en `tests/unit/storage.test.js`
- [X] T071 [P] [US8] Añadir pruebas de integración del comportamiento de búsqueda y del estado vacío en `tests/integration/search-entities.test.js`

### Implementación de la Historia de Usuario 8

- [X] T072 [P] [US8] Buscar por nombre, código, categoría, descripción, fecha objetivo y campos personalizados en `src/storage.js`
- [X] T073 [US8] Conectar la barra de búsqueda, el estado vacío y la sincronización con crear/editar/eliminar en `src/app.js` y `src/components/search-bar.js`
- [X] T074 [P] [US8] Verificar que la búsqueda y el renderizado siguen siendo responsivos y correctos con 500 registros en `tests/integration/search-entities.test.js`

**Punto de control**: La búsqueda sigue siendo funcional e independiente del resto de historias.

---

## Fase 10: Pulido y Preocupaciones Transversales

**Propósito**: Asegurar calidad, seguridad, accesibilidad y documentación en todas las historias.

- [X] T075 [P] Sanitizar el contenido introducido por el usuario antes de renderizarlo en el DOM (prevención de XSS) en `src/components/` y `src/storage.js`
- [X] T076 [P] Revisar accesibilidad de las vistas nuevas (etiquetas, foco de teclado, ARIA) en `index.html` y `src/styles.css`
- [X] T077 [P] Actualizar `README.md` y `specs/001-erp-base-module/quickstart.md` con los flujos de usuarios/roles, solicitudes, órdenes y recepción
- [X] T078 Ejecutar la suite completa de Vitest y la compilación de producción; corregir regresiones en `tests/` y `src/`
- [ ] T079 Validar manualmente el flujo de extremo a extremo de cada historia según `specs/001-erp-base-module/quickstart.md`

---

## Dependencias y Orden de Ejecución

### Dependencias entre Fases

- **Configuración (Fase 1)**: Sin dependencias
- **Fundacional (Fase 2)**: Depende de la Fase 1; bloquea todas las historias
- **US1 - Usuarios y permisos (Fase 3)**: Depende de la Fase 2; provee roles/permisos al resto
- **US7 - Solicitar con justificación (Fase 4)**: Depende de la Fase 2 y del rol solicitante de US1
- **US4 - Autorizar solicitudes del departamento (Fase 5)**: Depende de US7 (solicitudes) y de los roles de US1
- **US2 - Orden de Compra con líneas (Fase 6)**: Depende de la Fase 2 (líneas de detalle y totales) y del rol encargado de compras de US1
- **US3 - Aprobación y ciclo de vida (Fase 7)**: Depende de US2 (órdenes) y de la configuración del ciclo de vida
- **US6 - Recepción de productos (Fase 8)**: Depende de US2 (órdenes) y del rol de recepción de US1
- **US8 - Búsqueda (Fase 9)**: Independiente; la base entregada ya la cubre
- **Pulido (Fase 10)**: Depende de que todas las historias deseadas estén completas

### Dependencias entre Historias

- **US1** no depende de otra historia, pero es requisito de autorización para US4 y US6
- **US7** no depende de US4; entrega las solicitudes que US4 revisa
- **US4** requiere el modelo de solicitudes de US7
- **US2** no depende de US3 ni de US6; entrega las órdenes que ambas consumen
- **US3** y **US6** requieren las órdenes de US2
- **US8** es independiente de todas

### Oportunidades Paralelas

- T007, T009, T010 y T012 pueden ejecutarse en paralelo dentro de la Fase 2
- En US1, T013/T014 y T016/T021 pueden ejecutarse en paralelo; T015 debe preceder a T017
- En US7, T022/T023 y T025/T030 pueden ejecutarse en paralelo; T024 precede a T026-T029
- En US4, T031/T032 y T034/T040 pueden ejecutarse en paralelo; T033 precede a T035-T039
- En US2, T041/T042 y T044/T049 pueden ejecutarse en paralelo; T043/T045 preceden a T046
- En US3, T050/T051 y T058 pueden ejecutarse en paralelo; T052-T054 preceden a T055-T057
- En US6, T059/T060 y T062/T069 pueden ejecutarse en paralelo; T061 precede a T063-T068
- US2 (Fase 6) y US7 (Fase 4) pueden avanzar en paralelo tras completar la Fase 2
- En la Fase 10, T075, T076 y T077 pueden ejecutarse en paralelo antes de T078 y T079

---

## Ejemplo Paralelo: Historia de Usuario 1

```bash
# Lanzar juntas las pruebas de US1:
Task: "Pruebas unitarias de usuarios y permisos en tests/unit/auth.test.js"
Task: "Pruebas de integración de gestión de usuarios en tests/integration/user-management.test.js"

# Lanzar juntos el CRUD y el marcado de la vista:
Task: "CRUD de usuarios en src/storage.js"
Task: "Marcado de la vista de usuarios en index.html"
```

---

## Estrategia de Implementación

### MVP Primero (Historia de Usuario 1)

1. Completar Fase 1: Configuración
2. Completar Fase 2: Fundacional (CRÍTICO: bloquea las historias)
3. Completar Fase 3: US1 (usuarios y permisos)
4. **DETENERSE Y VALIDAR**: probar US1 de forma independiente
5. Desplegar/demostrar si está listo

### Entrega Incremental

1. Configuración + Fundacional → base, roles y totales listos
2. US1 (usuarios y permisos) → validar → desplegar
3. US7 (solicitudes justificadas) → validar → desplegar
4. US4 (autorización por departamento) → validar → desplegar
5. US2 (Orden de Compra con líneas) → validar → desplegar
6. US3 (aprobación y ciclo de vida) → validar → desplegar
7. US6 (recepción de productos) → validar → desplegar
8. US8 (búsqueda) ya disponible; validar regresiones

### Estrategia de Equipo en Paralelo

1. El equipo completa Configuración + Fundacional junto
2. Tras la Fase 2:
   - Desarrollador A: US1 y luego US4
   - Desarrollador B: US7 y luego US6
   - Desarrollador C: US2 y luego US3
3. Las historias se integran de forma independiente en cada punto de control

---

## Notas

- `[P]` indica tareas en archivos distintos y sin dependencias entre sí
- `[Historia]` mapea cada tarea a la historia de usuario de `spec.md` para trazabilidad
- No existe HU5 en `spec.md`; la secuencia de etiquetas es US1, US2, US3, US4, US6, US7, US8
- El ciclo de vida implementado sigue `plan.md` (`borrador → cotización → aprobado → recibido → facturado/cancelado`); los estados Emitida/Recibida/Pagada de `spec.md` se mapean a esos valores según `data-model.md` (nota 12)
- `data-model.md` define RECEPCIÓN como entidad propia; las tareas de US6 la implementan como colección separada, no como `tipoDocumento`
- Verificar que las pruebas fallen antes de implementar
- Confirmar después de cada tarea o grupo lógico
- Detenerse en cada punto de control para validar la historia de forma independiente
- Evitar tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia
