# 05. Integridad Transaccional

**ESTADO: PRELIMINAR / PARCIALMENTE VERIFICADO / PENDIENTE DE REVISIÓN INDEPENDIENTE**

Este es un diagnóstico preliminar estático. No constituye una certificación exhaustiva.

ANALIZADO: invoices.service.ts y patients.service.ts usan save() aislado sin evidencias generalizadas de Transaction o QueryRunner para flujos multientidad.
PENDIENTE DE REVISIÓN INDEPENDIENTE: Idempotencia y condiciones de carrera en resto del sistema.