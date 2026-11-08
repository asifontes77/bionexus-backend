# Scripts operativos de Bio Nexus

Esta carpeta contiene los comandos operativos para instalar desde cero, iniciar desarrollo, ejecutar y promover migraciones, probar un tenant y revisar el estado de bases antiguas. Cada comando registra sus etapas con fecha y hora y evita imprimir contraseñas.

Los scripts calculan las rutas desde su propia ubicación; puedes mover juntos los repositorios sin editar rutas dentro de los `.ps1`. Backend y Frontend deben conservar esta estructura relativa y esos nombres de carpeta:

```text
<carpeta de proyectos>\
├── Bio Nexus Backend\
└── Bio Nexus Frontend\
```

No es necesario abrir PowerShell en una ruta fija. Desde la carpeta Backend puedes ejecutar los ejemplos de esta guía; desde otra ubicación puedes invocarlos con la ruta actual del repositorio:

```powershell
$Backend = (Resolve-Path ".\Bio Nexus Backend").Path
& (Join-Path $Backend "scripts\ops\Test-BioNexus-Ready.ps1")
```

Si cambias el nombre de la carpeta Frontend, actualiza el nombre esperado en `scripts\ops\BioNexus-Operations.Common.ps1`.

## Antes de comenzar

1. Trabaja en `development` y verifica la rama de ambos repositorios antes de probar.
2. Crea el archivo local `.env` del Backend a partir de `.env.example` y configura PostgreSQL.
3. En `.env`, `DB_USER` y `DB_PASSWORD` son para la cuenta **administrativa** de PostgreSQL, necesaria para crear bases/roles y aplicar migraciones. El archivo está excluido de Git; no lo compartas.
4. El arranque del Backend mediante `Start-BioNexus-Development.ps1` sustituye esa cuenta por `bionexus_dev_app` y su contraseña DPAPI. No arranques la aplicación directamente con `npm run start:dev`, porque ese comando cargaría la conexión administrativa del `.env`.
5. Elige y guarda cada contraseña de aplicación en tu gestor de contraseñas antes de escribirla en el prompt oculto del instalador. No las pegues en comandos, bitácoras, Git ni en el chat.

Los scripts operativos usan nombres de base fijos y seguros: `bionexus_dev` y `bionexus_prod`. El segundo es solo un ensayo local, no la producción de Railway.

## Instalación desde cero

1. Instala PostgreSQL y Node.js, clona Backend y Frontend como carpetas hermanas y ejecuta `npm ci` en cada repositorio.
2. Copia `.env.example` a `.env` en Backend. Configura host y puerto PostgreSQL, y una cuenta administrativa con permiso para crear bases y roles. El valor `DB_DATABASE` se reemplaza explícitamente por cada script; `DB_USER`/`DB_PASSWORD` siguen siendo administrativos, no son las credenciales de ejecución de Bio Nexus.
3. Si vas a reinstalar bases existentes, cierra conexiones en DBeaver y elimina únicamente `bionexus_dev` y/o `bionexus_prod`. El rol dedicado y el archivo DPAPI pueden permanecer: el instalador detecta el rol esperado, establece la contraseña que elijas y reemplaza el secreto protegido. Nunca reutiliza ni elimina otra base.
4. Instala `Development` con `Install-BioNexus-Environment.ps1`. Escribe el nombre de usuario y nombre visible del propietario inicial; su contraseña es para iniciar sesión en Bio Nexus. Luego ingresa la contraseña del rol `bionexus_dev_app` (mínimo 20 caracteres) y guárdala en tu gestor. El prompt no muestra lo que escribes.
5. Ejecuta las pruebas de preparación y luego `Start-BioNexus-Development.ps1`. Inicia sesión como propietario, entra al panel `/admin` y crea el primer laboratorio de prueba.
6. Cuando necesites ensayar una instalación separada, repite el paso para `Production`; elige y guarda otra contraseña para `bionexus_prod_app`. Esta base local no representa la producción real ni recibe cambios automáticamente de Railway.
7. Para pasar migraciones de desarrollo al ensayo local, usa `Invoke-BioNexus-Migrations.ps1` primero con `Development`, valida la aplicación y luego con `Production`.

Las contraseñas de aplicación se almacenan cifradas con Windows DPAPI en `%LOCALAPPDATA%\BioNexus\database-credentials\<Environment>.xml`, fuera del repositorio. Solo el mismo usuario de Windows en el mismo equipo puede descifrarlas. Para usar Railway, guarda los secretos de producción en Railway; el DPAPI local no se puede trasladar allí.

## 1. Script: `Test-BioNexus-Ready.ps1` — comprobar antes de probar

**Para qué sirve:** valida que las bitácoras sean JSON válido e idénticas, ejecuta el contrato tenant Frontend y las pruebas tenant Backend, compila ambas aplicaciones y revisa `git diff --check`. No conecta ni modifica PostgreSQL y no inicia servidores.

**Comando:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Test-BioNexus-Ready.ps1"
```

## 2. Script: `Run-BioNexus-Tenant-Test.ps1` — probar una base tenant aislada

**Para qué sirve:** verifica una base desechable ya instalada con al menos un laboratorio y `access_slug`, y puede abrir Backend/Frontend en puertos separados para probarla. No crea datos ni ejecuta migraciones.

**Preflight de solo lectura:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Run-BioNexus-Tenant-Test.ps1" -DatabaseName "bionexus_tenant_test_20261104" -ConfirmTestDatabase -PreflightOnly
```

Usa el nombre exacto de una base de pruebas que cumpla `bionexus_test_...` o `bionexus_tenant_test_...`; conserva `-ConfirmTestDatabase`. El preflight solo consulta la base.

**Iniciar la prueba:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Run-BioNexus-Tenant-Test.ps1" -DatabaseName "bionexus_tenant_test_20261104" -ConfirmTestDatabase
```

El Backend de prueba usa el puerto `33002` y el Frontend el `8082`. El script se niega a iniciar si alguno está ocupado; no termina procesos existentes. Espera a que ambas consolas indiquen que están listas y abre:

```text
http://127.0.0.1:8082/l/<access_slug>/login
```

El Frontend de prueba usa el puerto `8082`; abre la dirección indicada por el script con el slug existente. Detén las consolas con `Ctrl+C`. El script no cambia de rama, no modifica la base, no crea datos, no hace commits ni inicia migraciones.

## 3. Script: `Install-BioNexus-Environment.ps1` — instalar desde cero

**Para qué sirve:** crea la base vacía, configura o actualiza el rol runtime sin privilegios administrativos, ejecuta `install:first`, concede permisos, valida el esquema tenant y guarda la contraseña elegida cifrada con DPAPI. La contraseña del propietario de plataforma es distinta de la contraseña del rol PostgreSQL.

**Simular instalación Development** (`-WhatIf` no conecta a PostgreSQL):
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Development -WhatIf
```

**Instalar Development:**
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Development
```

**Instalar el ensayo Production local:**
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Production -WhatIf
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Production
```

Para reinstalar, es necesario que el nombre de base correspondiente no exista. Si solo borraste la base desde DBeaver, el instalador puede reutilizar el rol app existente, cambiar su contraseña por la nueva que indiques y reemplazar el archivo DPAPI. No se borran otras bases ni roles.

## 4. Script: `Start-BioNexus-Development.ps1` — iniciar el entorno de desarrollo

**Para qué sirve:** valida de solo lectura que `bionexus_dev`, su rol runtime, el historial y los objetos de esquema tenant, lifecycle y billing requeridos estén presentes, luego abre Backend y Frontend en consolas separadas. Si falta alguno, no inicia servicios. Pasa al Backend las credenciales `bionexus_dev_app` desde el archivo DPAPI; no usa para la aplicación el usuario administrativo del `.env`. No modifica la base. Detén ambas consolas con `Ctrl+C`.

**Comando:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Start-BioNexus-Development.ps1"
```

## 5. Script: `Invoke-BioNexus-Migrations.ps1` — aplicar primero en Development y luego promover al ensayo local

**Para qué sirve:** aplica migraciones TypeORM al entorno local seleccionado usando la conexión administrativa del `.env`. En `Development` muestra las migraciones pendientes, las aplica y confirma que no quede ninguna. En `Production`, comprueba que Development esté al día y que cada migración pendiente de `bionexus_prod` ya esté aplicada allí; requiere escribir la confirmación exacta antes de modificar la base local de ensayo. No configura ni migra Railway.

**Aplicar migraciones probadas a Development:**
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Invoke-BioNexus-Migrations.ps1" -EnvironmentName Development
```

**Promover a `bionexus_prod` local después de probar Development:**
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Invoke-BioNexus-Migrations.ps1" -EnvironmentName Production -WhatIf
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Invoke-BioNexus-Migrations.ps1" -EnvironmentName Production
```

El script se niega a operar si hay archivos de migraciones sin commit. Las migraciones nuevas deben tener timestamp nuevo; nunca edites la baseline ya instalada. La migración comercial `AddCommercialPlanModel1793862001000` agrega `plan_type`, `interval_unit` e `interval_count`, y debe aplicarse primero en `bionexus_dev` mediante este flujo protegido. `bionexus_prod` es un ensayo local, por lo que su éxito no es autorización para migrar producción real. En Railway se debe respaldar y aplicar la misma migración mediante un proceso de despliegue separado.

Tras `migration:show` y, cuando corresponda, después de ejecutar migraciones, el script verifica en una transacción de solo lectura la identidad de la base, las migraciones esperadas en el historial y las tablas y columnas requeridas. También exige que TypeORM haya cargado las migraciones baseline, lifecycle y billing. Si hay pendientes, puede aplicarlas normalmente; no informa éxito hasta que no queden pendientes y el contrato exista. Esto comprueba presencia, no todos los tipos, restricciones, permisos o datos del esquema.

Para diagnosticar manualmente sin modificar el estado, conecta explícitamente a la base local que deseas inspeccionar y ejecuta esta consulta en una transacción de solo lectura:

```sql
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database,
       EXISTS (SELECT 1 FROM public.migrations
               WHERE name = 'AddPlatformSubscriptionCatalogAndBilling1793862000000') AS billing_migration_recorded,
       to_regclass('public.platform_subscription_plans') AS plans,
       to_regclass('public.platform_subscriptions') AS subscriptions,
       to_regclass('public.platform_subscription_payments') AS payments,
       to_regclass('public.platform_billing_audit_logs') AS billing_audit,
       to_regclass('public.platform_laboratory_audit_logs') AS lifecycle_audit;
ROLLBACK;
```

Si `public.migrations` no existe o no es accesible, la consulta falla en vez de declarar la base lista. Una migración que TypeORM no carga no aparece como pendiente; si está registrada pero faltan objetos, puede existir una discrepancia entre historial y DDL (por ejemplo, ejecución simulada o cambios posteriores). Son hipótesis, no un diagnóstico de la base del usuario. No vuelvas a ejecutar `install:first` ni repares el historial sin investigar y respaldar primero.

## 6. Script: `Remove-BioNexus-LegacyDatabase.ps1` — retirar solo `bionexus`

**Para qué sirve:** comprueba que `bionexus_dev` y `bionexus_prod` tengan esquema tenant y roles runtime válidos y, solo entonces, puede eliminar exclusivamente la base antigua `bionexus`. Se detiene si hay conexiones; no las termina. Exige confirmación de PowerShell y escribir `DESCARTAR bionexus`. No es necesario para una reinstalación normal de Dev/Prod.

**Simular:**
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Remove-BioNexus-LegacyDatabase.ps1" -WhatIf
```

**Ejecutar tras verificar los reemplazos:**
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Remove-BioNexus-LegacyDatabase.ps1"
```

## 7. Script: `Test-BioNexus-DatabaseState.ps1` — diagnóstico histórico de `bionexus`

**Para qué sirve:** ejecuta un diagnóstico PostgreSQL de solo lectura en la antigua base `bionexus`; aborta si el `DB_DATABASE` del `.env` no es exactamente `bionexus`. La base se encontró ausente en la última comprobación, así que este script solo será útil si se restaura o recrea intencionalmente esa base.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Test-BioNexus-DatabaseState.ps1"
```

El diagnóstico inicia una transacción PostgreSQL `READ ONLY` y verifica la tabla de historial de migraciones, si está registrada la baseline `BioNexusBaseline1790366400000`, la columna `laboratory.access_slug`, su restricción e índice único, y conteos agregados de slugs vacíos o duplicados. No muestra usuarios, nombres de laboratorios, pacientes, credenciales ni filas. Si el `.env` apunta a otra base, aborta sin conectarse.

Esto permite confirmar el estado del esquema actual, pero no certifica por sí solo que el Backend y el Frontend desplegados sean compatibles ni que DNS/TLS estén listos. Tampoco ejecuta migraciones, bootstrap, cambios o respaldos.

La baseline `BioNexusBaseline1790366400000` es para una instalación en una base vacía. Una vez aplicada, no se debe editar para introducir cambios nuevos: TypeORM registra su nombre/timestamp y no vuelve a ejecutarla cuando ese mismo archivo cambia. La revisión de Git encontró que el commit `8fb0257` añadió `access_slug` a esa baseline conservando el mismo timestamp; esto explica la discrepancia observada en `bionexus`, aunque la tabla de migraciones no guarda el hash del código que se ejecutó originalmente.

El diagnóstico histórico encontró una baseline registrada, una fila en `laboratory`, pero ninguna columna `access_slug`. Esa conclusión ya no describe los entornos nuevos: el 4 de noviembre de 2026 se instalaron `bionexus_dev` y `bionexus_prod` desde cero; ambas pasaron la validación tenant del instalador. En la comprobación final, el script protegido de retiro encontró que `bionexus` ya no existía. No se debe inferir quién o qué proceso externo la retiró.

No vuelvas a ejecutar `install:first` contra una base ya instalada. Los cambios futuros de esquema requieren una migración incremental con timestamp nuevo, probada primero en `bionexus_dev` y luego aplicada a la base productiva real tras respaldo y revisión. La base local `bionexus_prod` es solo un ensayo; no es la base de producción de Railway.

## 8. Script complementario: `BioNexus-Operations.Common.ps1`

**Para qué sirve:** librería compartida que cargan los scripts para resolver carpetas relativas, leer `.env` sin mostrar secretos, preparar variables de proceso, comprobar puertos y escribir mensajes fechados. No se ejecuta manualmente.

## 9. Flujo recomendado de ramas y worktrees

- Usa `development` como rama de trabajo y prueba en Backend y Frontend. Mantén ambas carpetas principales en esa rama para el trabajo diario.
- Usa `main` como rama de promoción/producción: incorpora cambios desde `development` solo después de validarlos y revisarlos. No hagas `push` como parte de una prueba local.
- Una rama es una línea de commits; un worktree es otra carpeta de trabajo que permite tener una rama distinta abierta al mismo tiempo. No necesitas un worktree para usar `development`; es opcional cuando realmente quieras trabajar en `development` y `main` simultáneamente.
- Las carpetas bajo `.copilot\repos\copilot-worktrees` pueden estar enlazadas a sesiones de Copilot. Antes de borrar una rama `asifontes77-*`, verifica que su worktree esté retirado de forma segura, que la sesión esté terminada y que cualquier cambio útil esté preservado. No borres `origin/main`.

## 10. Separar bases de datos de desarrollo y producción

Sí: lo recomendable es tener una base de desarrollo y otra de producción, en el mismo servidor PostgreSQL o en servidores separados, pero con nombres, credenciales y configuración claramente separados. Una base distinta evita que las pruebas o instalaciones iniciales alteren producción.

- Desarrollo local: `bionexus_dev`, con el rol de aplicación `bionexus_dev_app`.
- Ensayo local de producción: `bionexus_prod`, con el rol de aplicación `bionexus_prod_app`. No usarla como producción desplegada ni para datos reales.
- Producción desplegada: una base administrada por el proveedor (por ejemplo Railway), con sus propias credenciales y secretos; todavía debe configurarse y validarse por separado.
- Mantén secretos fuera de Git; prepara el `.env` local para desarrollo y las variables secretas del proveedor para producción.
- La rama Git no selecciona automáticamente la base. Antes de cada comando de base de datos, confirma el entorno configurado; los scripts de instalación nueva y diagnóstico tienen protecciones propias.

El 4 de noviembre de 2026, ambas bases locales se crearon con la baseline actual, cada una con un propietario de plataforma y sin laboratorios ni usuarios tenant. El instalador comprobó el esquema `access_slug` y el acceso de su rol runtime; el script de retiro volvió a validar ambos reemplazos. El estado observado al terminar fue: `bionexus_dev` y `bionexus_prod` disponibles, `bionexus` ausente. Las credenciales runtime están cifradas con DPAPI para el usuario Windows actual; no se pueden trasladar a otro equipo ni a Railway.

## 11. Cloudflare y Railway: preparar subdominios de laboratorios

El registro `*.bionexus.app` no aparece en la captura previa. La dirección del apex (`bionexus.app`) no permite deducir el destino del wildcard. Obtén los valores exactos desde Railway:

1. En Railway, abre el servicio público que servirá los dominios de laboratorio y agrega `*.bionexus.app` como dominio personalizado.
2. Copia los registros CNAME/TXT y el CNAME `_acme-challenge` que Railway muestre. No inventes el destino ni reutilices automáticamente el CNAME del apex.
3. En Cloudflare, crea el CNAME wildcard con nombre `*` y el destino indicado por Railway; agrega también los registros de verificación exactos. El CNAME `_acme-challenge` debe quedar **DNS only** (nube gris).
4. Conserva los registros existentes del apex y de verificación, salvo que Railway pida expresamente cambiarlos. Activa Universal SSL y usa **Full (strict)**; el origen también debe presentar un certificado válido.
5. Configura el servicio o gateway para servir el Frontend, hacer fallback de rutas SPA y enviar `/api` al Backend en el mismo origen, conservando el `Host` original de forma confiable.
6. Cuando Railway confirme el dominio y TLS/DNS estén activos, prueba `https://<access_slug>.bionexus.app/dashboard`.

El apex `bionexus.app`, `www.bionexus.app` y `*.bionexus.app` son configuraciones distintas; `www` no es necesario para los laboratorios. El plan de Railway puede limitar el número de dominios personalizados por servicio; verifica el límite actual antes de añadir el wildcard junto al apex.

Referencias: [dominios personalizados y wildcard en Railway](https://docs.railway.com/networking/domains/working-with-domains) y [registros wildcard en Cloudflare](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/).
## Menu interactivo y respaldo permanente

Ejecuta `Start-BioNexus-Operations.ps1` para seleccionar operaciones sin memorizar parametros. El menu llama las herramientas especializadas y conserva sus confirmaciones.

`Backup-BioNexus-Environment.ps1` crea un respaldo Plain SQL, resumen, log, SHA-256 e inventario read-only. Si no se indica `-OutputDirectory`, usa `<Escritorio real del usuario>\BioNexus Backup`. Nunca guardes respaldos dentro de Git. El menu interactivo permite usar esa carpeta detectada, escribir otra ruta absoluta o cancelar; pasa la seleccion como `-OutputDirectory` tanto a `WhatIf` como al respaldo real.

`Promote-BioNexus-Database.ps1` promueve el esquema a `bionexus_prod` local mediante migraciones committed. No copia laboratorios ni datos transaccionales desde Development y no incluye Railway.

Todas las herramientas muestran mensajes en espanol y configuran UTF-8 centralmente mediante `BioNexus-Operations.Common.ps1`.
