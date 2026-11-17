# Inicio Rápido: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

## Configuración

1. Instale las dependencias con `npm install`.
2. Inicie el servidor de desarrollo con `npm run dev`.
3. Abra la URL local de Vite en un navegador.

## Flujo de Usuario Principal

1. Aterrice en el panel ERP y use un botón de acción rápida (nueva entidad, nuevo documento, gestión de entidades o buscar registros).
2. Cree una entidad usando el formulario.
3. Busque una entidad usando la pantalla de búsqueda.
4. Edite o elimine una entidad desde el área de gestión.
5. Cambie entre módulos usando la barra lateral; actualice la página para confirmar que las entidades persisten en el almacenamiento local y que el marco con marca (logotipo, nombre del módulo) permanece consistente.

## Validación

- Verifique que los campos obligatorios muestran errores de validación.
- Verifique que un documento exige folio entero positivo y que el descuento no puede superar el subtotal.
- Verifique que un correo electrónico con formato inválido se rechaza con una explicación.
- Verifique que los resultados de búsqueda se actualizan a medida que el usuario escribe.
- Verifique que la lista permanece consistente tras las acciones de edición y eliminación.
- Verifique que las estadísticas del panel coinciden con el número de registros almacenados.

## Extender el Módulo Base

Los módulos ERP personalizados adaptan la base mediante un único archivo de configuración (`src/module-config.js`) en lugar de editar el código central:

1. Establezca el nombre del módulo y los mapeos de términos (p. ej., Entidad → Cliente, Documento → Pedido de Venta); cada pantalla se reetiqueta, incluida la barra lateral y el logotipo.
2. Declare campos personalizados por tipo de registro (texto, número, fecha, selección) — aparecen automáticamente en formularios, listas, validación y búsqueda.
3. Defina el ciclo de vida de estados de documentos y las transiciones permitidas (p. ej., cotización → pedido → facturado).
4. Opcionalmente establezca `theme.accentColor` para remarcar los resaltados y controles principales de todo el espacio de trabajo.
5. Añada reglas de validación específicas del módulo junto a las reglas base donde sea necesario.

La generación de identidad, marcas de tiempo, integridad referencial entre entidades y documentos, eliminación en cascada, navegación y búsqueda siguen siendo gestionadas por el módulo base. Sin archivo de configuración, la aplicación se ejecuta con el comportamiento predeterminado Entidad/Documento. Consulte `specs/001-erp-base-module/` para la especificación completa.

## Administraci�n de usuarios y permisos

1. Abra **Usuarios** en la barra lateral (visible para el rol administrador).
2. Cree usuarios con nombre, cuenta y rol; use **Editar** para cambiar el rol.
3. Un usuario con documentos pendientes asignados no puede desactivarse: el sistema explica el motivo.
4. Al iniciar sesi�n como un rol distinto, las vistas y acciones no autorizadas quedan fuera de alcance.

## Orden de compra con l�neas de detalle

1. Abra **�rdenes de Compra** y seleccione un proveedor.
2. Agregue una o m�s l�neas con producto, descripci�n, cantidad, unidad, precio y descuento.
3. El subtotal, impuesto y total se calculan en cascada al guardar; las l�neas quedan persistidas dentro del documento.

## Aprobaciones y justificaci�n

1. Registre una **Solicitud de Cotizaci�n**; la justificaci�n y el departamento son obligatorios.
2. La solicitud se guarda en estado **pendiente de aprobaci�n**.
3. En **Aprobaciones** revise la justificaci�n y las l�neas antes de decidir.
4. Aprobar valida identificaci�n fiscal, categor�a, condiciones de pago y l�mite de cr�dito del proveedor, y asigna el folio oficial `OC-XXXX`.
5. Rechazar exige un motivo, que queda registrado en el historial.

## Recepci�n de productos

1. Abra **Recepci�n** y seleccione una orden aprobada con l�neas.
2. Registre cantidades recibidas por l�nea; el sistema muestra solicitado, recibido acumulado y pendiente.
3. Una recepci�n parcial mantiene la orden en estado aprobado; al completar todas las l�neas cambia a **recibido**.
4. Cada recepci�n conserva fecha, cantidades, observaciones y motivo de rechazo por l�nea.
