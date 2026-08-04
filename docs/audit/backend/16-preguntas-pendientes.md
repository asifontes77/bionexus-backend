# 16. Preguntas Pendientes

**ESTADO: PRELIMINAR / PARCIALMENTE VERIFICADO / PENDIENTE DE REVISIÓN INDEPENDIENTE**

Este documento traslada todas las áreas no completadas a la revisión estática independiente, dado el límite estático de este escaneo preliminar.

## Módulos y Código Pendiente
- **Módulos no inspeccionados:** Faltan por auditar a nivel de código 23 módulos (incluyendo operaciones sobre Exámenes, Tax, Formularios parasitarios, Rutinas, etc.).
- **Controladores y Servicios:** Todos los pertenecientes a los módulos no inspeccionados.
- **Entidades y DTOs:** Resto de modelos físicos para cruzar con base de datos e interfaz de DTOs.
- **Catálogo API:** Validar todas las rutas sobrantes para verificar permisos o debilidades lógicas.

## Base de Datos e Infraestructura (NO VERIFICABLE SIN INFRAESTRUCTURA)
- **Esquema Real de MySQL:** ¿Cuál es el drift entre las tablas reales y las entidades provocado por un uso de synchronize: true?
- **Índices y Foreign Keys:** ¿Las claves foráneas lógicas tienen un correlato como índices/restricciones reales en MySQL?
- **Transacciones e Idempotencia:** ¿Cómo se maneja la falla de red o repetición en pagos e invoices?
- **Corrupción de datos:** Este análisis estático no declara corrupción generalizada de datos; la misma es NO VERIFICABLE sin acceso a base de datos.
- **Idempotencia:** Manejos de operaciones simultáneas frente a caja / facturas.

## Integraciones PENDIENTE DE REVISIÓN INDEPENDIENTE
- **PDF (Puppeteer):** ¿Las entradas de HTML para generar PDF se sanean contra XSS/inyecciones?
- **Correo (Nodemailer):** ¿Cómo se protege el transporte SMTP y las credenciales desde DB?
- **Impresión:** Mecanismo de cola física térmica hacia Node.js.
- **WebSockets:** Seguridad contra envíos maliciosos, autenticación efectiva a lo largo de las capas.

## Pruebas y Actualización (NestJS)
- **Pruebas Existentes:** Falta validación total de covertura unitaria o E2E, aparentemente inexistente.
- **Migración NestJS:** NO se declara como una migración segura hasta tanto no haya pruebas de regresión comprobables y plan de estabilización de despliegues (TypeORM config y Secrets aislados). No puede darse luz verde desde análisis estático.
