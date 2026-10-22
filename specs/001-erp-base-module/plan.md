# Plan de Implementación: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Rama**: `001-erp-base-module` | **Fecha**: 2026-07-08 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/001-erp-base-module/spec.md`

## Resumen

Construir una aplicación web ligera con Vite que sirva como módulo base de software de planificación de recursos empresariales (ERP). El módulo proporciona la base común que todo módulo ERP personalizado necesita: gestión de datos maestros (Entidades), documentos transaccionales vinculados (Documentos), flujos de crear/editar/eliminar/buscar, validación y persistencia local — construida principalmente con HTML, CSS y JavaScript vanilla. La aplicación se presenta como un espacio de trabajo ERP coherente: una barra superior con marca (logotipo derivado + nombre del módulo) y una barra lateral persistente de botones de módulo envuelven cada pantalla, y la pantalla de entrada es un panel estilo ERP que ofrece botones de acción rápida para las tareas clave (nueva entidad, nuevo documento, abrir áreas de gestión, buscar registros) además de estadísticas de registros en vivo. La adaptación a un módulo específico (p. ej., Ventas) se realiza mediante un único archivo de configuración (`src/module-config.js`) que cubre terminología, campos personalizados, ciclo de vida de documentos y color de acento, de modo que el código central permanece intacto.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS  
**Dependencias Principales**: Vite, sin framework de interfaz pesado  
**Almacenamiento**: localStorage del navegador para una instancia del módulo de espacio único  
**Pruebas**: Vitest con jsdom para pruebas unitarias y de interacción  
**Plataforma Objetivo**: Navegadores modernos de escritorio y móviles  
**Tipo de Proyecto**: Aplicación web  
**Objetivos de Rendimiento**: Interacciones responsivas para listas de hasta 500 registros; la búsqueda y las actualizaciones de la interfaz deben sentirse instantáneas  
**Restricciones**: Huella mínima de librerías, despliegue simple, sin backend requerido; la estructura debe mantenerse extensible para módulos personalizados  
**Escala/Alcance**: Módulo base con CRUD de datos maestros (Entidad) y documentos transaccionales (Documento), búsqueda y capacidades de navegación

## Verificación de la Constitución

*COMPROBACIÓN: Debe pasar antes de la investigación de la Fase 0. Reverificar tras el diseño de la Fase 1.*

- Calidad: La implementación usará una estructura JavaScript pequeña y modular con límites de función claros y nomenclatura consistente, manteniendo las preocupaciones base (almacenamiento, identidad, integridad referencial) separadas de la lógica específica del dominio para que los módulos personalizados puedan extenderlas.
- Pruebas: Los flujos centrales de crear, editar, eliminar y buscar estarán cubiertos por pruebas automatizadas antes de completar.
- Experiencia de Usuario: La interfaz proporcionará mensajes de validación claros, estados vacíos y comportamiento de formulario consistente, presentados dentro de un marco de espacio de trabajo ERP con marca (barra superior + barra lateral) que se ve y se comporta idénticamente en todas las pantallas.
- Rendimiento: La búsqueda y el renderizado de listas se optimizarán para colecciones de hasta 500 registros usando actualizaciones ligeras del DOM.

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
├── main.js
├── styles.css
├── storage.js
├── app.js
├── module-config.js  (puntos de adaptación + sub-esquema de Líneas de Detalle y cálculo de totales)
└── components/
    ├── shell.js        (marco del espacio de trabajo: barra superior, logotipo SVG, barra lateral, estado de módulo activo)
    ├── dashboard.js    (vista de inicio: cuadrícula de acciones rápidas + tarjetas de estadísticas en vivo)
    ├── entity-form.js  (formulario de creación/edición de entidades con campos personalizados)
    └── document-form.js (formulario de creación/edición de documentos con campos personalizados, ciclo de vida de estados y líneas de detalle)

tests/
├── unit/
├── integration/
└── setup/
```

**Decisión de Estructura**: Una aplicación Vite simple con un único punto de entrada HTML, un pequeño conjunto de módulos JavaScript y CSS en un archivo separado. Se usará localStorage para la persistencia de modo que la aplicación permanezca ligera y autónoma. Los componentes se dividen en pares de entidad (datos maestros) y documento (transaccional) que reflejan los dos conceptos centrales del módulo base, de modo que un módulo personalizado pueda renombrar o extender cada par de forma independiente. `shell.js` posee el marco del espacio de trabajo ERP — un logotipo monograma SVG en línea derivado del nombre del módulo, la barra superior y la barra lateral de módulos — envolviendo todas las vistas para que la marca y la navegación permanezcan consistentes sin duplicar marcado. `dashboard.js` renderiza los botones de acción rápida y las tarjetas de estadísticas de la pantalla de entrada, leyendo los recuentos del almacenamiento cada vez que se vuelve visible. `module-config.js` centraliza todos los puntos de adaptación — nombre del módulo, etiquetas de términos, definiciones de campos personalizados, ciclo de vida de estados y color de acento — manteniendo la personalización del dominio fuera del código central; el estilo se controla mediante propiedades personalizadas de CSS (tokens de diseño) en `styles.css` para que el color de acento configurado se aplique globalmente.

## Configuración de Referencia: Módulo Adquisiciones y Compras 

 

El área de negocio concreta sobre la que se valida la base es **Adquisiciones y Compras**. El perfil se declara íntegramente en `src/module-config.js` sin tocar el código central, y sirve como ejemplo de referencia de adaptación: 

 

- **Identidad**: `moduleName: "Adquisiciones y Compras"`, con color de acento propio (`theme.accentColor: "#0f766e"`). 

- **Estado de la implementación**: el perfil está **activo** — `userConfig` en `src/module-config.js` declara esta configuración completa (antes `userConfig = null`), de modo que la aplicación arranca directamente como módulo de Adquisiciones y Compras sin tocar el código central. Al quedar activo, los campos obligatorios del perfil (`categoriaProveedor`, `tipoDocumento`, `fechaEmision`) y el ciclo de vida de estados se aplican en los formularios de entidad y documento, y las pruebas de integración de la base se completan con esos campos. 

- **Terminología**: Entidad → **Proveedor**; Documento → **Orden de Compra** (cubre solicitudes de cotización, órdenes de compra, recepciones y facturas de proveedor). 

- **Campos personalizados en proveedores**: 

  - `categoriaProveedor` (select: Materias primas / Servicios / Equipos / General, obligatorio) — clasifica el tipo de suministro que aporta el proveedor. 

  - `vendedorContacto` (texto, opcional) — representante o vendedor asignado por el proveedor. 

  - Los campos base `taxId` (RFC/NIT/CUIT), `creditLimit` y `paymentTerms` aportan la identidad fiscal y las condiciones de compra acordadas. 

- **Campos personalizados en documentos**: 

  - `tipoDocumento` (select: Solicitud de Cotización / Orden de Compra / Recepción / Factura de Proveedor, obligatorio) — identifica la etapa del flujo de compras que representa el documento. 

  - `prioridad` (select: Normal / Urgente, opcional). 

  - `tipoCambio` (número, opcional) — valor de la divisa del documento (campo base `currency`) frente a la moneda local; queda congelado en el documento para que el costo histórico de la compra no cambie aunque el tipo de cambio se actualice. 

  - `fechaEmision` (fecha, obligatorio) — día exacto en que se fijó ese tipo de cambio y se creó el documento, para dar trazabilidad del costo congelado. 

  - Los campos base `series`/`folio` generan la numeración oficial (p. ej., `SC-1001`, `OC-2045`), e `subtotal`, `discount`, `taxAmount`, `totalAmount` y `currency` registran el desglose económico de la compra. 

- **Divisas y tipos de cambio**: 

  El manejo de múltiples divisas se apoya en tres datos que viajan juntos en cada documento de compra: la moneda en que están expresados los importes, el tipo de cambio aplicado y el día en que se fijó. 

  | Dato | Tipo | Obligatorio | Semántica | 

  |---|---|---|---| 

  | `currency` | text (campo base) | no | Código de moneda de los importes del documento (p. ej., MXN, USD, EUR). | 

  | `tipoCambio` | number | no | Valor de una unidad de la divisa del documento frente a la moneda local; queda congelado al guardar. | 

  | `fechaEmision` | date | sí | Fecha (YYYY-MM-DD) en que se fijó ese tipo de cambio y se creó el documento. | 

  Reglas del punto: el `tipoCambio` se almacena como **instantánea dentro del documento** y no se recalcula a partir de un catálogo de tipos de cambio, de modo que el costo histórico de la compra permanece estable aunque la moneda o el tipo de cambio cambien después; el storage valida que sea un número y que `fechaEmision` sea una fecha de calendario válida y no vacía (campo obligatorio), de modo que todo documento con divisas queda trazado al día exacto de su emisión. La moneda local de referencia es un punto de extensión natural (`monedaLocal` en el perfil) para convertir los importes a la moneda funcional del módulo. 

- **Ciclo de vida de estados** (flujo de adquisiciones y compras): 

 

  | Estado actual | Transiciones permitidas | 

  |---|---| 

  | borrador | cotización, cancelado | 

  | cotización | aprobado, cancelado | 

  | aprobado | recibido, cancelado | 

  | recibido | facturado | 

  | facturado | *(fin)* | 

  | cancelado | *(fin)* | 

 

  El flujo avanza solicitud de cotización (cotización) → orden de compra aprobada (aprobado) → recepción de mercancía (recibido) → factura de proveedor registrada (facturado); la cancelación queda permitida hasta que la recepción no se haya confirmado. 

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

## Seguimiento de Complejidad

Este plan no introdujo violaciones de la constitución.
