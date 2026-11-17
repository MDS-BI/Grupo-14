# Integrantes del proyecto
* Josefa Isidora Valdés Araya
* Daniel Vicente Araya Rodríguez
* Pablo Esteban Rendón Fernández
* Candela Lucía Cortez Israel
* Josefa Amara Díaz Henríquez
* Matías Arnoldo Quijón Winser

# Proposito del proyecto
Nuestro proyecto tiene como propósito diseñar e implementar un prototipo funcional del módulo de Compras y Adquisiciones de un sistema ERP, orientado a facilitar la gestión del abastecimiento y la relación con los proveedores de una empresa. Buscamos que los usuarios puedan generar solicitudes de compra, comparar cotizaciones, emitir órdenes de compra y registrar recepciones mediante una interfaz clara y fácil de utilizar, que permite organizar la información y dar seguimiento a cada operación.

Como equipo, queremos desarrollar un producto mínimo viable que represente las principales funciones del módulo y contemple su futura integración con otras áreas del ERP, como inventario, finanzas y cuentas por pagar. Para ello, definiremos un modelo de datos coherente y utilizaremos una metodología de desarrollo basada en especificaciones. El resultado será un prototipo de interfaz que permitirá demostrar el flujo de adquisiciones y establecer una base para futuras mejoras y ampliaciones.

# Uso del prototipo

1. Instale dependencias con `npm install` e inicie la aplicación con `npm run dev`.
2. Elija la sesión activa en el selector **Sesión** de la barra superior; por defecto se usa el administrador del sistema.
3. Como administrador, cree usuarios en **Usuarios** y asigne uno de los roles: Solicitante, Aprobador, Encargado de Compras o Encargado de Recepción.
4. Como solicitante, registre una **Solicitud** con justificación obligatoria y líneas de productos o servicios.
5. Como aprobador, autorice o rechace las solicitudes de su departamento desde **Aprobaciones**; el rechazo exige un motivo.
6. Como encargado de compras, cree **Documentos** con proveedor y líneas de detalle, y apruébelos o cancélelos desde el mismo formulario.
7. Como encargado de recepción, registre entregas totales o parciales en **Recepción**, incluyendo cantidades rechazadas y su motivo.

Consulte `specs/001-erp-base-module/quickstart.md` para el flujo detallado y las validaciones esperadas. Las pruebas se ejecutan con `npx vitest run`.