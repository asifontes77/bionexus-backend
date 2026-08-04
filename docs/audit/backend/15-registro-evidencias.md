# 15. Registro de Evidencias

**ESTADO: PRELIMINAR / PARCIALMENTE VERIFICADO / PENDIENTE DE REVISIÓN INDEPENDIENTE**

## 1. Archivos Realmente Inspeccionados (CONFIRMADO / ANALIZADO)
- **package.json**: Dependencias base identificadas, puppeteer, 
odemailer (ANALIZADO).
- **src/main.ts**: Configuración CORS abierta (*), lectura sincrónica s.readFileSync bloqueante para SSL (CONFIRMADO).
- **src/app.module.ts**: MySQL TypeORM config habilitado con synchronize: true, credencial de base de datos MySQL como [REDACTED] (CONFIRMADO).
- **src/users/users.module.ts**: JWT Secret fijo en el código como [REDACTED] (CONFIRMADO).
- **src/users/users.service.ts**: Análisis de uso del paquete crypt (ANALIZADO).
- **src/patients/patients.*** (module, controller, service, entity): Identificado save() sin Transaction / QueryRunner manifiesto en todas las operaciones complejas (ANALIZADO).
- **src/invoice/invoice.*** (controller, service, dto): Endpoints financieros y .save() aislados; requiere chequeo de idempotencia (ANALIZADO).
- **src/websockets/websocket.gateway.ts**: Métodos originarios de conexión socket carecen de JwtUserGuard en código de conexión (ANALIZADO).

## 2. Archivos Solamente Inventariados (INVENTARIADO / PENDIENTE DE REVISIÓN INDEPENDIENTE)
- Módulos restantes (e.g. ExamsModule, TaxModule, Cash_registerModule, AntibioticModule, etc.) (INVENTARIADO).
- Controladores, Servicios, Entidades y DTOs asociados a dichos módulos (PENDIENTES DE REVISIÓN INDEPENDIENTE).
- Endpoints restantes no descritos en las secciones anteriores (PENDIENTES DE REVISIÓN INDEPENDIENTE).
