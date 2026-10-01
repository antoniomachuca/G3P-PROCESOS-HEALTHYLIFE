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

## Estado del código

El Sprint 1 pide 1 o 2 historias de extremo a extremo, desplegables con Docker. Aún no hay aplicación en el repositorio: el primer incremento se implementa a partir de las historias que el equipo meta en el sprint (las de consulta, HU-01 y HU-02, no dependen de los demás módulos).
