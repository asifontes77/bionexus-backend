BIO NEXUS
PLAN MAESTRO DE REORGANIZACION DE CONFIGURACION Y DISENADOR DE DOCUMENTOS
Fecha: 28-08-2026
Estado: Acuerdo inicial aprobado para ejecutar por fases

================================================================================
1. PROPOSITO DEL DOCUMENTO
================================================================================

Este archivo es la referencia funcional y tecnica para reorganizar la configuracion
de Bio Nexus, superar la organizacion del sistema TORO legacy y construir un sistema
de plantillas documentales configurable sin dependencias comerciales.

El documento debe conservarse en Git dentro de los repositorios de Bio Nexus para
que cada nueva fase pueda revisar el alcance completo antes de efectuar cambios.

Regla de trabajo:
- Antes de iniciar una fase, revisar este plan y el codigo legacy relacionado.
- No eliminar comportamiento legacy sin identificar primero su finalidad.
- Mejorar la organizacion sin perder reglas, campos, marcadores, correlativos,
  impresion, permisos, validaciones ni integraciones.
- Trabajar modulo por modulo.
- No avanzar a la fase siguiente hasta validar funcional y visualmente la actual.
- License Manager permanece como el ultimo bloque de la migracion.
- No se utilizaran componentes, librerias o servicios que requieran licencias pagas.

================================================================================
2. PROBLEMA IDENTIFICADO
================================================================================

TORO legacy agrupa dentro de Laboratorio funciones que pertenecen a dominios
distintos:
- Identidad del laboratorio.
- Licencia.
- Correo.
- Factura.
- Comprobante del paciente.
- Toma de muestras.
- Impresora tiquera o de etiquetas.
- Impuestos.
- Modelos de documentos.

Bio Nexus separo inicialmente:
- Configuracion de la aplicacion: formatos, sesion e impresora.
- Impuestos.
- Laboratorio: logo, general, factura/toma de muestra y envio por correo.

La nueva distribucion es mas modular que el legacy, pero aun mezcla dominios:
- Factura y toma de muestras no deben compartir una seccion.
- La impresora tiquera pertenece a Toma de muestras.
- El comprobante del paciente es independiente de la factura.
- Los impuestos pertenecen funcionalmente a Facturacion.
- Formatos regionales y plantillas documentales son conceptos distintos.
- La licencia pertenece a Laboratorio, pero se implementara al final.

================================================================================
3. ESTRUCTURA OBJETIVO DEL MENU
================================================================================

Grupo principal: CONFIGURACION

3.1. Laboratorio
     3.1.1. Identidad
            - Logo.
            - Nombre comercial.
            - Razon social.
            - Registro fiscal.
            - Domicilio.
            - Telefono principal.
            - Telefono secundario.
            - Correo institucional.
            - Pagina web.
            - Mascara telefonica cuando aplique.

     3.1.2. Comunicaciones
            - Servidor de correo.
            - Puerto.
            - Seguridad TLS/SSL.
            - Cuenta remitente.
            - Credenciales protegidas.
            - Prueba de conexion.
            - Configuracion de envio de resultados.
            - Texto o plantilla basica del correo.

     3.1.3. Licencia
            - Estado.
            - Titular.
            - Vigencia.
            - Modulos habilitados.
            - Activacion y validacion.
            - Esta seccion se implementara al final del proyecto.

3.2. Atencion al paciente
     3.2.1. Comprobante del paciente
            - Emitir automaticamente al registrar al paciente.
            - Correlativo propio.
            - Numero maximo de filas.
            - Plantilla activa.
            - Vista previa.
            - Impresion de prueba.
            - Acceso al disenador de comprobante.

     Nota funcional:
     El comprobante debe estar disponible aunque el laboratorio no utilice
     facturacion. No es un documento fiscal.

3.3. Toma de muestras
     3.3.1. Etiquetado
            - Imprimir al registrar la muestra.
            - Correlativo o identificador de muestra.
            - Cantidad de copias.
            - Tamano de etiqueta.
            - Orientacion.
            - Plantilla activa.

     3.3.2. Impresora de etiquetas
            - Impresora seleccionada.
            - Ubicacion o nombre de red.
            - Tipo de conexion.
            - Resolucion o densidad cuando aplique.
            - Impresion de prueba.
            - Calibracion por impresora.

     3.3.3. Plantilla de etiqueta
            - Paciente.
            - Identificador de muestra.
            - Tipo de muestra.
            - Examenes.
            - Fecha y hora.
            - Codigo de barras.
            - Codigo QR cuando aplique.
            - Datos resumidos del laboratorio.

3.4. Facturacion
     3.4.1. General
            - Facturacion habilitada.
            - Imprimir automaticamente al ingresar al paciente.
            - Numeracion y serie.
            - Numero maximo de filas.
            - Reglas de subtotal, descuentos, impuestos y total.

     3.4.2. Impuestos
            - Catalogo de impuestos.
            - Descripcion.
            - Valor o porcentaje.
            - Aplicacion solo en divisas.
            - Fijo en subtotal.
            - Visible u oculto.
            - Estado activo o inactivo.

     3.4.3. Plantillas de factura
            - Plantilla activa.
            - Factura completa.
            - Factura sobre formulario preimpreso.
            - Vista previa.
            - Impresion de prueba.
            - Acceso al disenador.

     3.4.4. Impresion
            - Impresora.
            - Tamano de papel.
            - Orientacion.
            - Margenes.
            - Desplazamiento horizontal en milimetros.
            - Desplazamiento vertical en milimetros.
            - Escala.
            - Perfil de calibracion por impresora.

3.5. Documentos y plantillas
     - Catalogo de plantillas.
     - Comprobante del paciente.
     - Factura.
     - Etiqueta de muestra.
     - Informe de resultados cuando se migre ese flujo.
     - Plantillas predeterminadas.
     - Plantillas personalizadas.
     - Duplicar.
     - Renombrar.
     - Versionar.
     - Publicar.
     - Restaurar plantilla predeterminada.
     - Seleccionar plantilla activa.
     - Vista previa con datos de ejemplo.

3.6. Sistema
     3.6.1. Sesion y seguridad
            - Duracion renovable de la sesion.
            - Tiempo de inactividad.
            - Cuenta regresiva.
            - Renovacion transparente.
            - Propagacion por Socket.IO.

     3.6.2. Formatos regionales
            - Formato de fecha.
            - Formato de hora.
            - Separador decimal.
            - Moneda.
            - Mascara telefonica general.
            - Otras preferencias regionales.

================================================================================
4. REGLAS DEL DISENADOR DE DOCUMENTOS
================================================================================

4.1. Restriccion de tecnologia
- Solo componentes gratuitos y con licencias compatibles con el proyecto.
- No se utilizara ActiveReportsJS ni otro componente comercial.
- Candidato principal: Vue Konva + Konva, sujeto a prototipo tecnico.
- El modelo de plantilla sera propio y se almacenara como JSON versionado.
- El motor de impresion y PDF sera independiente del lienzo visual.

4.2. Tipos iniciales de plantilla
- Comprobante del paciente.
- Factura.
- Etiqueta de muestra.
- Informe de resultados en una fase futura.

4.3. Modos de factura
A. Documento completo:
   Bio Nexus imprime fondo, logo, textos, lineas, encabezados, detalle y totales.

B. Formulario preimpreso:
   Bio Nexus imprime solo datos variables sobre papel previamente impreso.
   El disenador podra mostrar una imagen o PDF de referencia con la opcion:
   "Usar solo como guia y no imprimir el fondo".

4.4. Unidades
- Posiciones, tamanos, margenes y desplazamientos se almacenaran en milimetros.
- No se guardaran posiciones principales solamente en pixeles.
- La conversion a pixeles se utilizara unicamente para representar el lienzo.

4.5. Funciones del lienzo
- Papel Carta, A4, Oficio y personalizado.
- Orientacion vertical u horizontal.
- Zoom.
- Reglas horizontales y verticales.
- Cuadricula.
- Ajuste magnetico.
- Guias de alineacion.
- Area imprimible y margenes.
- Seleccion unica y multiple.
- Arrastrar y redimensionar.
- Copiar, pegar y duplicar.
- Deshacer y rehacer.
- Bloquear elementos.
- Orden de capas.

4.6. Elementos
- Texto fijo.
- Campo dinamico.
- Logo.
- Imagen.
- Linea.
- Rectangulo.
- Tabla.
- Banda repetitiva de detalle.
- Subtotal.
- Impuesto.
- Total.
- Fecha y hora.
- Numero de pagina.
- Codigo de barras.
- Codigo QR.
- Firma cuando aplique.

4.7. Propiedades
- Posicion X/Y.
- Ancho y alto.
- Fuente, tamano y peso.
- Alineacion.
- Color.
- Bordes y fondo.
- Formato numerico.
- Formato de fecha.
- Visibilidad condicional.
- Salto de linea, recorte o crecimiento.
- Numero maximo de lineas.

4.8. Campos dinamicos
El usuario no escribira manualmente marcadores legacy como [name] o [rif].
Bio Nexus mostrara un catalogo de campos que se arrastran al lienzo.

Grupos iniciales:
- Laboratorio: logo, nombre, razon social, RIF, direccion, telefonos, correo.
- Paciente: nombre, identificacion, telefono, direccion.
- Documento: numero, fecha, hora, correlativo.
- Detalle: cantidad, descripcion, precio unitario, total.
- Totales: subtotal, descuento, impuestos, total general.
- Muestra: identificador, tipo, examenes, fecha y hora.

Internamente se guardaran identificadores estables, no etiquetas traducidas.

4.9. Seguridad y publicacion
- Borrador separado de la plantilla publicada.
- Una plantilla activa por tipo y laboratorio.
- Historial de versiones.
- Auditoria de crear, editar, publicar, activar y restaurar.
- Permisos separados para consultar, editar, publicar y calibrar.

4.10. Numeracion
- Los correlativos no se almacenaran dentro del JSON visual.
- Se administraran mediante un servicio transaccional independiente.
- Se impediran numeros duplicados.

================================================================================
5. FASES DE IMPLEMENTACION
================================================================================

FASE 0. DOCUMENTACION Y AUDITORIA LEGACY
- Conservar este plan en Git.
- Inspeccionar Vue 2 legacy completo del modulo Laboratorio.
- Inspeccionar Backend legacy, endpoints, entidades y servicios.
- Identificar tablas y columnas utilizadas.
- Identificar todos los marcadores de factura y comprobante.
- Identificar el mecanismo real de impresion.
- Identificar correlativos y reglas transaccionales.
- Identificar configuracion de correo.
- Identificar configuracion de impresora tiquera.
- Crear matriz Legacy -> Bio Nexus -> Modulo objetivo -> Estado.
- No modificar la base ni el comportamiento en esta fase.

FASE 1. REORGANIZACION DEL MENU Y RUTAS
- Crear la estructura de menu objetivo.
- Reubicar pantallas existentes sin perder funcionalidad.
- Mantener temporalmente rutas compatibles o redirecciones internas.
- Separar visualmente los dominios.
- No cambiar aun tablas ni contratos de datos.
- Validar permisos del menu y rutas.
- Validar responsive y breadcrumb.

FASE 2. LABORATORIO: IDENTIDAD
- Separar Logo e Informacion general.
- Preservar todos los campos legacy.
- Revisar campos faltantes en Bio Nexus.
- Validar carga y guardado.
- Mantener Licencia como placeholder pendiente, sin implementarla.

FASE 3. LABORATORIO: COMUNICACIONES
- Separar configuracion de correo.
- Proteger credenciales.
- Agregar prueba de conexion.
- Preparar plantillas de asunto y cuerpo.
- Preservar envio de resultados.

FASE 4. ATENCION AL PACIENTE: COMPROBANTE
- Separar comprobante de factura.
- Correlativo propio.
- Impresion automatica opcional.
- Maximo de filas.
- Plantilla predeterminada inicial.
- Vista previa e impresion de prueba.

FASE 5. TOMA DE MUESTRAS
- Mover la impresora tiquera desde Sistema.
- Configurar impresion de etiquetas.
- Correlativo o identificador.
- Perfiles de impresora.
- Tamano y orientacion de etiqueta.
- Impresion de prueba.

FASE 6. FACTURACION
- Separar configuracion general.
- Integrar Impuestos dentro de Facturacion.
- Preservar catalogo y reglas actuales.
- Separar numeracion fiscal.
- Preparar factura completa y preimpresa.

FASE 7. PROTOTIPO DEL DISENADOR GRATUITO
- Crear prototipo aislado con Vue Konva.
- No conectarlo aun a impresion productiva.
- Probar papel en milimetros.
- Probar arrastrar, redimensionar y alinear.
- Probar campos dinamicos.
- Probar tabla repetitiva.
- Probar imagen de fondo no imprimible.
- Probar etiqueta pequena y factura Carta/A4.
- Evaluar precision de PDF e impresion.
- Aprobar o ajustar la tecnologia antes de continuar.

FASE 8. MOTOR DE PLANTILLAS
- Definir esquema JSON versionado.
- Implementar plantillas, versiones, activos y borradores.
- Implementar catalogo de campos.
- Implementar validacion del esquema.
- Implementar auditoria y permisos.

FASE 9. DISENADOR DE COMPROBANTE
- Primer documento productivo del disenador.
- Plantilla predeterminada.
- Vista previa con datos de ejemplo.
- Publicacion y activacion.
- Impresion de prueba.

FASE 10. DISENADOR DE ETIQUETAS
- Campos de muestra.
- Codigo de barras y QR.
- Dimensiones pequenas.
- Calibracion por impresora.
- Multiples copias.

FASE 11. DISENADOR DE FACTURA
- Factura completa.
- Formulario preimpreso.
- Bandas de detalle.
- Subtotales, impuestos y totales.
- Multipagina cuando aplique.
- Calibracion en milimetros.

FASE 12. MIGRACION DE CONFIGURACION LEGACY
- Mapear configuracion existente.
- Convertir modelos legacy a plantillas predeterminadas equivalentes.
- Preservar correlativos.
- Validar datos existentes.
- Validar instalacion con datos y desde base vacia.
- No eliminar datos legacy hasta aprobar equivalencia.

FASE 13. CIERRE INTEGRAL
- Pruebas por documento.
- Pruebas por impresora.
- Pruebas de permisos.
- Pruebas de auditoria.
- Pruebas con varias sesiones.
- Pruebas de migracion.
- Validacion visual y funcional por el usuario.

FASE 14. LICENSE MANAGER
- Implementar como ultimo bloque.
- Integrarlo en Laboratorio -> Licencia.

================================================================================
6. PRIMER BLOQUE A EJECUTAR
================================================================================

El primer bloque sera FASE 0 + FASE 1:

A. Auditar integralmente el modulo Laboratorio legacy.
B. Crear la matriz funcional completa.
C. Revisar las pantallas y contratos actuales de Bio Nexus.
D. Definir exactamente los elementos del menu y permisos.
E. Implementar solamente la reorganizacion del menu, rutas y pantallas contenedoras.
F. No modificar aun tablas, correlativos, impresion ni el disenador.
G. Validar menu, rutas, permisos, breadcrumb, responsive y compatibilidad temporal.

No se avanzara a Identidad hasta aprobar el menu reorganizado.

================================================================================
7. COMO CONSERVAR ESTE ACUERDO EN GIT
================================================================================

Se recomienda guardar una copia versionada en ambos repositorios:

Backend:
  docs/BioNexus-Configuration-And-Document-Designer-Master-Plan.md

Frontend:
  docs/BioNexus-Configuration-And-Document-Designer-Master-Plan.md

Git conserva el historial de cada cambio del plan. Antes de cada fase se debe leer
la version ubicada en la rama activa. Cada cambio de alcance debe actualizar el
archivo mediante un commit explicito, por ejemplo:

  docs: update configuration and document designer master plan

Adicionalmente, cada fase tecnica debe mencionar en el mensaje del commit el numero
de fase correspondiente. Ejemplo:

  feat(configuration): implement phase 1 navigation structure

Este TXT descargable es la copia de entrega. La copia Markdown en Git debe ser la
fuente canonica durante el desarrollo.

================================================================================
8. DECISIONES YA APROBADAS QUE NO DEBEN OLVIDARSE
================================================================================

- Solo soluciones gratuitas, sin licencias comerciales.
- Vue 3 permanece como Frontend de Bio Nexus.
- TORO Vue 2 se conserva como referencia legacy temporal.
- databasetoro permanece intacta y conectada al Backend legacy.
- bionexus es la base independiente del Backend migrado.
- Migracion modulo por modulo.
- Revisar integralmente cada modulo antes de modificarlo.
- No avanzar al modulo siguiente sin terminar y aprobar el actual.
- Usuarios permanece dentro del grupo Configuracion.
- Sesion activa indefinidamente mientras exista actividad.
- Socket.IO propaga politica de sesion, roles y permisos.
- License Manager permanece para el final.
- Los respaldos, reportes, logs y herramientas se guardan directamente en:
  C:\Users\Alexis\Desktop\BioNexus-Aux\reports
- Los scripts descargables se llaman ejecutarBioNexus.ps1.



================================================================================
9. PRESERVACION DE LOS FORMATOS ACTUALES DEL LABORATORIO
================================================================================

Decision aprobada:
- El formato actual de factura del laboratorio se conservara como plantilla inicial.
- El formato actual de comprobante del paciente se conservara como plantilla inicial.
- La reorganizacion modular no obliga a cambiar la apariencia documental aprobada.
- La migracion al nuevo disenador debe reproducir posicion, bloques, textos, bordes,
  columnas, encabezado, detalle, totales, logo y marcadores del formato legacy.
- Antes de sustituir el renderizador legacy se hara una comparacion visual y de
  impresion entre el original y la plantilla migrada.
- La plantilla migrada sera editable en Vue Konva sin perder su apariencia inicial.
- Se almacenara en milimetros y no exclusivamente en pixeles.
- Los marcadores legacy se mapearan a campos dinamicos estables de Bio Nexus.
- Se soportara documento completo y formulario preimpreso.
- Para formularios preimpresos, el fondo podra mostrarse como guia sin imprimirse.
- Se agregaran desplazamientos X/Y, escala, margenes y perfil por impresora.

Viabilidad con Vue Konva:
- Vue Konva permite representar texto, imagenes, lineas, rectangulos y elementos
  arrastrables, suficientes para reconstruir la composicion visible actual.
- Las tablas y bandas repetitivas no deben modelarse como una imagen plana. Se
  implementaran como componentes documentales propios que el motor expanda segun
  los datos reales.
- Vue Konva sera el editor visual. La impresion/PDF usara un motor determinista
  basado en el mismo JSON para garantizar medidas fisicas y resultados repetibles.

Plantillas base que deben preservarse:
1. Factura actual del laboratorio.
2. Comprobante actual del paciente.
3. Etiqueta de muestra cuando se complete la auditoria legacy.

Regla de aceptacion:
La plantilla nueva no se declarara aprobada hasta que el laboratorio pueda obtener
una impresion equivalente al formato actual y luego personalizarla desde Bio Nexus.

================================================================================
10. BITACORA DE ESTADO DEL PLAN
================================================================================

La bitacora se actualizara en cada fase usando este formato:

- Fecha:
- Fase:
- Estado: PENDIENTE | EN CURSO | APROBADA | BLOQUEADA
- Rama Backend:
- Rama Frontend:
- Commits:
- Validaciones:
- Base de datos:
- Archivos de evidencia:
- Decisiones nuevas:
- Pendientes:
- Proximo paso seguro:

Estado inicial:
- Fase 0 - Documentacion y auditoria legacy: EN CURSO.
- Fase 1 - Reorganizacion del menu y rutas: PENDIENTE.
- Fases 2 a 14: PENDIENTES.
- Plan maestro: APROBADO para versionar en Git.
- Preservacion de factura y comprobante legacy: APROBADA como requisito.

FIN DEL PLAN MAESTRO
## Actualizacion de bitacora - 28-08-2026

- Fase: 0 - Documentacion y auditoria legacy.
- Estado: APROBADA.
- Evidencia: `report-20260828-225113.txt` y `report-20260828-225728.txt`.
- Resultado: matriz funcional cerrada y menu objetivo definido.
- Base de datos: no modificada.
- Aplicaciones: no iniciadas ni detenidas.
- Decisiones: preservar factura y comprobante actuales; solo tecnologia gratuita;
  Vue Konva queda sujeto a prototipo; correlativos fuera del JSON documental.
- Fase 1 - Reorganizacion del menu y rutas: LISTA PARA INICIAR.
- Proximo paso seguro: crear `feature/configuration-navigation-reorganization` en
  Frontend e implementar solo navegacion, rutas, breadcrumbs y contenedores, con
  redirects temporales y sin cambios de Backend o base de datos.

## Actualizacion de alcance - Menu modular y continuidad de breadcrumb

- Fecha: 29-08-2026.
- Decision visual: APROBADA.
- Configuracion conserva ocho modulos de primer nivel: Catalogos, Laboratorio, Atencion al paciente, Toma de muestras, Facturacion, Documentos y plantillas, Sistema y Seguridad.
- Las secciones internas se presentan en paginas modulares mediante tarjetas, no como tercer nivel del Sidebar.
- La navegacion contextual se denomina breadcrumb o ruta de navegacion.
- Regla obligatoria: al abrir una seccion interna, el breadcrumb debe conservar la jerarquia completa del modulo.
- Ejemplo: Bio Nexus / Configuracion / Seguridad / Roles y permisos.
- Los segmentos intermedios correspondientes a modulos deben permitir regresar a la pagina modular.
- Esta arquitectura puede adaptarse visualmente en el futuro sin perder el agrupamiento funcional ni la jerarquia registrada.
- Estado Fase 1: menu aprobado visualmente; continuidad de breadcrumb en correccion; sin commit ni publicacion.

## Actualizacion de alcance - Breadcrumb global de Configuracion

- La continuidad jerarquica del breadcrumb aplica a todas las vistas y secciones dentro de Configuracion, no solamente a Seguridad.
- Toda vista interna debe conservar: Bio Nexus / Configuracion / Modulo / Vista.
- Catalogos conserva la jerarquia para Lista de examenes, Formas parasitarias y Formas de pago.
- Laboratorio conserva la jerarquia para Identidad y Comunicaciones.
- Facturacion conserva la jerarquia para General e Impuestos.
- Sistema conserva la jerarquia para Sesion y seguridad y sus secciones futuras.
- Seguridad conserva la jerarquia para Roles y permisos y Usuarios y autorizacion.
- Los segmentos de modulo son enlaces de retorno a su pagina modular.
- Las rutas con una misma vista y distinta seccion consideran query.tab para resolver el breadcrumb correcto.

## Actualización visual - Páginas modulares de Configuración

- Se conserva únicamente el encabezado superior proporcionado por el layout autenticado.
- Se elimina el encabezado hero repetido dentro de las páginas modulares.
- Las tarjetas internas serán más compactas, sobrias y profesionales.
- Los textos visibles de menú, encabezados, descripciones, tarjetas y breadcrumb deben usar ortografía española completa, incluidos acentos.
- El contador de secciones permanece como indicador secundario compacto.
- Esta decisión aplica a los ocho módulos de Configuración.
## Cierre de Fase 1 - 29-08-2026

- Estado: APROBADA visual y tecnicamente.
- Commit funcional Frontend: c5e2f92486586bc85b0f63f3a6741ea3d6053f15.
- Menu aprobado: ocho modulos dentro de Configuracion, sin tercer nivel en el Sidebar.
- Paginas internas: tarjetas modulares compactas y responsive.
- Breadcrumb: jerarquia completa y navegable en todas las vistas internas de Configuracion.
- Ortografia visual y UTF-8: aprobados.
- Backend y base de datos: sin cambios funcionales.
- Vue Konva: no instalado en esta fase.
- License Manager: permanece para el ultimo bloque.
- Fase 2 - Laboratorio Identidad: LISTA PARA INICIAR.
- Proximo paso: auditoria dirigida de Identidad contra TORO legacy antes de modificarla.
