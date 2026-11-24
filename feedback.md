Feedback Avance 01 (26/10/26)

- el avance de plan y data-model no permiten dar feedback adecuado. 
- falta editar README

Proximos pasos:
 
- rectificar puntos anteriores 
- trabajar en los specs (historias de usuario, US) para definir tareas
- dividirse las US y tareas para una siguiente iteracion (avances cada semana)
- ejecutar una version integrada de prueba

Feedback Avance 02 (2/11/26)

- no se observa avance o actividad en el repositorio

Proximos pasos:

- solicitar horario de consultas, rectificar puntos anteriores y crear tareas a partir de los specs
- hacer primera implmentacion, registar modificaciones/incremental y volver al spec
- dividir el grupo entre modificaciones (ajustes previos) e incremental (nueva funcionalidad)
- integrar nueva version en 2 semanas

Feedback Avance 03 (16/11/26)

- Cambios en la especificación: spec.md se reescribió con las historias HU1, HU2, HU3, HU4, HU6, HU7 y HU8; tasks.md se realineó (T001–T079) y explica que no existe HU5. Son coherentes entre sí, pero spec.md conserva FR-001 a FR-039 del módulo genérico y el título/propósito antiguos, y HU7 usa un formato distinto (encabezado `#`, casillas en los escenarios).
- Consistencia sitio–especificación: T079 (validación manual) sigue sin marcar, lo cual es correcto. HU3 (spec.md) y T056 piden aprobar con folio OC-XXXX y datos en vivo; las pruebas existen, pero storage.js y document-form.js no se incluyeron: no verificable. HU4 pide mostrar el nombre del solicitante en la bandeja; app.js llama a `pendingRequisitionsForDepartment()` sin departamento, y no queda claro que se filtre por el del aprobador (T039). HU6/FR-040: el dashboard cuenta "Órdenes emitidas" con estados que no coinciden con Emitida/Recibida de spec.md. Funcionalidades fuera de la spec: moneda y tipo de cambio (tipos-cambio.test.js, module-config.js) y selector de sesión (index.html).

Proximos pasos:

- unificar spec.md: actualizar título, propósito y FR a Adquisiciones y Compras, y homogeneizar el formato de HU7
- documentar en spec.md los requisitos de moneda/tipo de cambio y del selector de sesión, o retirarlos
- verificar y corregir el filtro por departamento del aprobador (T039) y el mapeo de estados Emitida/Recibida frente al ciclo de vida
 - hacer mejoras de funcionalidad e interfaz de usuario, incluir data simulada para probar campos, incluir mejoras de estilo, transicion, navegacion, etcetera.

Presentacion de MVP final en 2 semanas.
