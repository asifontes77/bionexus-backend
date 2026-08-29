# Bio Nexus - Matriz funcional de configuracion

Fecha de cierre: 28-08-2026
Fase: 0 - Documentacion y auditoria legacy
Estado: APROBADA

## Evidencia revisada

- TORO Frontend legacy y TORO Backend legacy.
- Bio Nexus Frontend y Bio Nexus Backend.
- Reporte enfocado: `report-20260828-225728.txt`.
- Fuentes historicas de auditoria excluidas para evitar falsos positivos.
- Archivos de proyecto, base de datos y aplicaciones no fueron modificados durante la auditoria.

## Hallazgos funcionales confirmados

### Laboratorio - Identidad

Legacy conserva logo, dimensiones del logo, razon social, nombre, domicilio, correo,
pagina web, RIF, telefonos, mascara telefonica y datos QR. Bio Nexus ya conserva
la mayoria de estos campos en `LaboratoryView` y sus paneles. Destino definitivo:
`Configuracion > Laboratorio > Identidad`.

### Laboratorio - Comunicaciones

Legacy configura Gmail o SMTP, host, puerto, seguridad, usuario, clave y remitente.
El Backend utiliza Nodemailer y Bio Nexus ya protege la clave SMTP en las respuestas.
Destino definitivo: `Configuracion > Laboratorio > Comunicaciones`.

### Laboratorio - Licencia

La licencia depende del laboratorio y usa RIF y razon social. Debe permanecer visible
como bloque pendiente dentro de Laboratorio, pero su implementacion queda reservada
para el ultimo bloque del proyecto.

### Atencion al paciente - Comprobante

El comprobante tiene activacion, correlativo, maximo de filas y formato propios.
Puede entregarse sin facturacion. El formato actual del laboratorio se preservara
como plantilla inicial editable. Destino: `Configuracion > Atencion al paciente > Comprobante`.

### Toma de muestras

Legacy separa la impresion de toma de muestra mediante `print_sample_take`,
`voucher_number`, `printer_type` y `printer_interface`. El Backend utiliza
`node-thermal-printer`. La impresora no es global, pertenece al flujo de muestras.
Destino: `Configuracion > Toma de muestras` con Etiquetado, Impresora de etiquetas
y Plantilla de etiqueta.

### Facturacion

Factura conserva activacion, correlativo, maximo de filas y formato. El flujo divide
el detalle en varias paginas, calcula pie e impuestos y registra factura e items.
El formato actual del laboratorio se preservara como plantilla inicial editable.
Destino: `Configuracion > Facturacion`.

### Impuestos

Legacy y Bio Nexus conservan descripcion, porcentaje, solo divisas, fijo en subtotal
y ocultar. Bio Nexus ya dispone de CRUD y permisos especificos. La funcionalidad se
mantiene y solo cambia su ubicacion visual a `Configuracion > Facturacion > Impuestos`.

### Plantillas

El legacy usa HTML y reemplazos manuales. Marcadores confirmados:

- `[noInvoice]`
- `[fecha]`
- `[razon-social]`
- `[rif]`
- `[domicilio]`
- `[position]`
- `[name]`
- `[phone]`
- `[list_description]`
- `[totales]`
- `[business_name]`
- `[rif_lab]`
- `[address_lab]`
- `[phone_1]`
- `[phone_2]`
- `[email]`
- `[src_image]`

Estos marcadores se migraran a identificadores estables dentro de un esquema JSON
propio. Vue Konva sera evaluado mediante prototipo gratuito. La impresion no dependera
directamente del canvas y usara el mismo JSON con medidas fisicas en milimetros.

## Menu objetivo aprobado para Fase 1

```text
Configuracion
|-- Laboratorio
|   |-- Identidad
|   |-- Comunicaciones
|   `-- Licencia (pendiente, sin implementar)
|-- Atencion al paciente
|   `-- Comprobante
|-- Toma de muestras
|   |-- Etiquetado
|   |-- Impresora de etiquetas
|   `-- Plantilla de etiqueta
|-- Facturacion
|   |-- General
|   |-- Impuestos
|   |-- Plantillas de factura
|   `-- Impresion
|-- Documentos y plantillas
`-- Sistema
    |-- Sesion y seguridad
    `-- Formatos regionales
```

## Alcance exacto de Fase 1

- Reorganizar menu, rutas, titulos, descripciones y breadcrumbs.
- Crear contenedores o destinos temporales para la estructura aprobada.
- Reutilizar las vistas actuales sin duplicar edicion de datos.
- Mantener redirects desde las rutas actuales.
- Conservar temporalmente los permisos actuales.
- No crear todavia permisos nuevos en Backend.
- No cambiar tablas, datos, correlativos, impresion o plantillas.
- No instalar Vue Konva todavia.
- No implementar License Manager.

## Compatibilidad temporal

- `configuration/laboratory` continuara funcionando y redirigira a Identidad.
- `configuration/taxes` continuara funcionando y redirigira a Facturacion > Impuestos.
- `configuration/application-settings` continuara funcionando y redirigira a Sistema > Sesion y seguridad.
- La edicion de un dato tendra un unico destino real.
- Los permisos actuales `laboratory.read/update`, `tax.*` y
  `application-settings.read/update` se conservaran durante Fase 1.

## Riesgos que deben controlarse

- No confundir comprobante del paciente con ticket termico de toma de muestra.
- No mover la impresora hasta que exista el destino funcional de Toma de muestras.
- No perder las reglas multipagina de factura y comprobante.
- No exponer credenciales SMTP.
- No trasladar correlativos a configuracion visual ni al JSON de plantilla.
- No alterar la estructura fiscal ni la base de datos durante Fase 1.

## Siguiente paso seguro

Crear la feature de Frontend `feature/configuration-navigation-reorganization` e
implementar unicamente el esqueleto de navegacion de Fase 1. Antes de cambiar archivos,
inspeccionar de forma dirigida `navigation.js`, `router/index.js`, el layout autenticado,
los breadcrumbs y las vistas actuales que se reutilizaran.
