# Tareas: Módulo Base ERP — Adquisiciones y Compras

**Entrada**: Documentos de diseño desde `/specs/001-erp-base-module/`
**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para las historias de usuario), research.md, data-model.md, contracts/, `.specify/memory/constitution.md`
**Pruebas**: Incluidas porque la constitución del proyecto exige verificación automatizada de la lógica de negocio y los flujos de usuario.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Historia]**: Historia de usuario de spec.md a la que pertenece (US1, US2, US3, US4, US6, US7, US8).
- **[X]**: Trabajo ya entregado y verificado en el repositorio; se conserva como base verificable.
- Las tareas sin `[X]` son trabajo pendiente y son inmediatamente ejecutables.
- Todas las rutas son relativas a la raíz del repositorio.

## Convenciones de Rutas

- Aplicación: `src/`, componentes en `src/components/`, estilos en `src/styles.css`.
- Entrada HTML: `index.html`.
- Pruebas: `tests/unit/` y `tests/integration/`.
- Configuración de módulo: `src/module-config.js`.
- Herramientas: `vitest.config.mjs`, `eslint.config.mjs`, `package.json`.

---

## Fase 1: Configuración (Infraestructura Compartida)

**Propósito**: Confirmar la base Vite/Vitest y las herramientas de calidad.

- [X] T001 Verificar la estructura del proyecto Vite (`src/`, `tests/`, `index.html`, `vitest.config.mjs`) según plan.md
- [X] T002 Verificar las dependencias Vite, Vitest y jsdom declaradas en `package.json`
- [X] T003 [P] Configurar linting (ESLint para JavaScript vanilla) y el script `npm run lint` en `package.json` y `eslint.config.mjs`

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: Completar la infraestructura compartida que necesitan todas las historias: identidad/permisos, persistencia extendida, líneas de detalle, recepciones y sanitización.

**CRÍTICO**: Ninguna historia de usuario puede considerarse completa hasta cerrar los pendientes de esta fase.

- [X] T004 Implementar la persistencia base de entidades y documentos con validación en `src/storage.js`
- [X] T005 Implementar el cargador de configuración con valores predeterminados, validación y errores claros en `src/module-config.js`
- [X] T006 Implementar el marco ERP (barra superior, barra lateral, logotipo), el enrutamiento por módulos, el panel y la búsqueda en `src/components/shell.js`, `src/components/dashboard.js`, `src/components/search-bar.js` y `src/app.js`
- [X] T007 Definir `LINEA_DETALLE_FIELDS` y los helpers `computeSubtotalLinea`, `subtotalFromLineas` y `applyTotalesToCabecera` en `src/module-config.js`
- [X] T008 [P] Crear utilidades de prueba para reiniciar usuarios, entidades, documentos y recepciones en `tests/setup/reset-storage.js` y registrarlas en `vitest.config.mjs`
- [X] T009 Definir el catálogo de roles (`solicitante`, `compras`, `aprobador`, `recepcion`, `administrador`) y sus permisos en `src/auth.js`
- [X] T010 Implementar la sesión del usuario actual y el helper `can(permission)` en `src/auth.js`
- [X] T011 Implementar la colección persistente de usuarios (`loadUsers`, `saveUsers`, `addUser`, `updateUser`, `deleteUser`) con validación en `src/storage.js`
- [X] T012 Persistir `lineasDetalle` dentro de cada documento y aplicar `applyTotalesToCabecera` al crear/actualizar en `src/storage.js`
- [X] T013 Implementar la colección persistente de recepciones (`loadRecepciones`, `saveRecepciones`, `addRecepcion`) con validación en `src/storage.js`
- [X] T014 Extender `src/module-config.js` con las claves de extensión `roles`, `justificacion`, `tasaImpuesto`, `monedaLocal` y campos de departamento/presupuesto, con validación y retroceso seguro
- [X] T015 Aplicar guardas de permisos a la navegación de la barra lateral y al enrutamiento de módulos en `src/components/shell.js` y `src/app.js`
- [ ] T016 [P] Centralizar el escapado HTML en `src/dom.js` (incluyendo comillas) y reemplazar los `escapeHtml` locales de `src/components/document-list.js`, `src/components/entity-list.js` y `src/components/shell.js` para cumplir el requisito de sanitización de spec.md

**Punto de control**: La base está lista; las historias nuevas pueden implementarse sin tocar los contratos de almacenamiento existentes.

---

## Fase 3: Historia de Usuario 1 — Administrar usuarios y permisos del módulo (Prioridad: P1) 🎯 MVP

**Objetivo**: Permitir al administrador crear y modificar usuarios, asignarles un rol y restringir cada acción según los permisos del rol, incluyendo el bloqueo de desactivación con trámites pendientes.

**Prueba Independiente**: Un administrador crea un usuario con rol Solicitante y verifica que ese usuario solo accede a las vistas y acciones permitidas; al intentar desactivar un usuario con solicitudes pendientes, el sistema lo impide y explica el motivo.

### Pruebas de la Historia de Usuario 1

- [X] T017 [P] [US1] Añadir pruebas unitarias de alta, edición, asignación de rol, validación y bloqueo de desactivación de usuarios en `tests/unit/users.test.js`
- [X] T018 [P] [US1] Añadir pruebas de integración del panel de administración y de las restricciones de acceso por rol en `tests/integration/users-permissions.test.js`

### Implementación de la Historia de Usuario 1

- [X] T019 [P] [US1] Crear el formulario de usuario (nombre, cuenta, rol, estado) en `src/components/user-form.js`
- [X] T020 [P] [US1] Crear el listado de usuarios con su rol asignado en `src/components/user-list.js`
- [X] T021 [US1] Añadir el módulo de administración de usuarios al marcado y al enrutamiento en `index.html` y `src/app.js`
- [X] T022 [US1] Conectar las acciones de crear, editar y asignar rol con el almacenamiento en `src/app.js`
- [X] T023 [US1] Implementar la prohibición de desactivar usuarios con solicitudes u órdenes pendientes en `src/storage.js` y `src/app.js`
- [X] T024 [US1] Ocultar o deshabilitar vistas y acciones no autorizadas según el rol activo en `src/components/shell.js` y `src/app.js`
- [X] T025 [P] [US1] Dar estilo al panel de usuarios y a los avisos de permisos en `src/styles.css`

**Punto de control**: La gestión de usuarios y el control de acceso funcionan de forma independiente y son comprobables.

---

## Fase 4: Historia de Usuario 2 — Generar Orden de Compra con líneas de detalle y totales (Prioridad: P1)

**Objetivo**: Crear documentos de compra vinculados a un proveedor, con líneas de detalle, moneda, tipo de cambio congelado y totales calculados en cascada.

**Prueba Independiente**: Se crea una Orden de Compra para un proveedor ficticio con varias líneas; el sistema calcula subtotal, descuento, impuesto y total, persiste el proveedor y las líneas, y muestra la orden en el listado.

### Pruebas de la Historia de Usuario 2

- [X] T026 [P] [US2] Añadir pruebas unitarias de cálculo de subtotales de línea y totales de cabecera en `tests/unit/detail-lines.test.js`
- [X] T027 [P] [US2] Añadir pruebas de integración de creación de Orden de Compra con líneas y totales en `tests/integration/purchase-order.test.js`

### Implementación de la Historia de Usuario 2

- [X] T028 [P] [US2] Crear el editor de líneas de detalle (agregar, editar, eliminar, subtotal por línea) en `src/components/detail-lines.js`
- [X] T029 [US2] Integrar el editor de líneas y los campos `currency`, `tipoCambio` y `fechaEmision` en `src/components/document-form.js`
- [X] T030 [US2] Activar `lineasDetalle` en `userConfig` con `unidadesMedida`, `maxPorcentajeDescuento` y `tasaImpuesto` en `src/module-config.js`
- [X] T031 [US2] Aplicar en cascada `subtotal`, `taxAmount` y `totalAmount` al guardar líneas en `src/app.js` y `src/storage.js`
- [X] T032 [US2] Mostrar proveedor, serie/folio, moneda, total y estado en el listado de documentos en `src/components/document-list.js`
- [X] T033 [US2] Validar cantidad estrictamente positiva, precio unitario no negativo, descuento por línea en rango y descuento global no mayor al subtotal en `src/storage.js`
- [X] T034 [P] [US2] Dar estilo a la tabla de líneas de detalle y a los totales en `src/styles.css`

**Punto de control**: La Orden de Compra se crea, persiste y totaliza de forma independiente.

---

## Fase 5: Historia de Usuario 3 — Aprobación y ciclo de vida de Órdenes de Compra (Prioridad: P1)

**Objetivo**: Revisar solicitudes de cotización y aprobarlas o cancelarlas validando campos comerciales del proveedor y su límite de crédito, asignando la numeración oficial y reflejando los cambios en el panel.

**Prueba Independiente**: Un encargado aprueba una solicitud en estado cotización; se valida `taxId`, `categoriaProveedor`, `paymentTerms` y `creditLimit`, se asigna `OC-XXXX`, cambia el estado y el panel actualiza sus contadores sin recargar.

### Pruebas de la Historia de Usuario 3

- [X] T035 [P] [US3] Añadir pruebas unitarias de validación de aprobación (campos obligatorios, crédito insuficiente, transición inválida) en `tests/unit/approval.test.js`
- [X] T036 [P] [US3] Añadir pruebas de integración de aprobación/cancelación, asignación de folio y refresco del panel en `tests/integration/department-approvals.test.js` y `tests/integration/dashboard.test.js`

### Implementación de la Historia de Usuario 3

- [X] T037 [US3] Implementar el servicio de aprobación y cancelación con validación comercial y de transiciones en `src/approval.js` y `src/storage.js`
- [X] T038 [US3] Crear el panel de aprobación con estados siguientes permitidos y mensajes de error en `src/components/approval-panel.js`
- [X] T039 [US3] Conectar las acciones de aprobar y cancelar con el almacenamiento y la vista en `src/app.js`
- [X] T040 [US3] Generar la serie/folio oficial (`OC-XXXX`, `SC-XXXX`) al aprobar o emitir en `src/storage.js`
- [X] T041 [US3] Mostrar y refrescar los contadores de solicitudes pendientes, órdenes emitidas, proveedores y compras recibidas en `src/components/dashboard.js` y `src/app.js`
- [X] T042 [P] [US3] Dar estilo al panel de aprobación y a las insignias de estado en `src/styles.css`

**Punto de control**: El flujo de estados está controlado y los contadores del panel reflejan los cambios en vivo.

---

## Fase 6: Historia de Usuario 4 — Revisar y autorizar solicitudes de compra del departamento (Prioridad: P1)

**Objetivo**: Ofrecer al aprobador una bandeja de solicitudes pendientes de su departamento, con detalle de productos, saldo presupuestario y acciones de autorizar o rechazar con motivo obligatorio.

**Prueba Independiente**: Un jefe de área abre una solicitud pendiente de su equipo, revisa la justificación y las líneas, autoriza o rechaza; el rechazo exige un motivo y el sistema lo registra.

### Pruebas de la Historia de Usuario 4

- [X] T043 [P] [US4] Añadir pruebas unitarias de autorización y rechazo con motivo obligatorio y control de presupuesto en `tests/unit/approval.test.js`
- [X] T044 [P] [US4] Añadir pruebas de integración de la bandeja, el detalle y las acciones de autorizar/rechazar en `tests/integration/department-approvals.test.js`

### Implementación de la Historia de Usuario 4

- [X] T045 [US4] Declarar y persistir `departamento`, `solicitante` y `presupuestoDisponible` sin cambiar el esquema base en `src/module-config.js` y `src/storage.js`
- [X] T046 [US4] Crear la bandeja de solicitudes pendientes con solicitante, fecha, motivo y saldo presupuestario en `src/components/approval-inbox.js`
- [X] T047 [US4] Implementar las acciones de autorizar y rechazar (motivo obligatorio) con actualización de estado en `src/app.js` y `src/storage.js`
- [X] T048 [US4] Mostrar la justificación completa antes de los botones de aprobar o rechazar en `src/components/approval-inbox.js`
- [X] T049 [P] [US4] Dar estilo a la bandeja de aprobaciones y al detalle presupuestario en `src/styles.css`

**Punto de control**: El jefe de área puede autorizar o rechazar solicitudes de su departamento de forma independiente.

---

## Fase 7: Historia de Usuario 6 — Verificar y registrar la recepción de productos (Prioridad: P1)

**Objetivo**: Permitir al encargado de recepción registrar entregas contra una Orden de Compra, con cantidades recibidas, rechazadas y motivo, calculando pendientes y actualizando el estado de la orden.

**Prueba Independiente**: Un encargado de recepción registra una entrega parcial y otra completa; el sistema guarda cada recepción con fecha, responsable y observaciones, muestra pendientes y cambia el estado a Recibida o Recibida parcialmente según corresponda.

### Pruebas de la Historia de Usuario 6

- [X] T050 [P] [US6] Añadir pruebas unitarias de validación de recepción (cantidades negativas, no numéricas, exceso, orden cerrada o no emitida) en `tests/unit/reception.test.js`
- [X] T051 [P] [US6] Añadir pruebas de integración de recepción parcial, completa y múltiple con actualización de estado en `tests/integration/reception.test.js`

### Implementación de la Historia de Usuario 6

- [X] T052 [US6] Crear el formulario de recepción con cantidad recibida, cantidad rechazada y motivo por línea en `src/components/reception-form.js`
- [X] T053 [US6] Crear la bandeja de órdenes por recibir (aprobadas o recibidas parcialmente) en `src/components/reception-list.js`
- [X] T054 [US6] Implementar el servicio de recepción acumulada, persistencia de cada registro y actualización del estado de la orden en `src/storage.js`
- [X] T055 [US6] Conectar la vista de recepción al enrutamiento y a la guarda de rol de encargado de recepción en `src/app.js`
- [X] T056 [US6] Mostrar por línea la cantidad solicitada, recibida acumulada, pendiente y el motivo de rechazo en `src/components/reception-form.js`
- [X] T057 [P] [US6] Dar estilo a las vistas de recepción y a las diferencias de cantidades en `src/styles.css`

**Punto de control**: Las recepciones quedan trazadas y el estado de la orden refleja fielmente lo recibido.

---

## Fase 8: Historia de Usuario 7 — Solicitar productos y servicios con justificación (Prioridad: P1)

**Objetivo**: Exigir una justificación obligatoria al registrar una solicitud de compra, almacenarla y mostrarla en el detalle, el historial y la revisión del aprobador.

**Prueba Independiente**: Un solicitante envía una solicitud sin justificación y el sistema la bloquea; con justificación, la solicitud se guarda en estado Pendiente de aprobación y el texto se muestra completo en el detalle y ante el aprobador.

### Pruebas de la Historia de Usuario 7

- [X] T058 [P] [US7] Añadir pruebas unitarias de justificación obligatoria y persistencia en `tests/unit/request.test.js`
- [X] T059 [P] [US7] Añadir pruebas de integración de bloqueo por justificación vacía y visualización posterior en `tests/integration/request-justification.test.js`

### Implementación de la Historia de Usuario 7

- [X] T060 [US7] Declarar el campo `justificacion` y su obligatoriedad condicional para solicitudes de compra en `src/module-config.js` y `src/storage.js`
- [X] T061 [US7] Añadir el área de texto de justificación al formulario de documento y su validación en `src/components/document-form.js` y `src/storage.js`
- [X] T062 [US7] Inicializar las nuevas solicitudes en estado Pendiente de aprobación y mostrar la justificación en el detalle e historial en `src/storage.js`, `src/components/document-form.js` y `src/components/document-list.js`
- [X] T063 [US7] Mostrar la justificación completa antes de los botones de aprobar/rechazar en `src/components/approval-inbox.js`

**Punto de control**: Ninguna solicitud puede guardarse sin justificación y el aprobador siempre la ve antes de decidir.

---

## Fase 9: Historia de Usuario 8 — Buscar y encontrar entidades rápidamente (Prioridad: P2)

**Objetivo**: Mantener la búsqueda rápida de entidades y ampliarla para cubrir los nuevos campos de dominio (proveedor, tipo de documento, folio, justificación).

**Prueba Independiente**: Con múltiples registros, el usuario busca por un término clave (incluidos campos personalizados) y solo ve coincidencias, con un estado vacío claro cuando no hay resultados.

### Implementación de la Historia de Usuario 8

- [X] T064 [P] [US8] Implementar la búsqueda de entidades por nombre, código, categoría, descripción y fecha objetivo en `src/storage.js` y `src/components/search-bar.js`
- [X] T065 [P] [US8] Incluir los campos personalizados declarados en la búsqueda y en las listas en `src/storage.js` y `src/app.js`
- [X] T066 [US8] Ampliar la búsqueda a `tipoDocumento`, `folio`, proveedor, `justificacion` y líneas de detalle, con pruebas en `src/storage.js` y `tests/integration/search-entities.test.js`

**Punto de control**: La búsqueda cubre los campos nuevos sin menoscabo del rendimiento con 500 registros.

---

## Fase 10: Pulido y Preocupaciones Transversales

**Propósito**: Accesibilidad, seguridad, rendimiento, compilación, documentación y verificación final de todas las historias.

- [ ] T067 [P] Revisar etiquetas, foco de teclado, `aria-current` y estructura semántica en las nuevas vistas (`src/components/user-form.js`, `src/components/approval-inbox.js`, `src/components/reception-form.js`)
- [ ] T068 [P] Unificar estados vacíos, mensajes de validación, estados de carga y diseño responsivo de las nuevas vistas en `src/styles.css`
- [X] T069 Verificar el rendimiento de listas, líneas y búsqueda con al menos 500 registros (FR-032, SC-004) en `tests/integration/search-entities.test.js`
- [ ] T070 Verificar y cubrir con pruebas el comportamiento de navegación profunda, recarga y botón atrás sin pérdida de datos en `src/app.js` y `tests/integration/workspace-shell.test.js`
- [ ] T071 Revisar el escapado de todo contenido proveniente de `localStorage` en los nuevos renderers y añadir pruebas de regresión XSS en `tests/integration/users-permissions.test.js` y `tests/integration/reception.test.js`
- [X] T072 Actualizar `README.md` y `quickstart.md` con administración de usuarios, Orden de Compra, aprobaciones, recepción y justificación
- [X] T073 Ejecutar la suite completa (`npm test`) y confirmar ausencia de regresiones (168 pruebas en 24 archivos)
- [X] T074 [P] Reconciliar `data-model.md` con la implementación final de recepciones, roles y líneas de detalle persistidas
- [ ] T075 Corregir la codificación UTF-8 de `src/styles.css` (secuencias inválidas que impiden `vite build`)
- [ ] T076 [P] Resolver los avisos de ESLint (`no-unused-vars`) en `src/auth.js`, `src/storage.js`, `tests/setup/reset-storage.js` y `tests/unit/storage.test.js`
- [ ] T077 Aplicar guardas de permiso `can()` a las acciones de creación/edición/eliminación y a `addRecepcion` en `src/app.js` (FR-046, escenario 2 de US1)
- [ ] T078 Ejecutar `npm run build` tras T075 y confirmar que la compilación de producción termina sin errores
- [ ] T079 Ejecutar `npm test`, `npm run lint` y `npm run build` como verificación final tras cerrar T016, T067-T078

---

## Dependencias y Orden de Ejecución

### Dependencias entre Fases

- **Configuración (Fase 1)**: Sin dependencias.
- **Fundacional (Fase 2)**: Depende de la Fase 1 y bloquea las historias que aún tengan pendientes en esta fase.
- **US1 (Fase 3)**: Depende de la Fase 2; entrega la administración de usuarios y el control de acceso observable.
- **US2 (Fase 4)**: Depende de la Fase 2 (persistencia de líneas y totales); puede avanzar en paralelo con US1 si las guardas de permiso se integran después.
- **US3 (Fase 5)**: Depende de US2 (documentos y totales) y de la infraestructura de roles de la Fase 2.
- **US4 (Fase 6)**: Depende de US3 (estados de aprobación) y de la Fase 2; consume la justificación de US7 cuando está disponible.
- **US6 (Fase 7)**: Depende de US2 (órdenes y líneas) y de la Fase 2 (rol de recepción).
- **US7 (Fase 8)**: Depende de US2 (formulario de documento); habilita la visualización de justificación en US4.
- **US8 (Fase 9)**: Depende de la Fase 2 y se beneficia de los campos nuevos de US2/US7.
- **Pulido (Fase 10)**: Depende de que las historias deseadas estén completas.

### Dependencias entre Historias

- **US1 (P1)**: Independiente tras la Fase 2.
- **US2 (P1)**: Independiente tras la Fase 2.
- **US3 (P1)**: Requiere US2; no requiere US1 para calcular estados, pero sí para restringir quién aprueba.
- **US4 (P1)**: Requiere US3; integra US7 cuando existe.
- **US6 (P1)**: Requiere US2; usa el rol definido por US1.
- **US7 (P1)**: Requiere US2; enriquece US4.
- **US8 (P2)**: Puede ejecutarse en cualquier momento tras la Fase 2.

### Dentro de Cada Historia

- Las pruebas se escriben antes de la implementación y deben fallar primero.
- Modelos/almacenamiento antes que servicios; servicios antes que interfaz; interfaz antes de la integración.
- Completar y validar una historia antes de pasar a la siguiente prioridad.

---

## Oportunidades Paralelas

- T003, T008 y T016 pueden ejecutarse en paralelo dentro de la Fase 1-2.
- T009 y T011 pueden avanzar en paralelo con T012 y T013 (archivos y responsabilidades distintas).
- En US1: T017, T018, T019, T020 y T025 son paralelizables.
- En US2: T026, T027, T028 y T034 son paralelizables; T029-T033 dependen de T028.
- En US3: T035, T036 y T042 son paralelizables; T037 es prerrequisito de T038-T041.
- En US4: T043, T044 y T049 son paralelizables; T045 es prerrequisito de T046-T048.
- En US6: T050, T051 y T057 son paralelizables; T052 y T053 pueden crearse en paralelo antes de T054.
- En US7: T058 y T059 son paralelizables; T060 es prerrequisito de T061-T063.
- En la Fase 10: T067, T068, T076 y T074 pueden ejecutarse en paralelo; T075 bloquea T078; T079 es la verificación final.

### Ejemplo paralelo: Historia de Usuario 2

```text
Task: "Añadir pruebas unitarias de cálculo de subtotales de línea y totales de cabecera en tests/unit/detail-lines.test.js"
Task: "Añadir pruebas de integración de creación de Orden de Compra con líneas y totales en tests/integration/purchase-order.test.js"
Task: "Crear el editor de líneas de detalle en src/components/detail-lines.js"
Task: "Dar estilo a la tabla de líneas de detalle y a los totales en src/styles.css"
```

### Ejemplo paralelo: Historia de Usuario 6

```text
Task: "Añadir pruebas unitarias de validación de recepción en tests/unit/reception.test.js"
Task: "Añadir pruebas de integración de recepción parcial y completa en tests/integration/reception.test.js"
Task: "Crear el formulario de recepción en src/components/reception-form.js"
Task: "Crear la bandeja de órdenes por recibir en src/components/reception-list.js"
```

---

## Estrategia de Implementación

### MVP Primero (US1)

1. Completar Fase 1 (Configuración).
2. Completar Fase 2 (Fundacional) — bloquea las historias con pendientes.
3. Completar Fase 3 (US1): administración de usuarios y control de acceso.
4. Detenerse y validar US1 de forma independiente.
5. Desplegar/demostrar si está listo.

### Entrega Incremental por Valor de Negocio

1. Configuración + Fundacional + US1 → base segura con usuarios y permisos.
2. US2 → primera Orden de Compra con líneas y totales (primer incremento de valor de negocio).
3. US7 → solicitudes con justificación.
4. US3 → aprobación y ciclo de vida.
5. US4 → bandeja de aprobación departamental.
6. US6 → recepción de mercancía.
7. US8 → búsqueda ampliada.
8. Fase 10 → pulido, rendimiento, compilación y verificación.

### Estrategia de Equipo Paralelo

1. El equipo completa Configuración + Fundacional.
2. Tras la Fase 2:
   - Desarrollador A: US1 (usuarios y permisos).
   - Desarrollador B: US2 (Orden de Compra y líneas).
   - Desarrollador C: US7 (justificación) y luego US8 (búsqueda).
3. Tras US2: US3 y US6 pueden avanzar en paralelo.
4. Tras US3 y US7: US4 integra la bandeja de aprobación.
5. Fase 10 se ejecuta cuando las historias deseadas estén completas.

---

## Notas

- `[P]` indica archivos distintos y sin dependencias pendientes.
- `[Historia]` traza cada tarea a la historia de spec.md correspondiente.
- Las historias US1-US4, US6-US8 conservan la numeración de spec.md; no existe US5 en la especificación actual.
- Cada historia es completable y comprobable de forma independiente.
- Verificar que las pruebas fallan antes de implementar.
- Confirmar cada tarea o grupo lógico con `npm test` cuando aplique.
- Evitar tareas vagas, conflictos sobre el mismo archivo y dependencias cruzadas que rompan la independencia.
- Estado actual verificado: `npm test` → 168 pruebas aprobadas; `npm run lint` → 0 errores y 11 avisos; `npm run build` → bloqueado por codificación de `src/styles.css` (T075).
