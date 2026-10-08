# Healthy Life — Equipo 3 (E3)

Módulo de **eventos y actividades deportivas** de Healthy Life, la plataforma de salud y bienestar que construye la clase de Procesos de Desarrollo de Software (Universidad Rey Juan Carlos).

Este equipo es el dueño del catálogo, la ficha, la búsqueda y la reserva de plazas. El resto de módulos (usuarios, hábitos, comunidad, rutinas y nutrición) viven en los repositorios de los otros equipos y se conectan por el contrato de `contracts/`.

La normativa para construir el código está en [`.agents/AGENTS.md`](.agents/AGENTS.md). El enunciado de la práctica y la plantilla de pull request están en la misma carpeta. Cualquier cambio de producto tiene que salir de una issue del proyecto Jira **G3P**.

## Equipo

- IvoDev14
- nevillegil
- alonsoo-cmd
- sergiomadrz
- saraguillenmtz
- dianalopezlozano
- antoniomachuca

## Stack

| Capa | Elección |
| --- | --- |
| Interfaz | React + TypeScript + Vite |
| API | Node.js + TypeScript, prefijo `/api/v1`, puerto 3001 |
| Primera historia | JSON de solo lectura (`data/eventos.json`, forma de `contracts/eventos.ejemplo.json`) |
| Persistencia posterior | SQLite en un archivo, sin servidor de base de datos |
| Identidad visual | [URJC Brand Guide 2015](https://www.behance.net/gallery/26678885/URJC-Brand-Guide-2015): rojo `#E30420`, blanco `#FFFFFF`, negro `#000000`, tipografía Gill Sans |

## Jira

- Sitio: https://ivohagmartinez-1789992099071.atlassian.net
- Backlog: https://ivohagmartinez-1789992099071.atlassian.net/jira/software/projects/G3P/boards/34/backlog
- Una issue, una rama: `feature/G3P-123-descripcion-corta`
- El título del pull request y los commits empiezan por `G3P-123`
- En GitHub, `G3P-123` enlaza solo a la issue de Jira

El agente controla el tablero con el MCP oficial de Atlassian, configurado en `.cursor/mcp.json`. La primera vez hay que iniciar sesión en Atlassian cuando Cursor lo pida.

Para que Jira muestre **Create branch** dentro de la issue, un administrador del sitio tiene que conectar este repositorio:

1. En Jira, Configuración → Apps → GitHub → Connect GitHub.
2. Instalar GitHub for Jira en la cuenta `antoniomachuca`.
3. Conceder acceso a `EJERCICIOS-GRUPO-PROCESOS`.

Hasta que eso esté hecho, las ramas se crean en local con la clave de la issue en el nombre. El autolink de GitHub ya está activo.

## Contrato con los otros equipos

`contracts/eventos.ejemplo.json` es el mock de intercambio. Los identificadores de usuario (`userId`), grupo (`communityGroupId`) y rutina (`routineId`) son strings opacos de E1, E4 y E5. Este módulo no implementa sus pantallas.

## Datos

`data/eventos.json` es la semilla, con la misma forma que `contracts/eventos.ejemplo.json`. El contrato público sigue llamando al aforo `aforoMaximo` y `plazasDisponibles`.

La migración de G3P-33 crea la base SQLite `data/e3.sqlite` (no se versiona). En las tablas los campos de aforo se llaman `capacidad` y `plazas_libres`. El estado del evento es `abierta`, `cancelada` o `finalizada`. El estado de la reserva es `confirmada`, `en_espera`, `cancelada`, `asistida` o `no_presentado`.

Desde `apps/api`, con Node 22.18 o superior (TypeScript se ejecuta directamente, sin dependencias):

```bash
npm test
npm run migrate
```

`npm test` comprueba el esquema, la reserva y la carrera por la última plaza: de varias peticiones simultáneas solo una queda confirmada y el resto pasa a lista de espera, con el aforo en cero. `npm run migrate` aplica la migración y carga la semilla. `npm start` levanta la API en el puerto 3001.

## Demo web y reserva

Requisitos: Docker Desktop con Docker Compose. Desde la raíz del repositorio:

```bash
docker compose up --build
```

Abre <http://localhost:5173>. El catálogo consulta `GET /api/v1/events` en la API y muestra las plazas actuales. Entra en una actividad o pulsa **Reservar plaza** en su tarjeta. La demo usa el usuario temporal `usr_mock_010`; una reserva disponible se confirma y actualiza el contador. Si otra petición ocupa la última plaza antes, la respuesta puede entrar en lista de espera. Un `409 Conflict` se muestra como conflicto y actualiza el catálogo.

La base SQLite se conserva en `data/e3.sqlite` gracias al volumen local `./data`. Para detener la demo, pulsa `Ctrl+C` en la terminal. Para reiniciarla, vuelve a ejecutar `docker compose up`.

Para ejecutar la aplicación sin Docker, inicia la API desde `apps/api` con `npm start` y, en otra terminal, instala las dependencias desde `apps/web` con `npm install` y ejecuta `npm run dev`. Vite estará disponible en <http://localhost:5173> y reenviará las llamadas `/api` a la API local.

Reservar una plaza:

```bash
curl -X POST http://127.0.0.1:3001/api/v1/events/evt_001/reservations -H 'X-User-Id: usr_mock_010'
```

Si queda plaza, la respuesta es `201` con `estado` `confirmada` y `plazasDisponibles` una unidad menor. Si dos peticiones compiten por la última plaza, una queda `confirmada` y la otra `en_espera`, y el aforo no baja de cero. El usuario llega en la cabecera `X-User-Id`. El ejemplo de esa respuesta está en `contracts/eventos.ejemplo.json` (`ejemploReserva`).

## Estado del código

G3P-33 deja el modelo en SQLite y G3P-34 el `POST /api/v1/events/{id}/reservations` con la transacción que evita el sobrecupo. El catálogo y la reserva web consumen esa API; la demo completa se levanta con Docker Compose.
