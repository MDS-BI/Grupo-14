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
