# Scripts operativos de Bio Nexus

Esta carpeta reúne comandos PowerShell para comprobar el proyecto, probar un laboratorio tenant ya creado y preparar una instalación inicial en una base de datos nueva. Los scripts muestran cada fase con fecha y hora y evitan imprimir contraseñas del archivo `.env`.

Los scripts están en el repositorio Backend y localizan el Frontend como carpeta hermana. En esta computadora, la estructura esperada es:

```text
Aplicacion\
├── Bio Nexus Backend\
└── Bio Nexus Frontend\
```

## Antes de comenzar

1. Verifica que Backend y Frontend estén en las ramas que quieres probar. La propuesta de trabajo es desarrollar y probar en `development`, y pasar a `main` después de validar.
2. Abre PowerShell en `C:\Users\Alexis\Documents\Bio Nexus\Aplicacion\Bio Nexus Backend`.
3. Para las pruebas y la instalación, confirma que existe el `.env` local del Backend y que contiene la configuración PostgreSQL necesaria. Los scripts no muestran sus valores.
4. No pegues contraseñas en los comandos ni en el chat. La instalación puede pedir la contraseña del propietario de forma oculta.

Todos los comandos de esta guía se ejecutan desde la carpeta Backend. También se pueden invocar desde otra carpeta usando la ruta completa al archivo `.ps1`.

## 1. Comprobar el proyecto antes de probar o integrar cambios

Ejecuta:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Test-BioNexus-Ready.ps1"
```

Este comando:

- comprueba que las bitácoras JSON de Backend y Frontend sean válidas e idénticas;
- ejecuta el contrato de acceso tenant del Frontend y las pruebas tenant seleccionadas del Backend;
- construye Backend y Frontend;
- revisa errores de espacios en blanco en los cambios de Git.

No conecta ni modifica bases de datos y no inicia servidores. Si una comprobación falla, detente y revisa el error antes de avanzar a una instalación o despliegue.

## 2. Revisar una base de pruebas que ya tenga un laboratorio

Este flujo es para una base **desechable existente** que ya fue instalada y contiene al menos un laboratorio con `access_slug`. No crea laboratorios ni ejecuta migraciones.

Primero puedes hacer el preflight de solo lectura:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Run-BioNexus-Tenant-Test.ps1" -DatabaseName "bionexus_tenant_test_20261104" -ConfirmTestDatabase -PreflightOnly
```

Reemplaza el nombre por el de tu base de pruebas. Debe cumplir el patrón `bionexus_test_...` o `bionexus_tenant_test_...`; además, siempre hay que incluir `-ConfirmTestDatabase`. El preflight confirma que exista la columna tenant y al menos un laboratorio con slug. Solo consulta la base.

Cuando el preflight pase, puedes abrir Backend y Frontend en consolas separadas:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Run-BioNexus-Tenant-Test.ps1" -DatabaseName "bionexus_tenant_test_20261104" -ConfirmTestDatabase
```

El Backend de prueba usa el puerto `33002` y el Frontend el `8082`. El script se niega a iniciar si alguno está ocupado; no termina procesos existentes. Espera a que ambas consolas indiquen que están listas y abre:

```text
http://127.0.0.1:8082/l/<access_slug>/login
```

Sustituye `<access_slug>` por el slug del laboratorio. Para detener la prueba, usa `Ctrl+C` en las consolas que abrió el script. El script no cambia de rama, no modifica la base, no crea datos, no hace commits ni inicia migraciones.

## 3. Simular una instalación inicial desde cero

`install:first` es para una base de datos nueva, todavía inexistente. Crea la base, instala la baseline actual, prepara el propietario inicial de plataforma, publica catálogos y comprueba el estado inicial sin laboratorios ni usuarios tenant. **No es un comando para borrar y reinicializar una base existente.**

### Paso A: validar el entorno sin instalar

Comprueba que el `.env` del Backend tenga conexión PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASSWORD`) y que el usuario PostgreSQL pueda conectarse a la base de mantenimiento (normalmente `postgres`) y crear bases. No compartas ni copies los secretos.

Puedes revisar qué intentaría hacer el script, sin conexión a PostgreSQL:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Fresh.ps1" -DatabaseName "bionexus_dev" -WhatIf
```

`-WhatIf` no crea la base ni ejecuta `install:first`.

### Paso B: realizar la instalación de desarrollo

Cuando estés listo, ejecuta:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Fresh.ps1" -DatabaseName "bionexus_dev"
```

El script te pedirá confirmar la operación. Verifica que la base elegida sea la que quieres crear. Si no existen en el `.env` los datos del propietario, solicitará el nombre de usuario, el nombre visible y una contraseña oculta. La contraseña solicitada no se imprime ni se guarda en el `.env`.

El nombre debe ser `bionexus_dev`, `bionexus_test`, `bionexus_prod` o una variante con sufijo. El script comprueba que la base no exista y **se niega a reutilizar cualquier base existente**, incluida la protegida `bionexus`. Si ya existe `bionexus_dev`, no la borra: elige otro nombre nuevo o detente para decidir cómo administrarla.

### Paso C: comprobar el resultado

Espera el mensaje de instalación completada. Si falla, conserva el error y el evento de resultado de `install:first` para diagnosticarlo; no vuelvas a ejecutar sobre una base existente. El instalador puede limpiar la base nueva que él mismo haya creado cuando la instalación falla, pero el script no elimina bases preexistentes.

Después de una instalación inicial exitosa:

- no ejecutes `bootstrap:platform-owner` por separado; `install:first` prepara el propietario si hace falta;
- `bootstrap:first-admin` es un flujo distinto y no sustituye al propietario global de plataforma;
- inicia sesión como propietario y crea el laboratorio desde la aplicación; el laboratorio y su `access_slug` se crean después.

Para representar una instalación limpia, comienza con una base nueva como `bionexus_dev`. Este procedimiento no borra ni sustituye `bionexus` ni ninguna otra base existente. No uses `bionexus_prod` hasta haber decidido expresamente el destino de producción y verificado su configuración.

## 4. Revisar el estado de la base `bionexus` sin modificarla

Este comando comprueba la base real configurada en el `.env`, pero solo si `DB_DATABASE` es exactamente `bionexus`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Test-BioNexus-DatabaseState.ps1"
```

El diagnóstico inicia una transacción PostgreSQL `READ ONLY` y verifica la tabla de historial de migraciones, si está registrada la baseline `BioNexusBaseline1790366400000`, la columna `laboratory.access_slug`, su restricción e índice único, y conteos agregados de slugs vacíos o duplicados. No muestra usuarios, nombres de laboratorios, pacientes, credenciales ni filas. Si el `.env` apunta a otra base, aborta sin conectarse.

Esto permite confirmar el estado del esquema actual, pero no certifica por sí solo que el Backend y el Frontend desplegados sean compatibles ni que DNS/TLS estén listos. Tampoco ejecuta migraciones, bootstrap, cambios o respaldos.

La baseline `BioNexusBaseline1790366400000` es para una instalación en una base vacía. Una vez aplicada, no se debe editar para introducir cambios nuevos: TypeORM registra su nombre/timestamp y no vuelve a ejecutarla cuando ese mismo archivo cambia. La revisión de Git encontró que el commit `8fb0257` añadió `access_slug` a esa baseline conservando el mismo timestamp; esto explica la discrepancia observada en `bionexus`, aunque la tabla de migraciones no guarda el hash del código que se ejecutó originalmente.

En la comprobación actual, `bionexus` registra una migración baseline, tiene una fila en `laboratory`, pero no tiene la columna `access_slug`. Por tanto, **no está lista para ejecutar la versión tenant actual**. No ejecutes `install:first` ni `migration:run` sin una migración incremental revisada.

El siguiente diseño debe crear una migración nueva con timestamp nuevo. Primero se define explícitamente el slug de la fila existente (no se deriva automáticamente del nombre del laboratorio), luego se agrega/backfillea la columna, se valida normalización, formato, no-reservado y unicidad, y solo después se establecen `NOT NULL`, el `CHECK` y el índice único normalizado. Antes de aplicar a `bionexus`, se debe validar un respaldo restaurable, probar en una copia de desarrollo, revisar el diff/plan y preparar pasos de reversión. No se debe marcar la baseline como ejecutada con `--fake`. La migración no está creada ni aplicada todavía.

## 5. Flujo recomendado de ramas y worktrees

- Usa `development` como rama de trabajo y prueba en Backend y Frontend. Mantén ambas carpetas principales en esa rama para el trabajo diario.
- Usa `main` como rama de promoción/producción: incorpora cambios desde `development` solo después de validarlos y revisarlos. No hagas `push` como parte de una prueba local.
- Una rama es una línea de commits; un worktree es otra carpeta de trabajo que permite tener una rama distinta abierta al mismo tiempo. No necesitas un worktree para usar `development`; es opcional cuando realmente quieras trabajar en `development` y `main` simultáneamente.
- Las carpetas bajo `.copilot\repos\copilot-worktrees` pueden estar enlazadas a sesiones de Copilot. Antes de borrar una rama `asifontes77-*`, verifica que su worktree esté retirado de forma segura, que la sesión esté terminada y que cualquier cambio útil esté preservado. No borres `origin/main`.

## 6. Separar bases de datos de desarrollo y producción

Sí: lo recomendable es tener una base de desarrollo y otra de producción, en el mismo servidor PostgreSQL o en servidores separados, pero con nombres, credenciales y configuración claramente separados. Una base distinta evita que las pruebas o instalaciones iniciales alteren producción.

- Desarrollo: usa una base nueva, por ejemplo `bionexus_dev`, con credenciales de desarrollo.
- Producción: usa `bionexus` solo con las credenciales de producción y cambios de esquema previamente respaldados, probados y aprobados.
- Mantén secretos fuera de Git; prepara el `.env` local para desarrollo y las variables secretas del proveedor para producción.
- La rama Git no selecciona automáticamente la base. Antes de cada comando de base de datos, confirma el entorno configurado; los scripts de instalación nueva y diagnóstico tienen protecciones propias.

## 7. Cloudflare y Railway: preparar subdominios de laboratorios

El registro `*.bionexus.app` no aparece en la captura previa. La dirección del apex (`bionexus.app`) no permite deducir el destino del wildcard. Obtén los valores exactos desde Railway:

1. En Railway, abre el servicio público que servirá los dominios de laboratorio y agrega `*.bionexus.app` como dominio personalizado.
2. Copia los registros CNAME/TXT y el CNAME `_acme-challenge` que Railway muestre. No inventes el destino ni reutilices automáticamente el CNAME del apex.
3. En Cloudflare, crea el CNAME wildcard con nombre `*` y el destino indicado por Railway; agrega también los registros de verificación exactos. El CNAME `_acme-challenge` debe quedar **DNS only** (nube gris).
4. Conserva los registros existentes del apex y de verificación, salvo que Railway pida expresamente cambiarlos. Activa Universal SSL y usa **Full (strict)**; el origen también debe presentar un certificado válido.
5. Configura el servicio o gateway para servir el Frontend, hacer fallback de rutas SPA y enviar `/api` al Backend en el mismo origen, conservando el `Host` original de forma confiable.
6. Cuando Railway confirme el dominio y TLS/DNS estén activos, prueba `https://<access_slug>.bionexus.app/dashboard`.

El apex `bionexus.app`, `www.bionexus.app` y `*.bionexus.app` son configuraciones distintas; `www` no es necesario para los laboratorios. El plan de Railway puede limitar el número de dominios personalizados por servicio; verifica el límite actual antes de añadir el wildcard junto al apex.

Referencias: [dominios personalizados y wildcard en Railway](https://docs.railway.com/networking/domains/working-with-domains) y [registros wildcard en Cloudflare](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/).
