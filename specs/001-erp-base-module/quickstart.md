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

## Flujos por rol

La sesión activa se elige en el selector **Sesión** de la barra superior. El administrador del sistema se usa por defecto.

1. **Administrador**: abra **Usuarios**, cree una cuenta con rol Solicitante, Aprobador, Encargado de Compras o Encargado de Recepción y confirme que la barra lateral se adapta al rol de la sesión. No se puede desactivar a un usuario con solicitudes u órdenes pendientes.
2. **Solicitante**: abra **Solicitudes**, elija departamento y partida, escriba la justificación y agregue productos o servicios. La solicitud queda en estado *Pendiente de aprobación* y la justificación se muestra completa en el historial.
3. **Aprobador**: abra **Aprobaciones**, seleccione una solicitud de su departamento, revise la justificación y el saldo presupuestario y use **Autorizar** o **Rechazar**. El rechazo exige un motivo; sin él la solicitud permanece pendiente.
4. **Encargado de Compras**: abra **Documentos**, seleccione un proveedor, capture las líneas de detalle y guarde la orden. Los totales se recalculan desde las líneas. Desde el mismo formulario puede **Aprobar** (valida datos comerciales y límite de crédito y asigna la serie/folio OC-XXXX) o **Cancelar**.
5. **Encargado de Recepción**: abra **Recepción**, seleccione una orden emitida o parcialmente recibida, registre cantidades recibidas y rechazadas (con motivo) y confirme. La orden pasa a *Recibido parcialmente* o *Recibido* según las cantidades pendientes.

## Validación

- Verifique que los campos obligatorios muestran errores de validación.
- Verifique que un documento exige folio entero positivo y que el descuento no puede superar el subtotal.
- Verifique que un correo electrónico con formato inválido se rechaza con una explicación.
- Verifique que los resultados de búsqueda se actualizan a medida que el usuario escribe.
- Verifique que la lista permanece consistente tras las acciones de edición y eliminación.
- Verifique que las estadísticas del panel coinciden con el número de registros almacenados.
- Verifique que una solicitud sin justificación no se guarda y que un rechazo sin motivo mantiene el estado pendiente.
- Verifique que la aprobación se bloquea si faltan `taxId`, `categoriaProveedor`, `paymentTerms` o `creditLimit`, o si el total excede el crédito del proveedor.
- Verifique que no se puede recibir una orden cancelada, completa o no emitida, y que recibida + rechazada no supera la cantidad solicitada.

## Extender el Módulo Base

Los módulos ERP personalizados adaptan la base mediante un único archivo de configuración (`src/module-config.js`) en lugar de editar el código central:

1. Establezca el nombre del módulo y los mapeos de términos (p. ej., Entidad → Cliente, Documento → Pedido de Venta); cada pantalla se reetiqueta, incluida la barra lateral y el logotipo.
2. Declare campos personalizados por tipo de registro (texto, número, fecha, selección) — aparecen automáticamente en formularios, listas, validación y búsqueda.
3. Defina el ciclo de vida de estados de documentos y las transiciones permitidas (p. ej., cotización → pedido → facturado).
4. Opcionalmente establezca `theme.accentColor` para remarcar los resaltados y controles principales de todo el espacio de trabajo.
5. Añada reglas de validación específicas del módulo junto a las reglas base donde sea necesario.

La generación de identidad, marcas de tiempo, integridad referencial entre entidades y documentos, eliminación en cascada, navegación y búsqueda siguen siendo gestionadas por el módulo base. Sin archivo de configuración, la aplicación se ejecuta con el comportamiento predeterminado Entidad/Documento. Consulte `specs/001-erp-base-module/` para la especificación completa.

## Administración de usuarios y permisos

1. Abra **Usuarios** en la barra lateral (visible para el rol administrador).
2. Cree usuarios con nombre, cuenta, RUT, rol y departamento; use **Editar** para cambiar el rol o el área.
3. Un usuario con documentos o solicitudes pendientes no puede desactivarse: el sistema explica el motivo.
4. Al iniciar sesión como un rol distinto, las vistas y acciones no autorizadas quedan fuera de alcance; sin sesión, un enlace profundo o una recarga vuelve al login.

## Orden de compra con líneas de detalle

1. Abra **Órdenes de Compra** y seleccione un proveedor activo con datos comerciales completos.
2. Agregue una o más líneas con producto, descripción, cantidad, unidad, precio y descuento.
3. El subtotal, impuesto y total se calculan en cascada al guardar; las líneas quedan persistidas dentro del documento.
4. La emisión asigna el folio `OC-XXXX`, conserva moneda, tipo de cambio y fecha de emisión como instantánea y permite registrar fecha estimada de entrega, dirección e instrucciones de despacho.

## Aprobaciones y justificación

1. Registre una **Solicitud de Cotización**; la justificación y el departamento son obligatorios.
2. La solicitud se guarda en estado **Pendiente de aprobación** y compromete el presupuesto del departamento.
3. En **Aprobaciones** revise la justificación, las líneas y el saldo presupuestario antes de decidir.
4. Aprobar valida RUT, categoría, condiciones de pago y límite de crédito del proveedor, y asigna el folio oficial `OC-XXXX`. Un sobregiro solo se autoriza con override administrativo y motivo.
5. Rechazar exige un motivo; el rechazo libera el presupuesto comprometido y queda registrado en el historial.
6. El encargado de compras genera una cotización vinculada desde la bandeja de solicitudes autorizadas; la solicitud pasa a **En cotización** y no admite una segunda cotización.

## Recepción y pago

1. Abra **Recepción** y seleccione una orden emitida o parcialmente recibida con fecha de entrega vigente o atrasada.
2. Registre cantidades recibidas y rechazadas por línea; el sistema muestra solicitado, acumulado y pendiente, e impide exceder la cantidad pendiente.
3. Una recepción parcial mantiene la orden en **Recibida parcialmente**; al completar todas las líneas cambia a **Recibida**.
4. Cada recepción conserva fecha, cantidades, observaciones y motivo de rechazo por línea.
5. Desde el detalle de una orden **Recibida**, registre factura, monto y fecha de pago. El monto debe coincidir con lo recepcionado con tolerancia de 0,01 CLP; la orden pasa a **Pagada** y queda en modo solo lectura.

## Maestros, trazabilidad y respaldo

1. En **Proveedores** valide el RUT chileno con módulo 11, código único y datos comerciales. No se puede desactivar un proveedor con órdenes emitidas o parcialmente recibidas.
2. Administre departamentos con código único y jefe aprobador; las solicitudes se enrutan al aprobador del área y el presupuesto se recalcula por evento.
3. Mantenga el catálogo de productos y servicios con código único, unidad, categoría y precio de referencia; al elegir un producto se completan unidad y precio y se advierten compras duplicadas simultáneas.
4. El detalle de cada orden muestra la bitácora cronológica de creación, aprobación, emisión, recepción y pago sin controles de edición o eliminación.
5. El panel muestra KPIs, gasto del mes y alertas de órdenes atrasadas; las tarjetas abren bandejas filtradas y se refrescan por evento en menos de 2 segundos.
6. Use **Exportar CSV**, **Imprimir**, **Respaldar JSON** y **Restaurar JSON** desde el detalle de documentos. Un respaldo inválido se rechaza sin mezclar datos.

## Verificación

- Ejecute `npm run test`, `npm run lint`, `npm run build` y `npm run mer` antes de cerrar cualquier entrega.
- Verifique que las fechas inválidas y los rangos invertidos muestran el error bajo el campo correspondiente y bloquean el guardado.
- Verifique que un snapshot obsoleto produce conflicto con opciones **Recargar** y **Reintentar**, sin sobrescritura silenciosa.
- Verifique que en ventanas estrechas la barra lateral se contrae a iconos con etiqueta accesible y que la navegación por iconos abre la vista correcta.
- Verifique que una adaptación completa mediante configuración renombra módulo, entidades, documentos y navegación sin editar archivos centrales.

## Limitación de seguridad aceptada

Esta fase opera solo en el navegador con `localStorage`; no hay backend de autenticación. La sesión, los roles y la segregación son una simulación de producto aceptada explícitamente en la especificación (I9). No introduce credenciales ni secretos.
