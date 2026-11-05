# Handoff Backend: catálogo de planes y cobranza

## Alcance y estado

Implementación del backend de suscripciones comerciales, catálogo administrable, pagos manuales y comprobantes privados. El catálogo no se expone a APIs tenant. La creación del laboratorio y su snapshot inicial se realizan en una transacción `SERIALIZABLE`; las reasignaciones posteriores cierran el snapshot vigente y agregan otro sin borrar historial. `is_active` permanece separado del estado comercial.

No ejecutar migraciones ni operaciones contra bases de datos reales durante esta tarea. No se conectó a `bionexus_dev`, Production ni Railway. No se abrió PR ni se hizo merge; la integración queda pendiente de la revisión coordinada Backend/Frontend.

## Causa de `$9` al crear laboratorios

El parámetro SQL `$9` del `INSERT` de alta se reutilizaba como estado insertado en `subscription_status` y en una comparación textual de `CASE`. PostgreSQL infería tipos incompatibles para el mismo parámetro al resolver ambos contextos. La consulta ahora bindea el estado una sola vez y usa un parámetro booleano independiente, explícitamente tipado, para los campos de concesión `perpetual_free`; actor y estado también se bindean separadamente. `platform-provisioning.service.spec.ts` cubre el SQL y el valor real del estado.

## Contrato de API propietario (`/platform`)

Todas las rutas están protegidas por `JwtUserGuard` y `PlatformOwnerGuard`. Listas usan wrappers; las asignaciones, cambios de estado y pagos responden con los wrappers indicados.

| Método y ruta | Request principal | Response |
|---|---|---|
| `GET /plans?includeInactive=true\|false` | — | `{ plans: Plan[] }` |
| `POST /plans` | `{ code, name, description?, price, currency, billingInterval, gracePeriodDays, limitsBenefits, isActive? }` | `{ plan: Plan }` |
| `PATCH /plans/:planId` | Patch de campos de plan | `{ plan: Plan }` |
| `GET /laboratories/:laboratoryId/subscription` | — | `{ subscription: Subscription }` |
| `POST /laboratories/:laboratoryId/subscription` | `{ status, planCode?, startsAt, expiresAt?, perpetualFreeReason? }` | `{ subscription: Subscription }` |
| `PATCH /laboratories/:laboratoryId/subscription/status` | `{ status, reason? }` | `{ subscription: Subscription }` |
| `GET /laboratories/:laboratoryId/payments` | — | `{ payments: Payment[] }` |
| `POST /laboratories/:laboratoryId/payments` | multipart `payment` (JSON-string) y `proof?` (archivo) | `{ payment: Payment }` |
| `GET /laboratories/:laboratoryId/payments/:paymentId/proof` | — | Archivo descargable privado (`application/pdf`, `image/png`, `image/jpeg` o `image/webp`) |

Alta transaccional: `POST /laboratories` conserva el contrato existente y acepta `plan_code`, `subscription_status`, `service_starts_at` y `service_expires_at`; también requiere los campos existentes de laboratorio y administrador. Para `trial`/`active`, `plan_code` y expiración son requeridos. Para `perpetual_free`, `plan_code` se puede omitir (si se envía, se ignora), `service_expires_at` debe ser `null`, y `perpetual_free_reason` es obligatorio. La respuesta mantiene `{ laboratory, mainBranch, administrator, installedCatalogPackages }`; el objeto propietario `laboratory` incluye el snapshot inicial.

Los planes exponen `planId`, `code`, `name`, `description`, `price`, `currency`, `billingInterval` (`monthly|yearly`), `gracePeriodDays`, `limitsBenefits` (objeto JSON) e `isActive`. Los snapshots incluyen campos comerciales copiados, entre ellos `planId`, `planCode`, `planName`, `planDescription`, `planPrice`, `planCurrency`, `billingInterval`, `limitsBenefits`, `gracePeriodDays`, `status`, `startsAt`, `expiresAt` y `graceUntil`. El snapshot conserva los días de gracia originales aunque luego cambie el catálogo; cero días no crea gracia.

Estados comerciales: `trial`, `active`, `grace`, `suspended`, `cancelled`, `perpetual_free`. En reasignación, `planCode` es requerido para `trial`/`active`, y opcional e ignorado para `perpetual_free`, que exige razón y registra actor/fecha, sin vencimiento ni gracia. Los pagos incluyen `paymentId`, `subscriptionId`, `paidAt`, `amount`, `currency`, `method`, `reference`, `periodStart`, `periodEnd`, `hasProof`, `recordedBy` y `createdAt`. Moneda es texto normalizado a tres letras mayúsculas; método es texto libre. No se devuelve URL ni ruta del comprobante.

El payload `payment` lleva `{ idempotencyKey, paidAt, amount, currency, method, reference?, periodStart, periodEnd }`. Cada pago se registra, activa/renueva la suscripción y crea auditoría before/after dentro de una transacción serializable; la clave de idempotencia impide extender dos veces ante reintentos. Los registros de pago son append-only a nivel de base de datos. No hay API de corrección/anulación: cualquier error de captura requiere un mecanismo compensatorio/auditado futuro, no edición o borrado silencioso.

Las respuestas de laboratorio para tenants omiten catálogo comercial, estado y metadatos de `perpetual_free`. La política central comprueba `is_active` por separado y bloquea acceso según inicio, vencimiento, gracia, suspensión, cancelación y metadatos válidos de `perpetual_free`.

## Comprobantes y persistencia

Upload en memoria limitado a un archivo de 10 MiB; extensión, MIME y firma se validan. El nombre/ruta persistidos se generan en servidor, fuera de `public/`; descarga requiere autenticación de propietario y coincide laboratorio + pago. El directorio es configurable mediante `PLATFORM_PRIVATE_STORAGE_DIR` (por defecto `.private-storage/platform-payment-proofs`, excluido de Git). En despliegue, ese directorio debe montarse sobre almacenamiento privado persistente y respaldado; el filesystem efímero del contenedor no garantiza durabilidad.

## Schema e instalación limpia

La migración incremental nueva es `1793862000000-AddPlatformSubscriptionCatalogAndBilling`; sigue a `1793847600000-AddPlatformLaboratoryLifecycle`. No se editó el baseline. `install:first` ejecuta `migration:run` y verifica la presencia/registro de ambas migraciones, tablas de catálogo/suscripción/pago/auditoría y columna de gracia. `Install-BioNexus-Environment.ps1` mantiene una verificación de schema de solo lectura al terminar. El contrato automatizable compara esas rutas de instalación y la migración con el baseline, sin abrir conexiones a DB.

## Validación de esta entrega

`npm run build` pasó. Las 13 suites dirigidas pasaron con 103/103 pruebas; la suite dirigida adicional de alta por CLI pasó (24/24 pruebas incluyendo suites relacionadas ya ejecutadas). La suite completa ejecutó 150 suites: 147 pasaron y 823 pruebas pasaron. Tres suites no pudieron completarse por precondiciones ajenas a este cambio: `bootstrap-first-admin.spec.ts` requiere variables de conexión (no se configuraron ni se conectó a DB), `users.service.safe-response.spec.ts` tiene dos fixtures sin `access_slug`, y `typepayment-order.contract.spec.ts` requiere un checkout hermano de Frontend que no existe en este worktree. El lint dirigido de todos los archivos TypeScript modificados pasó; `npm run lint` global reporta 7 errores ya existentes en archivos no modificados (`authorization-administration.service.spec.ts`, `SeedRelationContract.spec.ts`, `exams.service.ts`, `patients-results-email-send.spec.ts` y `users.service.ts`). `git diff --check` pasó.

Estas pruebas son contractuales/estáticas; no equivalen a ejecutar PostgreSQL. La prueba funcional de instalación corresponde a `development`/`bionexus_dev` después de respaldo revisado, fuera de este cambio.
