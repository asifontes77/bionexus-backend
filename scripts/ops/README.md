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

## 3. Crear las bases y roles separados

`install:first` aplica la baseline en una base vacía, prepara el propietario de plataforma, publica los catálogos y valida que el inicio no tenga laboratorios ni usuarios tenant. No es un comando de borrado/reinstalación.

El instalador nuevo crea una base y un rol de aplicación separados por entorno. Usa las credenciales administrativas del `.env` solo para crear la base, ejecutar migraciones y asignar permisos; la aplicación conecta con un rol sin permisos de administrador. Las contraseñas de esos roles se guardan cifradas por Windows DPAPI para el usuario actual, fuera del repositorio, en `%LOCALAPPDATA%\BioNexus\database-credentials`.

Primero simula desarrollo; `-WhatIf` no conecta a PostgreSQL:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Development -WhatIf
```

Cuando verifiques el nombre y decidas ejecutar la instalación real:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Development
```

El script se detiene si ya existe `bionexus_dev`, `bionexus_dev_app` o su archivo local de credenciales. Solicita confirmación y la contraseña del propietario de Bio Nexus mediante un prompt oculto. Genera automáticamente una contraseña aleatoria fuerte para el rol PostgreSQL de aplicación; no la imprime ni la solicita, y la guarda cifrada con DPAPI para el usuario Windows actual. El rol no recibe `CREATEDB`, `CREATEROLE` ni superusuario; se le conceden permisos de lectura/escritura en tablas y secuencias de esa base. La configuración administrativa actual se usa para futuras migraciones; no configures la aplicación con ese usuario.

Cuando desarrollo esté instalada, ejecuta las comprobaciones del proyecto y abre la aplicación con el script:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Test-BioNexus-Ready.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Start-BioNexus-Development.ps1"
```

Inicia sesión con el propietario, crea un laboratorio y confirma su URL/slug. El script de inicio valida `bionexus_dev`, su baseline tenant y rol de aplicación antes de abrir consolas separadas. Para parar los servicios, usa `Ctrl+C` en sus consolas.

Luego puedes instalar `bionexus_prod` **localmente como ensayo** con su rol separado:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Production -WhatIf
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Environment.ps1" -EnvironmentName Production
```

Importante: que una base local se llame `bionexus_prod` no la convierte en producción real. El despliegue productivo deberá usar el PostgreSQL y el gestor de secretos configurados en el proveedor de hosting; no subas el secreto DPAPI/local ni uses esta computadora como servidor productivo. La suscripción de Railway sirve para sus servicios/dominios, pero no cambia la configuración ni el PostgreSQL local de esta instalación.

## 4. Retirar la base antigua después de validar reemplazos

No uses este paso hasta que existan `bionexus_dev` y `bionexus_prod`, pasen la validación del instalador y hayas comprobado la nueva aplicación. El script revisa ambos esquemas y roles; si encuentra conexiones activas a la base anterior, aborta sin terminarlas. Luego requiere confirmación de PowerShell y escribir literalmente `DESCARTAR bionexus`.

Primero simula:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Remove-BioNexus-LegacyDatabase.ps1" -WhatIf
```

Solo después de comprobar ambos reemplazos, ejecuta:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Remove-BioNexus-LegacyDatabase.ps1"
```

Este comando es irreversible: elimina exclusivamente la base `bionexus`, no borra las nuevas bases ni roles, y no termina procesos conectados. Si se desea un respaldo previo, hay que producirlo y comprobar que restaura antes de retirar la base; el script no hace ni guarda backups.

Las migraciones futuras deben ser incrementales con timestamp nuevo: primero en desarrollo, luego en producción con respaldo y revisión. No vuelvas a editar la baseline ya instalada ni uses `migration:run` o `install:first` contra una base existente para intentar “actualizarla”.

## 5. Diagnóstico histórico de `bionexus`

Este comando de solo lectura se preparó para el diagnóstico de la antigua base `bionexus`. Solo se conecta si `DB_DATABASE` es exactamente `bionexus`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Test-BioNexus-DatabaseState.ps1"
```

El diagnóstico inicia una transacción PostgreSQL `READ ONLY` y verifica la tabla de historial de migraciones, si está registrada la baseline `BioNexusBaseline1790366400000`, la columna `laboratory.access_slug`, su restricción e índice único, y conteos agregados de slugs vacíos o duplicados. No muestra usuarios, nombres de laboratorios, pacientes, credenciales ni filas. Si el `.env` apunta a otra base, aborta sin conectarse.

Esto permite confirmar el estado del esquema actual, pero no certifica por sí solo que el Backend y el Frontend desplegados sean compatibles ni que DNS/TLS estén listos. Tampoco ejecuta migraciones, bootstrap, cambios o respaldos.

La baseline `BioNexusBaseline1790366400000` es para una instalación en una base vacía. Una vez aplicada, no se debe editar para introducir cambios nuevos: TypeORM registra su nombre/timestamp y no vuelve a ejecutarla cuando ese mismo archivo cambia. La revisión de Git encontró que el commit `8fb0257` añadió `access_slug` a esa baseline conservando el mismo timestamp; esto explica la discrepancia observada en `bionexus`, aunque la tabla de migraciones no guarda el hash del código que se ejecutó originalmente.

El diagnóstico histórico encontró una baseline registrada, una fila en `laboratory`, pero ninguna columna `access_slug`. Esa conclusión ya no describe los entornos nuevos: el 4 de noviembre de 2026 se instalaron `bionexus_dev` y `bionexus_prod` desde cero; ambas pasaron la validación tenant del instalador. En la comprobación final, el script protegido de retiro encontró que `bionexus` ya no existía. No se debe inferir quién o qué proceso externo la retiró.

No vuelvas a ejecutar `install:first` contra una base ya instalada. Los cambios futuros de esquema requieren una migración incremental con timestamp nuevo, probada primero en `bionexus_dev` y luego aplicada a la base productiva real tras respaldo y revisión. La base local `bionexus_prod` es solo un ensayo; no es la base de producción de Railway.

## 6. Flujo recomendado de ramas y worktrees

- Usa `development` como rama de trabajo y prueba en Backend y Frontend. Mantén ambas carpetas principales en esa rama para el trabajo diario.
- Usa `main` como rama de promoción/producción: incorpora cambios desde `development` solo después de validarlos y revisarlos. No hagas `push` como parte de una prueba local.
- Una rama es una línea de commits; un worktree es otra carpeta de trabajo que permite tener una rama distinta abierta al mismo tiempo. No necesitas un worktree para usar `development`; es opcional cuando realmente quieras trabajar en `development` y `main` simultáneamente.
- Las carpetas bajo `.copilot\repos\copilot-worktrees` pueden estar enlazadas a sesiones de Copilot. Antes de borrar una rama `asifontes77-*`, verifica que su worktree esté retirado de forma segura, que la sesión esté terminada y que cualquier cambio útil esté preservado. No borres `origin/main`.

## 7. Separar bases de datos de desarrollo y producción

Sí: lo recomendable es tener una base de desarrollo y otra de producción, en el mismo servidor PostgreSQL o en servidores separados, pero con nombres, credenciales y configuración claramente separados. Una base distinta evita que las pruebas o instalaciones iniciales alteren producción.

- Desarrollo local: `bionexus_dev`, con el rol de aplicación `bionexus_dev_app`.
- Ensayo local de producción: `bionexus_prod`, con el rol de aplicación `bionexus_prod_app`. No usarla como producción desplegada ni para datos reales.
- Producción desplegada: una base administrada por el proveedor (por ejemplo Railway), con sus propias credenciales y secretos; todavía debe configurarse y validarse por separado.
- Mantén secretos fuera de Git; prepara el `.env` local para desarrollo y las variables secretas del proveedor para producción.
- La rama Git no selecciona automáticamente la base. Antes de cada comando de base de datos, confirma el entorno configurado; los scripts de instalación nueva y diagnóstico tienen protecciones propias.

El 4 de noviembre de 2026, ambas bases locales se crearon con la baseline actual, cada una con un propietario de plataforma y sin laboratorios ni usuarios tenant. El instalador comprobó el esquema `access_slug` y el acceso de su rol runtime; el script de retiro volvió a validar ambos reemplazos. El estado observado al terminar fue: `bionexus_dev` y `bionexus_prod` disponibles, `bionexus` ausente. Las credenciales runtime están cifradas con DPAPI para el usuario Windows actual; no se pueden trasladar a otro equipo ni a Railway.

## 8. Cloudflare y Railway: preparar subdominios de laboratorios

El registro `*.bionexus.app` no aparece en la captura previa. La dirección del apex (`bionexus.app`) no permite deducir el destino del wildcard. Obtén los valores exactos desde Railway:

1. En Railway, abre el servicio público que servirá los dominios de laboratorio y agrega `*.bionexus.app` como dominio personalizado.
2. Copia los registros CNAME/TXT y el CNAME `_acme-challenge` que Railway muestre. No inventes el destino ni reutilices automáticamente el CNAME del apex.
3. En Cloudflare, crea el CNAME wildcard con nombre `*` y el destino indicado por Railway; agrega también los registros de verificación exactos. El CNAME `_acme-challenge` debe quedar **DNS only** (nube gris).
4. Conserva los registros existentes del apex y de verificación, salvo que Railway pida expresamente cambiarlos. Activa Universal SSL y usa **Full (strict)**; el origen también debe presentar un certificado válido.
5. Configura el servicio o gateway para servir el Frontend, hacer fallback de rutas SPA y enviar `/api` al Backend en el mismo origen, conservando el `Host` original de forma confiable.
6. Cuando Railway confirme el dominio y TLS/DNS estén activos, prueba `https://<access_slug>.bionexus.app/dashboard`.

El apex `bionexus.app`, `www.bionexus.app` y `*.bionexus.app` son configuraciones distintas; `www` no es necesario para los laboratorios. El plan de Railway puede limitar el número de dominios personalizados por servicio; verifica el límite actual antes de añadir el wildcard junto al apex.

Referencias: [dominios personalizados y wildcard en Railway](https://docs.railway.com/networking/domains/working-with-domains) y [registros wildcard en Cloudflare](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/).
