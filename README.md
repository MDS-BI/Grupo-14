# Integrantes del proyecto
* Josefa Isidora ValdÃ©s Araya
* Daniel Vicente Araya RodrÃ­guez
* Pablo Esteban RendÃ³n FernÃ¡ndez
* Candela LucÃ­a Cortez Israel
* Josefa Amara DÃ­az HenrÃ­quez
* MatÃ­as Arnoldo QuijÃ³n Winser

# Proposito del proyecto
Nuestro proyecto tiene como propÃ³sito diseÃ±ar e implementar un prototipo funcional del mÃ³dulo de Compras y Adquisiciones de un sistema ERP, orientado a facilitar la gestiÃ³n del abastecimiento y la relaciÃ³n con los proveedores de una empresa. Buscamos que los usuarios puedan generar solicitudes de compra, comparar cotizaciones, emitir Ã³rdenes de compra y registrar recepciones mediante una interfaz clara y fÃ¡cil de utilizar, que permite organizar la informaciÃ³n y dar seguimiento a cada operaciÃ³n.

Como equipo, queremos desarrollar un producto mÃ­nimo viable que represente las principales funciones del mÃ³dulo y contemple su futura integraciÃ³n con otras Ã¡reas del ERP, como inventario, finanzas y cuentas por pagar. Para ello, definiremos un modelo de datos coherente y utilizaremos una metodologÃ­a de desarrollo basada en especificaciones. El resultado serÃ¡ un prototipo de interfaz que permitirÃ¡ demostrar el flujo de adquisiciones y establecer una base para futuras mejoras y ampliaciones.
# Estado de implementación — Módulo de Adquisiciones y Compras

La aplicación incluye actualmente:

- Marco ERP con panel, navegación lateral, búsqueda y persistencia en `localStorage`.
- Administración de usuarios y roles (solicitante, compras, aprobador, recepción, administrador) con guardas de permisos.
- Órdenes de compra con líneas de detalle, descuentos, moneda, tipo de cambio y totales en cascada.
- Solicitudes de cotización con justificación obligatoria y estado "pendiente de aprobación".
- Aprobación y rechazo con validación de datos comerciales del proveedor y límite de crédito.
- Recepción parcial o completa de órdenes con seguimiento de cantidades pendientes.
- Búsqueda de entidades y documentos por folio, estado, justificación y campos personalizados.

## Comandos

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo
npm test         # suite de pruebas (Vitest + jsdom)
npm run lint     # análisis estático con ESLint
npm run build    # compilación de producción
```
