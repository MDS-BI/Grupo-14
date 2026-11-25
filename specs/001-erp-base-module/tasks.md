# Tareas: Módulo Adquisiciones y Compras (Módulo Base ERP)

**Entrada**: Documentos de diseño desde `/specs/001-erp-base-module/`
**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para las historias de usuario), research.md, data-model.md, contracts/

**Nota de reorganización**: esta lista se alinea con las historias de usuario vigentes en `spec.md` (HU1-HU18). La numeración US5 se conserva para la historia de solicitudes de cotización. Las tareas base ya entregadas se conservan marcadas como completadas para mantener la trazabilidad; las fases 22-35 agregan de forma incremental la cobertura que faltaba para US9-US18 y las reglas transversales FR-039, FR-048-FR-051 y SC-008.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Historia]**: Historia de usuario a la que pertenece la tarea (US1-US18)
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
- [X] T079 Validar manualmente el flujo de extremo a extremo de cada historia según `specs/001-erp-base-module/quickstart.md`
- [ ] T080 [P] Documentar y verificar la cobertura de FR-001..FR-051, SC-001..SC-013 y US1..US18 en `specs/001-erp-base-module/tasks.md`, sustituyendo cualquier marcador informal por IDs canónicos
- [ ] T081 Cerrar en `specs/001-erp-base-module/spec.md`, `specs/001-erp-base-module/plan.md`, `specs/001-erp-base-module/data-model.json` y `specs/001-erp-base-module/tasks.md` las brechas de trazabilidad detectadas por `speckit-analyze` antes de declarar completada la fase de pulido

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
- La secuencia de etiquetas es US1-US18
- El ciclo de vida canónico sigue `plan.md` y `spec.md` (`Pendiente de aprobación → Aprobada → En cotización/Emitida → Recibida parcialmente → Recibida → Pagada`, con `Rechazada` hasta la primera recepción); `Pagada` se asigna al registrar el pago (ver `data-model.md`, nota 12)
- `data-model.md` define RECEPCIÓN como entidad propia; las tareas de US6 la implementan como colección separada, no como `tipoDocumento`
- Verificar que las pruebas fallen antes de implementar
- Confirmar después de cada tarea o grupo lógico
- Detenerse en cada punto de control para validar la historia de forma independiente
- Evitar tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia

---

## Fase 19: Líneas de Detalle de Documentos de Compra

**Propósito**: Completar la relación 1 a N entre documentos de compra y sus líneas de detalle, incluyendo validación, persistencia, cálculo automático y representación en la interfaz.

**Prueba Independiente**: Un usuario puede crear o editar una orden de compra, recepción o factura con varias líneas de producto; cada línea valida sus datos, calcula su subtotal y actualiza los totales de la cabecera sin que el usuario los escriba manualmente.

### Pruebas para Líneas de Detalle

- [X] T082 [P] Añadir pruebas unitarias para la validación del sub-esquema de líneas y para la colisión de campos extra en tests/unit/module-config.test.js y tests/unit/storage.test.js
- [X] T083 [P] Añadir pruebas unitarias para `computeSubtotalLinea`, `subtotalFromLineas` y `applyTotalesToCabecera` en tests/unit/module-config.test.js
- [X] T084 [P] Añadir pruebas de integración para crear, editar y eliminar líneas dentro de un documento en tests/integration/document-lineas.test.js

### Implementación de Líneas de Detalle

- [X] T085 Activar en el perfil de adquisiciones `lineasDetalle` con etiqueta, unidades de medida, descuento máximo y campos extra definidos en src/module-config.js
- [X] T086 Añadir el campo persistido `lineasDetalle` al modelo de `Document` y documentar su relación 1 a N con `documento_id` en specs/001-erp-base-module/data-model.md
- [X] T087 Implementar validación y normalización de líneas en src/storage.js: clave foránea, producto, descripción, cantidad, unidad, precio, descuento y campos extra
- [X] T088 Persistir `lineasDetalle` al crear y actualizar documentos, asignar `documento_id` al identificador del documento y eliminar las líneas junto con el documento en src/storage.js
- [X] T089 Crear la interfaz editable de líneas dentro de src/components/document-form.js, con añadir/quitar líneas, campos obligatorios, controles de unidad y campos extra configurados
- [X] T090 Conectar los cambios de las líneas al recálculo en vivo de `subtotalLinea`, `subtotal`, `discount`, `taxAmount` y `totalAmount` en src/components/document-form.js y src/storage.js
- [X] T091 Mostrar las líneas y sus subtotales en la lista o detalle de documentos en src/components/document-list.js y src/app.js

---

## Fase 20: Trazabilidad, Totales e Integridad de Compras

**Propósito**: Cerrar las reglas específicas del perfil activo que afectan a divisas, impuestos, descuentos y consistencia histórica de las compras.

**Prueba Independiente**: Guardar una compra en USD con tipo de cambio y fecha de emisión conserva la instantánea, recalcula correctamente sus totales y rechaza valores inválidos o inconsistentes.

### Pruebas

- [X] T092 [P] Ampliar tests/unit/storage.test.js para validar fecha de emisión obligatoria, tipo de cambio numérico y descuento global no superior al subtotal derivado de líneas
- [X] T093 [P] Ampliar tests/integration/tipos-cambio.test.js para comprobar que moneda, tipo de cambio y fecha permanecen congelados tras editar el documento
- [X] T094 [P] Añadir pruebas de cálculo de impuestos y descuentos globales con líneas en tests/integration/document-lineas.test.js

### Implementación

- [X] T095 Conservar `currency`, `tipoCambio` y `fechaEmision` como instantánea del documento y validar que el tipo de cambio sea numérico no negativo en src/storage.js
- [X] T096 Incorporar la tasa de impuesto configurable del perfil y una moneda local de referencia en src/module-config.js, sin recalcular tipos de cambio históricos ni totales desde catálogos externos
- [X] T097 Hacer que el almacenamiento y el formulario consuman una única cascada de cálculo de totales basada en líneas, con redondeo consistente a dos decimales y sin permitir edición manual de importes derivados

---

## Dependencias adicionales

- Fase 19: depende de completar las Historias de Usuario 5, 10 y 12
- Fase 20: depende de completar la Fase 19 y las tareas existentes de tipos de cambio
- T082-T083 pueden ejecutarse en paralelo con T085
- T084 puede ejecutarse en paralelo con T089 una vez definido el contrato de líneas
- T092-T094 pueden ejecutarse en paralelo antes de T095-T097
## Fase 21: Convergencia (IDs renumerados para evitar colisiones con T082-T090 de las fases 19 y 20)

- [X] T098 CRITICAL Reparar o retirar los módulos huérfanos `src/approval.js`, `src/components/approval-panel.js` y `src/components/user-profile.js` para que no importen ni reexporten APIs inexistentes y `tests/unit/approval.test.js` pueda cargarlos per Constitution II, T078 (contradicts)
- [X] T099 CRITICAL Reconciliar las 16 pruebas fallidas en 7 archivos (`tests/unit/approval.test.js`, `tests/unit/request.test.js`, `tests/unit/users.test.js`, `tests/integration/department-approvals.test.js`, `tests/integration/request-justification.test.js`, `tests/integration/search-entities.test.js`, `tests/integration/users-permissions.test.js`) con las APIs e IDs del DOM vigentes y ejecutar `npx vitest run` hasta que pasen todas per Constitution II, T078 (contradicts)
- [X] T100 Implementar el modelo y la persistencia de las solicitudes de cotización: estado `En cotización`, vinculación con la solicitud de compra original, proveedor activo con datos comerciales completos, precios por línea, cálculo de subtotal/impuesto/total y bloqueo de cotizaciones duplicadas en `src/storage.js` y `src/module-config.js` per US5/AC1, US5/AC3, US5/AC4 (missing)
- [X] T101 Implementar la bandeja de solicitudes autorizadas y el formulario de generación de cotización para el rol `encargado_compras`, mostrando cantidades, justificación y decisión de autorización, actualizando la solicitud a `En cotización` y conectando navegación y permisos en `src/app.js`, `index.html` y `src/components/` per US5/AC1, US5/AC2, US5/AC3, US5/AC5, US4/AC3 (missing)
- [X] T102 Añadir pruebas unitarias y de integración de la US5 (bandeja, validaciones, cotización vinculada, cambio de estado y permisos) en `tests/unit/` y `tests/integration/` per US5/AC1-5, Constitution II (missing)
- [X] T103 Añadir el estado `Pagada` y su transición permitida al ciclo de vida de la Orden de Compra en `src/module-config.js`, `src/storage.js` y la interfaz, con cobertura de pruebas per US2/AC3 (missing)
- [X] T104 Aplicar la guarda de desactivación de usuarios con trámites pendientes también a `updateUser()` en `src/storage.js`, impidiendo `active:false` y mostrando la advertencia per US1/AC4 (partial)
- [X] T105 Validar que la cantidad rechazada por línea no supere la cantidad pendiente (no solo la solicitada) en `validateReception()` de `src/storage.js`, indicando la línea a corregir per FR-043, US6/AC6 (partial)
- [X] T106 Revisar y justificar o eliminar la siembra automática de datos de demostración de `src/mock-data.js` ejecutada al arrancar desde `src/app.js`, conservando únicamente las semillas de pruebas autorizadas en `tests/setup/roles.js` per plan: storage decision, T012 (unrequested)
- [X] T107 Completar la validación manual de extremo a extremo de cada historia, incluida la nueva US5, según `specs/001-erp-base-module/quickstart.md` per T079 (partial)
- [X] T108 Alinear `theme.accentColor` de `userConfig` en `src/module-config.js` con el valor `#0f766e` decidido en el plan per plan: configuración de referencia (contradicts)

---

## Fase 22: Historia de Usuario 9 - Gestionar el maestro de proveedores con validación comercial y fiscal (Prioridad: P1)

**Objetivo**: Mantener proveedores activos con RUT chileno válido, categoría, condiciones de pago y límite de crédito, evitando órdenes a proveedores inactivos o duplicados.

**Prueba Independiente**: Un encargado registra un proveedor con RUT válido y único, lo ve disponible al cotizar, intenta guardar un RUT duplicado/inválido y no puede desactivar un proveedor con OC en curso.

### Pruebas para la Historia de Usuario 9

- [ ] T109 [P] [US9] Añadir pruebas unitarias de normalización, formato `XX.XXX.XXX-X`, módulo 11, RUT duplicado y proveedor inactivo en `tests/unit/rut.test.js` y `tests/unit/storage.test.js`
- [ ] T110 [P] [US9] Añadir pruebas de integración de CRUD de proveedores, exclusión de inactivos y bloqueo de desactivación con folios activos en `tests/integration/supplier-management.test.js`

### Implementación de la Historia de Usuario 9

- [ ] T111 [US9] Implementar `src/rut.js` con `normalizeRut`, `isValidRut` y `formatRut`, y conectarlo a la validación de proveedores en `src/storage.js`
- [ ] T112 [US9] Crear `src/components/vendor-form.js` con razón social, RUT, categoría, condiciones de pago, límite de crédito y estado Activo/Inactivo, integrado desde `src/app.js`
- [ ] T113 [US9] Bloquear la desactivación de proveedores con Órdenes de Compra `Emitida` o `Recibida parcialmente` y excluir inactivos de selectores en `src/storage.js`, `src/components/document-form.js` y `src/app.js`

---

## Fase 23: Historia de Usuario 10 - Controlar presupuestos por departamento (Prioridad: P1)

**Objetivo**: Mostrar presupuesto asignado, comprometido y disponible por centro de costo, con bloqueo por sobregiro y override administrativo auditado.

**Prueba Independiente**: Al autorizar una solicitud de $400.000 CLP sobre un presupuesto de $1.000.000 CLP, el saldo baja a $600.000 CLP; al rechazar o cancelar se libera; un sobregiro solo se autoriza con override administrativo y motivo.

### Pruebas para la Historia de Usuario 10

- [ ] T114 [P] [US10] Añadir pruebas unitarias de cálculo de presupuesto asignado, comprometido, disponible y liberación por rechazo/cancelación en `tests/unit/department-budget.test.js`
- [ ] T115 [P] [US10] Añadir pruebas de integración de alerta roja, bloqueo de autorización y override administrativo con evento de auditoría en `tests/integration/department-approvals.test.js`

### Implementación de la Historia de Usuario 10

- [ ] T116 [US10] Implementar la colección de presupuestos, estados que comprometen fondos y recálculo por evento en `src/storage.js`, `src/components/approval-inbox.js` y `src/components/dashboard.js`

---

## Fase 24: Historia de Usuario 11 - Registrar factura y cerrar la Orden de Compra como Pagada (Prioridad: P1)

**Objetivo**: Validar factura y pago contra lo efectivamente recibido con tolerancia de 0,01 CLP, actualizar crédito usado y bloquear edición posterior.

**Prueba Independiente**: Una OC `Recibida` con factura coincidente pasa a `Pagada`; una OC `Emitida` o `Recibida parcialmente` no puede pagarse; una diferencia mayor a 0,01 CLP muestra la diferencia y exige nota o corrección.

### Pruebas para la Historia de Usuario 11

- [ ] T117 [P] [US11] Ampliar `tests/unit/payment.test.js` y `tests/integration/payment.test.js` con tolerancia 0,01 CLP, bloqueo previo a `Recibida`, crédito usado y modo solo lectura
- [ ] T118 [US11] Implementar el registro de factura/pago, el total recepcionado neto de rechazos, la transición a `Pagada` y la actualización de crédito en `src/storage.js`
- [ ] T119 [US11] Implementar el formulario de pago, el mensaje de diferencia exacta y el bloqueo de edición posterior en `src/components/document-form.js`

---

## Fase 25: Historia de Usuario 12 - Consultar historial de auditoría y trazabilidad (Prioridad: P2)

**Objetivo**: Registrar y mostrar eventos inmutables con usuario, rol, acción, estados y revisión.

**Prueba Independiente**: El detalle de una orden muestra cronológicamente creación, aprobación, emisión, recepción y pago sin controles de edición o eliminación.

### Pruebas para la Historia de Usuario 12

- [ ] T120 [P] [US12] Añadir pruebas unitarias del esquema completo de `eventosAuditoria` y del orden cronológico en `tests/unit/audit.test.js`
- [ ] T121 [P] [US12] Añadir pruebas de integración de la línea de tiempo por documento y ausencia de acciones de edición/eliminación en `tests/integration/audit-trail.test.js`

### Implementación de la Historia de Usuario 12

- [ ] T122 [US12] Implementar el escritor append-only de auditoría en `src/storage.js` y el resolvedor de usuario/rol en `src/auth.js`, y renderizar la línea de tiempo en `src/components/document-list.js` y `src/app.js`

---

## Fase 26: Historia de Usuario 13 - Monitorear indicadores y alertas en el Dashboard (Prioridad: P2)

**Objetivo**: Mostrar KPIs y alertas operativas refrescadas por evento con staleness ≤2 s y navegación directa a bandejas filtradas.

**Prueba Independiente**: Al emitir una OC atrasada o aprobar una solicitud, los KPIs y alertas se actualizan sin recargar; al hacer clic en una tarjeta se abre la bandeja filtrada.

### Pruebas para la Historia de Usuario 13

- [ ] T123 [P] [US13] Añadir pruebas unitarias de cálculo de KPIs, gasto del mes y detección de OCs atrasadas en `tests/unit/dashboard.test.js`
- [ ] T124 [P] [US13] Ampliar `tests/integration/dashboard.test.js` con staleness ≤2 s, actualización por evento y deep links filtrados

### Implementación de la Historia de Usuario 13

- [ ] T125 [US13] Implementar el bus de eventos, el cálculo de atraso y el refresco de KPIs en `src/storage.js`, `src/app.js` y `src/components/dashboard.js`
- [ ] T126 [US13] Implementar tarjetas y alertas navegables a bandejas filtradas en `src/components/dashboard.js`, `src/components/dashboard-activity.js` y `src/styles.css`

---

## Fase 27: Historia de Usuario 14 - Exportar reportes y respaldar/restaurar datos (Prioridad: P3)

**Objetivo**: Exportar OC/recepciones a CSV/imprimible y respaldar/restaurar JSON con validación de esquema, versión, tipos y relaciones.

**Prueba Independiente**: Un filtro produce un CSV UTF-8 correcto; un respaldo JSON se restaura íntegro y un archivo inválido se rechaza sin mezclar datos.

### Pruebas para la Historia de Usuario 14

- [ ] T127 [P] [US14] Añadir pruebas de integración de exportación CSV, vista imprimible y respaldo/restauración JSON válida e inválida en `tests/integration/export-backup.test.js`

### Implementación de la Historia de Usuario 14

- [ ] T128 [US14] Implementar exportación CSV, impresión y respaldo/restauración con validación de `schemaVersion`, colecciones, RUT y folios en `src/storage.js`
- [ ] T129 [US14] Añadir controles de exportar/respaldar/restaurar y estilos de impresión en `src/components/document-list.js`, `src/app.js` y `src/styles.css`

---

## Fase 28: Historia de Usuario 15 - Iniciar sesión y gestionar la sesión activa (Prioridad: P1)

**Objetivo**: Redirigir a login sin sesión, filtrar funciones por rol, registrar responsable de acciones y respetar segregación de funciones.

**Prueba Independiente**: Enlaces profundos, recarga y botón atrás sin sesión llevan a login; credenciales inválidas o usuario desactivado se rechazan; el solicitante no puede aprobar su propia solicitud.

### Pruebas para la Historia de Usuario 15

- [ ] T130 [P] [US15] Ampliar `tests/unit/auth.test.js` y `tests/integration/users-permissions.test.js` con login, logout, deep links, recarga, botón atrás, credenciales inválidas, usuario desactivado y segregación

### Implementación de la Historia de Usuario 15

- [ ] T131 [US15] Implementar la vista de login, el guard de sesión, la restauración de ruta autorizada y el cierre de sesión en `index.html`, `src/main.js`, `src/auth.js` y `src/app.js`
- [ ] T132 [US15] Implementar la confirmación de salida con cambios sin guardar en `src/dom.js`, `src/components/entity-form.js` y `src/components/document-form.js`

---

## Fase 29: Historia de Usuario 16 - Administrar departamentos y centros de costo (Prioridad: P1)

**Objetivo**: Registrar departamentos con código único y jefe aprobador, vincular usuarios y dirigir solicitudes/presupuesto al área correcta.

**Prueba Independiente**: Un departamento creado con jefe aprobador aparece solo en esa bandeja; no puede desactivarse con usuarios, presupuesto comprometido o solicitudes en curso.

### Pruebas para la Historia de Usuario 16

- [ ] T133 [P] [US16] Añadir pruebas unitarias de departamento, código único, jefe aprobador y guard de desactivación en `tests/unit/department.test.js`
- [ ] T134 [P] [US16] Añadir pruebas de integración de asignación automática de departamento y enrutamiento al aprobador en `tests/integration/department-approvals.test.js`

### Implementación de la Historia de Usuario 16

- [ ] T135 [US16] Implementar la colección de departamentos, pertenencia de usuarios y guard de desactivación en `src/storage.js`; añadir la gestión en `src/components/entity-form.js`, `src/app.js` y `src/auth.js`

---

## Fase 30: Historia de Usuario 17 - Gestionar el catálogo de productos y servicios (Prioridad: P1)

**Objetivo**: Mantener un catálogo oficial con código único, unidad, categoría y precio de referencia, con autocompletado y alerta de duplicados.

**Prueba Independiente**: Un producto se crea con código único; al seleccionarlo en una solicitud se completan unidad y precio; un código duplicado se rechaza y una solicitud simultánea del mismo producto genera advertencia.

### Pruebas para la Historia de Usuario 17

- [ ] T136 [P] [US17] Añadir pruebas unitarias de validación de catálogo, código único y precio no negativo en `tests/unit/catalog.test.js`
- [ ] T137 [P] [US17] Ampliar `tests/integration/requisition.test.js` con autocompletado desde catálogo, exclusión de inactivos y advertencia de compra duplicada

### Implementación de la Historia de Usuario 17

- [ ] T138 [US17] Implementar la colección de productos y su validación en `src/storage.js` y `src/module-config.js`, y el formulario/selector en `src/components/entity-form.js`, `src/components/requisition-form.js` y `src/components/detail-lines.js`

---

## Fase 31: Historia de Usuario 18 - Emitir la Orden de Compra con fecha de entrega y despacho (Prioridad: P1)

**Objetivo**: Completar la emisión con fecha estimada, dirección e instrucciones, detectar atrasos y auditar cambios de fecha.

**Prueba Independiente**: Una cotización aprobada se emite con datos válidos; una fecha inválida se rechaza; una OC vencida aparece en alertas; un cambio de fecha conserva el valor original y genera auditoría.

### Pruebas para la Historia de Usuario 18

- [ ] T139 [P] [US18] Ampliar `tests/unit/order-lifecycle.test.js` con validación de fecha estimada, dirección, atraso y cambio de fecha auditado
- [ ] T140 [P] [US18] Añadir pruebas de integración de emisión, bandeja de recepción, vista imprimible y alertas operativas en `tests/integration/delivery.test.js`

### Implementación de la Historia de Usuario 18

- [ ] T141 [US18] Implementar los campos de entrega, validación de rango, cálculo de atraso y auditoría del cambio en `src/storage.js`, `src/module-config.js`, `src/components/document-form.js`, `src/components/reception-list.js` y `src/app.js`

---

## Fase 32: Correcciones Transversales y Gates (Prerrequisito para cierre)

**Propósito**: Cerrar brechas existentes de navegación, concurrencia, configuración, fixtures y evidencia de verificación.

- [ ] T142 [P] Añadir prueba de barra lateral contraída en ventanas estrechas y navegación operativa por iconos en `tests/integration/workspace-shell.test.js` (FR-039)
- [ ] T143 Ajustar `src/styles.css` para que la barra lateral se contraiga a iconos accesibles sin perder etiquetas ARIA (FR-039)
- [ ] T144 [P] Añadir prueba SC-008 en `tests/integration/relabeling.test.js` demostrando una adaptación completa mediante configuración sin modificar archivos centrales
- [ ] T145 [P] Añadir pruebas de control optimista en `tests/unit/storage.test.js` y `tests/integration/document-lineas.test.js`: snapshot obsoleto, conflicto y sin sobrescritura silenciosa (FR-048)
- [ ] T146 Implementar el mensaje de conflicto con opciones recargar/reintentar en `src/dom.js` y `src/components/document-form.js` (FR-048)
- [ ] T147 [P] Verificar que la siembra automática use solo fixtures sintéticos autorizados, sin proveedores reales, en `src/mock-data.js`, `src/app.js` y `tests/setup/roles.js`
- [ ] T148 [P] Añadir pruebas de fechas inválidas, rangos invertidos y campos obligatorios por campo en `tests/unit/storage.test.js` y `tests/integration/create-entity.test.js`
- [ ] T149 Actualizar `specs/001-erp-base-module/quickstart.md` con los flujos US9-US18, comandos de verificación y limitación de seguridad aceptada
- [ ] T150 Ejecutar y registrar como gate final `npm run test`, `npm run lint`, `npm run build` y `npm run mer`, corrigiendo cualquier regresión en `tests/`, `src/` y `specs/001-erp-base-module/`

---

## Dependencias de las Fases 22-32

- Fase 22 (US9) depende de Fase 2 y provee proveedores válidos a US3, US5 y US18
- Fase 23 (US10) depende de US7, US16 y de la bandeja de US4
- Fase 24 (US11) depende de US2 y US6
- Fase 25 (US12) depende de US1 y de las mutaciones de US2-US18
- Fase 26 (US13) depende de US3, US4, US10 y US18
- Fase 27 (US14) depende de US2 y US6
- Fase 28 (US15) depende de US1 y es prerrequisito de todas las vistas protegidas
- Fase 29 (US16) depende de US1 y precede a US10/US4
- Fase 30 (US17) depende de US9 y precede a US7/US5/US2
- Fase 31 (US18) depende de US3 y US5, y precede a US6/US13
- Fase 32 depende de todas las fases anteriores; T150 es el gate final de cierre
- Paralelismo: T109/T110, T114/T115, T117, T120/T121, T123/T124, T127, T130, T133/T134, T136/T137 y T139/T140 pueden ejecutarse en paralelo dentro de su fase; T142-T148 pueden ejecutarse en paralelo antes de T149 y T150

