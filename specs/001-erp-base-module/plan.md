# Plan de Implementación: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Rama**: `001-erp-base-module` | **Fecha**: 2026-07-08 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/001-erp-base-module/spec.md`

## Resumen

Construir una aplicación web ligera con Vite que funcione como módulo de **Adquisiciones y Compras** de un software de planificación de recursos empresariales (ERP). Este perfil es una implementación de referencia sobre un módulo base reutilizable: la lógica genérica de entidades, **Documentos de Compra**, navegación, validación, persistencia y búsqueda permanece separada de las reglas del dominio. El alcance cubre usuarios y permisos, proveedores con RUT chileno, departamentos y presupuestos, catálogo, solicitudes justificadas, cotizaciones, Órdenes de Compra (`OC-XXXX`), recepciones, pago, auditoría, dashboard, exportación y respaldo.

La aplicación se presenta como un espacio de trabajo ERP coherente: una barra superior con marca (logotipo derivado y nombre del módulo) y una barra lateral persistente de navegación permitirán acceder a las distintas áreas de gestión. La pantalla de inicio ofrecerá acciones rápidas y tarjetas KPI refrescadas por evento con staleness máxima de 2 s; las alertas operativas incluirán Órdenes de Compra atrasadas y permitirán navegar a la bandeja filtrada correspondiente.

El módulo contemplará distintos roles de usuario: **solicitante, encargado de adquisiciones y compras, aprobador, encargado de recepción y administrador del sistema**, cada uno con permisos y funcionalidades de acuerdo con sus responsabilidades. La autenticación, la segregación de funciones y la bitácora son controles funcionales de una app solo-cliente; la manipulación local del navegador se registra como riesgo aceptado de la Prueba de Concepto.

La aplicación será construida principalmente con HTML, CSS y JavaScript vanilla, utilizando Vite como herramienta de desarrollo. Su diseño buscará mantener una interfaz consistente con la estructura de un ERP, facilitando la trazabilidad de las adquisiciones y el control del proceso de compras. La identidad fiscal activa será RUT chileno con validación módulo 11 y formato `XX.XXX.XXX-X`.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS  
**Dependencias Principales**: Vite, Vitest, jsdom, ESLint; sin framework de interfaz pesado  
**Almacenamiento**: `localStorage` del navegador para una instancia del módulo de espacio único, con `schemaVersion` y `revision` por registro para control optimista de concurrencia  
**Pruebas**: Vitest con jsdom para pruebas unitarias, integración y comerciales; gate final obligatorio de `npm run test`, `npm run lint` y `npm run build`  
**Plataforma Objetivo**: Navegadores modernos de escritorio y móviles  
**Tipo de Proyecto**: Aplicación web  
**Objetivos de Rendimiento**: Con 500 entidades, p95 de búsqueda ≤500 ms y render inicial de lista ≤1.000 ms medidos desde la interacción hasta que el resultado es visible  
**Tiempo real**: Actualización por evento con staleness máxima de 2 s para dashboard, presupuestos y alertas; sin sondeo continuo  
**Concurrencia**: Toda mutación relee el snapshot y compara `revision`/`updatedAt`; en conflicto bloquea la escritura y exige recargar o reintentar  
**Identidad fiscal**: RUT chileno validado con módulo 11 y formateado `XX.XXX.XXX-X`, con valor único entre proveedores  
**Restricciones**: Huella mínima de librerías, despliegue simple, sin backend requerido; la estructura debe mantenerse extensible para módulos personalizados  
**Riesgo aceptado**: Sin backend no se garantiza autenticación criptográfica ni inmutabilidad de auditoría frente a manipulación del navegador; se documenta como limitación de la Prueba de Concepto  
**Escala/Alcance**: Módulo base con CRUD de datos maestros (Entidad), Documentos de Compra, `lineasDetalle`, búsqueda, navegación y perfil de referencia Adquisiciones y Compras con HU1-HU18

## Verificación de la Constitución

*COMPROBACIÓN: Debe pasar antes de la investigación de la Fase 0. Reverificar tras el diseño de la Fase 1.*

- Calidad (I): La estructura JavaScript será modular con límites explícitos entre `storage`, `auth`, `module-config`, `rut`, `dom`, shell, formularios, bandejas y dashboard. Los módulos huérfanos `src/approval.js`, `src/components/approval-panel.js` y `src/components/user-profile.js` se reparan o retiran, y su decisión queda documentada antes de cualquier fase de integración.
- Pruebas (II): Cada historia P1 tendrá pruebas unitarias y de integración antes de su implementación; T078 queda marcado como gate provisional y un gate final posterior a T108 ejecuta `npm run test`, `npm run lint` y `npm run build`.
- Experiencia de Usuario (III): Los mensajes de validación, estados vacíos, confirmaciones de salida, redirección por sesión, foco/ARIA y el comportamiento de navegación serán idénticos en todas las vistas; se validarán en las pruebas de aceptación de cada historia.
- Rendimiento (IV): Con 500 registros se medirán p95 ≤500 ms para búsqueda y render inicial ≤1.000 ms; `revision`/`updatedAt` evita reescrituras innecesarias y el dashboard se actualiza solo por eventos.
- Riesgo justificado: La autenticación y la auditoría solo-cliente no cumplen garantías criptográficas ni de inmutabilidad frente a manipulación local; se acepta explícitamente para la Prueba de Concepto y se compensa con controles funcionales, validación de esquema en restauración y documentación del riesgo.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/001-erp-base-module/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Código Fuente (raíz del repositorio)

```text
src/
├── main.js                       (punto de entrada; redirección a login cuando no hay sesión)
├── styles.css                    (tokens de diseño y estilos ERP compartidos)
├── app.js                        (enrutador de vistas y composición del shell)
├── auth.js                       (sesión, roles, permisos y segregación funcional)
├── storage.js                    (CRUD, esquema, revision/updatedAt, backup/restore, auditoría)
├── module-config.js              (perfil activo, terminología, campos, ciclo de vida, líneas de detalle y totales)
├── rut.js                        (validación módulo 11 y formato XX.XXX.XXX-X)
├── dom.js                        (helpers DOM, focus/ARIA y escape de texto)
├── format.js                     (formato CLP, fechas YYYY-MM-DD y números)
├── data.js                       (semilla/fixtures sintéticas; sin proveedor real)
├── approval.js                   (reglas de aprobación reutilizadas por bandeja y panel)
├── vendor-form.js                (formulario de proveedor con RUT y categoría)
└── components/
    ├── shell.js                  (barra superior, logotipo SVG y barra lateral persistentes)
    ├── dashboard.js              (acciones rápidas, KPI y alertas por evento)
    ├── entity-form.js            (formulario base reutilizable de datos maestros)
    ├── document-form.js          (documentos, estado y líneas de detalle)
    ├── approval-panel.js         (panel de aprobación usado por la bandeja)
    ├── user-management.js        (alta/edición de usuarios y asignación de roles)
    └── user-profile.js           (perfil de usuario visible desde el shell)

tests/
├── unit/
├── integration/
├── commercial/
├── e2e/                          (flujos HTTP/contract de HU1-HU18 cuando aplique)
└── setup/
```

**Decisión de Estructura**: Una aplicación Vite simple con un único punto de entrada HTML, un pequeño conjunto de módulos JavaScript y CSS en un archivo separado. Se usará localStorage para la persistencia de modo que la aplicación permanezca ligera y autónoma. Los componentes se dividen en pares de entidad (datos maestros) y documento (transaccional) que reflejan los dos conceptos centrales del módulo base, de modo que un módulo personalizado pueda renombrar o extender cada par de forma independiente. `shell.js` posee el marco del espacio de trabajo ERP — un logotipo monograma SVG en línea derivado del nombre del módulo, la barra superior y la barra lateral de módulos — envolviendo todas las vistas para que la marca y la navegación permanezcan consistentes sin duplicar marcado. `dashboard.js` renderiza los botones de acción rápida y las tarjetas de estadísticas de la pantalla de entrada, leyendo los recuentos del almacenamiento cada vez que se vuelve visible. `module-config.js` centraliza todos los puntos de adaptación — nombre del módulo, etiquetas de términos, definiciones de campos personalizados, ciclo de vida de estados y color de acento — manteniendo la personalización del dominio fuera del código central; el estilo se controla mediante propiedades personalizadas de CSS (tokens de diseño) en `styles.css` para que el color de acento configurado se aplique globalmente. `auth.js` separa sesión/roles del storage, `rut.js` y `format.js` concentran validación/formatos, y `dom.js` evita duplicar manejo de foco y escape. Los archivos antes huérfanos `approval.js`, `components/approval-panel.js` y `components/user-profile.js` quedan conectados desde `app.js`/`shell.js` y cubiertos por pruebas; `user-management.js` implementa la administración de usuarios de FR-016/FR-017.

## Configuración de Referencia: Módulo Adquisiciones y Compras 

 

El área de negocio concreta sobre la que se valida la base es **Adquisiciones y Compras**. El perfil se declara íntegramente en `src/module-config.js` sin tocar el código central, y sirve como ejemplo de referencia de adaptación: 

 

- **Identidad**: `moduleName: "Adquisiciones y Compras"`, con color de acento propio (`theme.accentColor: "#0f766e"`). 

- **Estado de la implementación**: el perfil está **activo** — `userConfig` en `src/module-config.js` declara esta configuración completa (antes `userConfig = null`), de modo que la aplicación arranca directamente como módulo de Adquisiciones y Compras sin tocar el código central. Al quedar activo, los campos obligatorios del perfil (`categoriaProveedor`, `tipoDocumento`, `fechaEmision`) y el ciclo de vida de estados se aplican en los formularios de entidad y documento, y las pruebas de integración de la base se completan con esos campos. 

- **Terminología**: Entidad → **Proveedor**; Documento → **Orden de Compra** (cubre solicitudes de cotización, órdenes de compra, recepciones y facturas de proveedor). 

- **Campos personalizados en proveedores**: 

  - `categoriaProveedor` (select: Materias primas / Servicios / Equipos / General, obligatorio) — clasifica el tipo de suministro que aporta el proveedor. 

  - `vendedorContacto` (texto, opcional) — representante o vendedor asignado por el proveedor. 

  - Los campos base `taxId` (RUT chileno `XX.XXX.XXX-X`, obligatorio y único, validado con módulo 11), `creditLimit` y `paymentTerms` aportan la identidad fiscal y las condiciones de compra acordadas. 

- **Campos personalizados en documentos**: 

  - `tipoDocumento` (select: Solicitud de Cotización / Orden de Compra / Recepción / Factura de Proveedor, obligatorio) — identifica la etapa del flujo de compras que representa el documento. 

  - `prioridad` (select: Normal / Urgente, opcional). 

  - `tipoCambio` (número, opcional) — valor de la divisa del documento (campo base `currency`) frente a la moneda local; queda congelado en el documento para que el costo histórico de la compra no cambie aunque el tipo de cambio se actualice. 

  - `fechaEmision` (fecha, obligatorio) — día exacto en que se fijó ese tipo de cambio y se creó el documento, para dar trazabilidad del costo congelado. 

  - Los campos base `series`/`folio` generan la numeración oficial; las Órdenes de Compra usan exclusivamente `OC-XXXX` y el sufijo es único e irreversible, mientras que `subtotal`, `discount`, `taxAmount`, `totalAmount` y `currency` registran el desglose económico de la compra. 

- **Divisas y tipos de cambio**: 

  El manejo de múltiples divisas se apoya en tres datos que viajan juntos en cada documento de compra: la moneda en que están expresados los importes, el tipo de cambio aplicado y el día en que se fijó. 

  | Dato | Tipo | Obligatorio | Semántica | 

  |---|---|---|---| 

  | `currency` | text (campo base) | sí | Código de moneda de los importes del documento (p. ej., CLP, USD, EUR); la moneda local de referencia es CLP. | 

  | `tipoCambio` | number | no | Valor de una unidad de la divisa del documento frente a la moneda local; queda congelado al guardar. | 

  | `fechaEmision` | date | sí | Fecha (YYYY-MM-DD) en que se fijó ese tipo de cambio y se creó el documento. | 

  Reglas del punto: el `tipoCambio` se almacena como **instantánea dentro del documento** y no se recalcula a partir de un catálogo de tipos de cambio, de modo que el costo histórico de la compra permanece estable aunque la moneda o el tipo de cambio cambien después; el storage valida que sea un número y que `fechaEmision` sea una fecha de calendario válida y no vacía (campo obligatorio), de modo que todo documento con divisas queda trazado al día exacto de su emisión. La moneda local de referencia es CLP (`monedaLocal: "CLP"` en el perfil); las comparaciones monetarias usan tolerancia absoluta de 0,01 CLP para evitar falsos descalces por coma flotante. 

- **Ciclo de vida de estados** (flujo de adquisiciones y compras):

  | Estado actual | Transiciones permitidas |
  |---|---|
  | Pendiente de aprobación | Aprobada, Rechazada |
  | Aprobada | En cotización, Emitida, Rechazada |
  | En cotización | Aprobada, Rechazada |
  | Emitida | Recibida parcialmente, Recibida, Rechazada |
  | Recibida parcialmente | Recibida |
  | Recibida | Pagada |
  | Pagada | *(fin)* |
  | Rechazada | *(fin)* |

  El flujo avanza solicitud justificada pendiente → aprobación → cotización/orden emitida con folio exclusivo `OC-XXXX` → recepción parcial → recepción completa → pago; una orden en cotización vuelve a Aprobada al elegir proveedor. La emisión solo parte de Aprobada, los estados Recibida parcialmente y Recibida solo los asigna el registro de recepciones (FR-045), Pagada solo se asigna tras registrar el pago, y el rechazo queda permitido mientras no se haya confirmado ninguna recepción. El override de un aprobador se registra con motivo obligatorio en la auditoría. 

- **Líneas de Detalle (Items)** — relación 1 a N con el Documento: 

  Cada Orden de Compra, Recepción o Factura de Proveedor puede tener cero o muchas líneas de detalle; cada línea pertenece a un único documento mediante la clave foránea `documento_id` (→ `document.id`). El sub-esquema se declara con `LINEA_DETALLE_FIELDS` en `src/module-config.js` y se adapta desde la clave `lineasDetalle` de `userConfig`: 

  | Campo | Tipo | Obligatorio | Notas | 
  |---|---|---|---| 
  | `documento_id` | text | no | FK → `document.id`; la asigna el storage (relación 1 a N), no el usuario. | 
  | `producto_id` | text | sí | Referencia al catálogo de bienes/servicios (id o SKU). | 
  | `descripcion` | text | sí | Descripción libre del ítem. | 
  | `cantidad` | number | sí | Numero estrictamente positivo. | 
  | `unidadMedida` | select | sí | Opciones desde `lineasDetalle.unidadesMedida` (ej. unidades, cajas, litros). | 
  | `precioUnitario` | number | sí | Numero no negativo. | 
  | `porcentajeDescuentoLinea` | number | no | Porcentaje 0..`maxPorcentajeDescuento` (def. 100), por defecto 0. | 
  | `subtotalLinea` | number | calculado | Nunca lo escribe el usuario. | 

  Configuración opcional de la sección: `label` (etiqueta en la UI), `unidadesMedida` (unidades ofrecidas en el select), `maxPorcentajeDescuento` (tope de descuento por línea) y `camposExtra` (campos personalizados adicionales por línea, validados contra colisiones con los campos base). 

- **Integración con la cabecera (cálculo de totales)**: 

  El usuario nunca escribe a mano los totales de la cabecera; se derivan de las líneas. Por cada línea: `subtotalLinea = cantidad × precioUnitario × (1 − porcentajeDescuentoLinea / 100)`. La **sumatoria de los `subtotalLinea` alimenta automáticamente el `subtotal` general de la cabecera** (`documento.subtotal = Σ subtotalLinea`). Luego la cascada hacia la cabecera es: impuesto sobre la base ya descontada (`taxAmount = (subtotal − discount) × tasaImpuesto`) y `totalAmount = subtotal − discount + taxAmount`. Cualquier cambio en las líneas recalcula en cascada estos totales. Estos cálculos se exponen mediante los helpers `computeSubtotalLinea`, `subtotalFromLineas` y `applyTotalesToCabecera` en `src/module-config.js`, que el storage y el formulario de documento consumen al guardar. 

## Autenticación, Roles y Seguridad

La sesión se resuelve en `src/auth.js` desde `usuarios` persistidos con contraseña hash saltada; sin sesión, `main.js` redirige a `/login` y conserva la ruta solicitada para volver tras autenticarse. Los roles solicitante, encargado de compras, aprobador, encargado de recepción y administrador se comprueban en la capa de aplicación antes de renderizar acciones o ejecutar mutaciones. La segregación de funciones impide que el solicitante apruebe su propia solicitud y que el aprobador confirme recepciones; el administrador puede corregir registros pero todo override exige comentario obligatorio y genera evento de auditoría.

La autenticación y la auditoría son controles funcionales dentro de una app solo-cliente. Un usuario con acceso al navegador puede alterar `localStorage`; este riesgo se acepta para la Prueba de Concepto, se documenta en la UI y en el resumen de seguridad, y se mitiga con validación de esquema, hash saltado, eventos de auditoría y verificación de `revision` en cada escritura. No se presentan estos mecanismos como garantías criptográficas.

## Auditoría

Cada cambio relevante (creación/edición, aprobación, rechazo, override, emisión de OC, recepción, pago, alta de usuario, exportación y restauración) escribe un evento inmutable en `eventosAuditoria` con: `eventoId`, `timestamp`, `usuarioId`, `nombreUsuario`, `rol`, `accion`, `entidadTipo`, `entidadId`, `estadoAnterior`, `estadoNuevo`, `comentario` y `revision`. La bitácora se ordena por timestamp descendente, es de solo lectura para todos los roles y se incluye en exportaciones/respaldos. Los archivos huérfanos de aprobación y perfil se integran para consumir estos eventos en lugar de duplicar lógica.

## Concurrencia y Persistencia

Todo registro persistente incluye `schemaVersion`, `id`, `revision` (`entero ≥ 1`) e `updatedAt` (`ISO-8601`). Antes de guardar, el storage relee el snapshot, compara `revision`/`updatedAt` con la copia cargada y, si difieren, cancela la escritura con un mensaje de conflicto y ofrece recargar o reintentar. Nunca se sobrescribe silenciosamente una versión más reciente. Los campos calculados (`subtotalLinea`, `subtotal`, `taxAmount`, `totalAmount`) se recalculan en el servicio de configuración al guardar y no se aceptan desde el formulario.

Los identificadores son estables y las referencias se validan al guardar: eliminar un proveedor elimina en cascada sus documentos y registra el evento de auditoría asociado; eliminar un producto con líneas que lo referencian se bloquea. La semilla y las fixtures usan proveedores sintéticos (`Proveedor Ejemplo S.A.`, RUT válido de prueba) y nunca datos reales.

## Exportación y Respaldo

La exportación produce un único archivo JSON con `schemaVersion`, `exportedAt`, `modulo`, `usuarios`, `proveedores`, `departamentos`, `presupuestos`, `productos`, `solicitudes`, `cotizaciones`, `ordenesCompra`, `recepciones`, `pagos`, `eventosAuditoria` y `configModulo`. La restauración valida la versión del esquema, la presencia de todas las colecciones obligatorias, tipos básicos, RUT y unicidad de `folio` antes de reemplazar el estado; cualquier fallo aborta sin mezclar datos. Las exportaciones se registran en auditoría y no incluyen contraseñas en claro.

## Tiempo Real y Rendimiento

No se usa sondeo continuo. Los cambios de estado, recepciones, pagos y presupuestos emiten eventos consumidos por `dashboard.js`, las alertas de OC atrasadas y los saldos presupuestarios; la UI se considera actualizada cuando el evento es visible, con staleness ≤2 s. Las listas de hasta 500 registros se renderizan con actualizaciones incrementales del DOM y búsqueda indexada en memoria; las metas verificables son p95 ≤500 ms para búsqueda y render inicial ≤1.000 ms, medidas desde la interacción hasta el resultado visible.

## Resolución de Módulos Huérfanos

`src/approval.js`, `src/components/approval-panel.js` y `src/components/user-profile.js` dejan de ser archivos aislados: `approval.js` expone las reglas usadas por la bandeja de aprobaciones, `approval-panel.js` se monta desde la vista de bandeja y `user-profile.js` se monta desde el shell. `user-management.js` cubre FR-016/FR-017. Cada uno queda referenciado desde `app.js` o `shell.js` y con prueba que falla si la importación se elimina.

## Verificación Final de la Constitución (post-diseño)

El diseño satisface I (separación de núcleo configurable y dominio), II (pruebas por historia y gate final), III (shell, validación, foco/ARIA y navegación consistentes) y IV (presupuestos de rendimiento y concurrencia). La única desviación justificada es la ausencia de backend para autenticación/auditoría criptográficas, aceptada como riesgo de Prueba de Concepto y compensada con controles funcionales, validación de restauración y documentación explícita. No existen otras violaciones.

## Seguimiento de Complejidad

Este plan introduce una única desviación justificada: autenticación/auditoría solo-cliente dentro del riesgo aceptado de Prueba de Concepto; no hay nuevas violaciones de la constitución.
