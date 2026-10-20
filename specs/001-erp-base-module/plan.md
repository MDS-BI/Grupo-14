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
├── module-config.js
└── components/
    ├── shell.js        (marco del espacio de trabajo: barra superior, logotipo SVG, barra lateral, estado de módulo activo)
    ├── dashboard.js    (vista de inicio: cuadrícula de acciones rápidas + tarjetas de estadísticas en vivo)
    ├── entity-form.js  (formulario de creación/edición de entidades con campos personalizados)
    └── document-form.js (formulario de creación/edición de documentos con campos personalizados y ciclo de vida de estados)

tests/
├── unit/
├── integration/
└── setup/
```

**Decisión de Estructura**: Una aplicación Vite simple con un único punto de entrada HTML, un pequeño conjunto de módulos JavaScript y CSS en un archivo separado. Se usará localStorage para la persistencia de modo que la aplicación permanezca ligera y autónoma. Los componentes se dividen en pares de entidad (datos maestros) y documento (transaccional) que reflejan los dos conceptos centrales del módulo base, de modo que un módulo personalizado pueda renombrar o extender cada par de forma independiente. `shell.js` posee el marco del espacio de trabajo ERP — un logotipo monograma SVG en línea derivado del nombre del módulo, la barra superior y la barra lateral de módulos — envolviendo todas las vistas para que la marca y la navegación permanezcan consistentes sin duplicar marcado. `dashboard.js` renderiza los botones de acción rápida y las tarjetas de estadísticas de la pantalla de entrada, leyendo los recuentos del almacenamiento cada vez que se vuelve visible. `module-config.js` centraliza todos los puntos de adaptación — nombre del módulo, etiquetas de términos, definiciones de campos personalizados, ciclo de vida de estados y color de acento — manteniendo la personalización del dominio fuera del código central; el estilo se controla mediante propiedades personalizadas de CSS (tokens de diseño) en `styles.css` para que el color de acento configurado se aplique globalmente.

## Configuración de Referencia: Módulo Adquisiciones y Compras 

 

El área de negocio concreta sobre la que se valida la base es **Adquisiciones y Compras**. El perfil se declara íntegramente en `src/module-config.js` sin tocar el código central, y sirve como ejemplo de referencia de adaptación: 

 

- **Identidad**: `moduleName: "Adquisiciones y Compras"`, con color de acento propio (`theme.accentColor`). 

- **Terminología**: Entidad → **Proveedor**; Documento → **Orden de Compra** (cubre solicitudes de cotización, órdenes de compra, recepciones y facturas de proveedor). 

- **Campos personalizados en proveedores**: 

  - `categoriaProveedor` (select: Materias primas / Servicios / Equipos / General, obligatorio) — clasifica el tipo de suministro que aporta el proveedor. 

  - `vendedorContacto` (texto, opcional) — representante o vendedor asignado por el proveedor. 

  - Los campos base `taxId` (RFC/NIT/CUIT), `creditLimit` y `paymentTerms` aportan la identidad fiscal y las condiciones de compra acordadas. 

- **Campos personalizados en documentos**: 

  - `tipoDocumento` (select: Solicitud de Cotización / Orden de Compra / Recepción / Factura de Proveedor, obligatorio) — identifica la etapa del flujo de compras que representa el documento. 

  - `prioridad` (select: Normal / Urgente, opcional). 

  - Los campos base `series`/`folio` generan la numeración oficial (p. ej., `SC-1001`, `OC-2045`), e `subtotal`, `discount`, `taxAmount`, `totalAmount` y `currency` registran el desglose económico de la compra. 

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

 
## Seguimiento de Complejidad

Este plan no introdujo violaciones de la constitución.
