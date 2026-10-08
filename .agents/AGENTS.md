# Normativa del agente — Healthy Life, Equipo 3

Este archivo es la normativa obligatoria para cualquier agente que construya o modifique este repositorio. Si una instrucción suelta contradice este documento, manda este documento. Si Jira y un fichero local discrepan, manda Jira.

## 1. Qué estamos construyendo

Healthy Life es una sola plataforma de salud y bienestar de la asignatura Procesos de Desarrollo de Software (URJC). No es un conjunto de aplicaciones independientes. Este repositorio es el **Equipo 3, módulo E3: eventos y actividades deportivas**.

Somos el motor transaccional de creación, calendarización, búsqueda y reserva de plazas en eventos deportivos y sesiones presenciales. El alcance de partida es:

- Consulta del catálogo de eventos.
- Búsqueda por ubicación y categoría.
- Inscripción en actividades.
- Gestión de plazas disponibles.
- Recordatorios y notificaciones.

No implementamos cuentas, hábitos, comunidad, rutinas ni nutrición. Esos módulos son de otros equipos. Nos integramos con ellos mediante identificadores opacos y el contrato de la sección 5.

Equipo: IvoDev14, nevillegil, alonsoo-cmd, sergiomadrz, saraguillenmtz, dianalopezlozano, antoniomachuca.

Repositorio: `https://github.com/antoniomachuca/EJERCICIOS-GRUPO-PROCESOS`

Jira: proyecto **G3P**, tablero **34**, sitio `https://ivohagmartinez-1789992099071.atlassian.net`

Backlog: `https://ivohagmartinez-1789992099071.atlassian.net/jira/software/projects/G3P/boards/34/backlog`

## 2. Fuentes de verdad

1. La issue de Jira en curso (narrativa, criterios de aceptación, puntos, prioridad).
2. Este archivo, `.agents/AGENTS.md`.
3. La identidad visual de la URJC: [URJC Brand Guide 2015](https://www.behance.net/gallery/26678885/URJC-Brand-Guide-2015). El PDF de urjc.es no es la referencia.
4. El enunciado `.agents/Practica1_Sprint1 v1 (1).pdf`.
5. `contracts/eventos.ejemplo.json`, que es el mock que los demás equipos pueden programar contra nosotros.

`backlog_G3P_Jira.csv` es una foto exportada. No se edita a mano y no gana a Jira.

## 3. Stack obligatorio

El stack es el acordado para que los módulos de la clase encajen. No se sustituye ni se amplía “porque queda mejor”.

| Capa | Elección | Límite |
| --- | --- | --- |
| Interfaz | React + TypeScript + Vite | Componentes funcionales. Sin Next.js, sin otro framework de UI. |
| API | Node.js + TypeScript | Misma lengua que la interfaz. Lee el JSON y, más adelante, SQLite. |
| Primera historia | Un JSON leído por la API | Solo consulta. El fichero de trabajo será `data/eventos.json`, con la forma de `contracts/eventos.ejemplo.json`. |
| Datos posteriores | SQLite en un archivo | Persistencia real. Sin servidor de base de datos: ni Postgres, ni MySQL, ni MongoDB, ni Supabase. |
| Identidad visual | Manual URJC | Sección 4. |
| Entrega del Sprint 1 | Docker | El primer incremento funcional se arranca con Docker, como pide el enunciado. |

Estructura prevista, y solo se crean carpetas cuando una historia de Jira las necesita:

```text
apps/web/          React + TypeScript + Vite
apps/api/          API Node + TypeScript
data/eventos.json  semilla de solo lectura de la primera historia
data/*.sqlite      base local, no se versiona
contracts/         contrato público para el resto de equipos
```

La API escucha en el puerto **3001**. Vite en el **5173**. El prefijo público es **`/api/v1`**. La interfaz habla con la API; no importa el JSON de semilla en el navegador.

Hasta que una historia exija escritura (alta, inscripción, cancelación), el almacén es el JSON. SQLite entra con la primera historia que persista cambios. El cambio de almacén va detrás de un puerto `EventStore`: `JsonEventStore` primero, `SqliteEventStore` después. Las rutas HTTP no se reescriben al cambiar el almacén.

## 4. Identidad visual URJC

La interfaz sigue la guía [URJC Brand Guide 2015](https://www.behance.net/gallery/26678885/URJC-Brand-Guide-2015) (Nabil Boufada Gonçalves), que es la adaptación digital del manual de identidad visual corporativa. Si una lámina de esa galería concreta un detalle, manda la lámina.

Colores medidos en la banda roja de la lámina «I - La marca URJC: construcción»:

| Token | Valor | Uso |
| --- | --- | --- |
| `--urjc-red` | `#E30420` | Acento, botones primarios, enlaces, barra superior. RGB 227, 4, 32 |
| `--urjc-white` | `#FFFFFF` | Fondo de página y texto sobre el rojo |
| `--urjc-black` | `#000000` | Texto principal, franja secundaria y pie |

Tipografía de esa guía: **Gill Sans**.

- Pila CSS: `Gill Sans, "Gill Sans MT", Calibri, Arial, sans-serif`.
- No se suben ficheros de la fuente al repositorio.
- El logotipo no se reescribe con la fuente. Es la marca compuesta: la U coronada en rojo y negro más el texto «Universidad Rey Juan Carlos».

La lámina de construcción obliga a esto:

- Se respeta la proporción de la marca y el margen del área autónoma, para que otros elementos no le quiten visibilidad.
- En pantalla, el logotipo horizontal no baja de **60 px** de ancho. El mínimo de impresión de la guía es 20 mm.
- No se recolorea, no se deforma, no se rota y no se coloca sobre una foto sin ese margen.
- No se inventa un escudo distinto. El símbolo es la U coronada de la guía.

Aplicación en la interfaz:

- Fondo blanco, texto negro, acento `#E30420`. El botón primario lleva texto blanco sobre ese rojo.
- La cabecera puede seguir el esquema de la propia guía: barra roja, franja negra, contenido en blanco.
- El rojo no es color de párrafo largo. Sirve para títulos de sección, enlaces subrayados y la acción principal.
- La UI está en español.
- No se añaden paletas paralelas (azul, morados, gradientes). Un gris solo se admite para bordes y texto secundario, sin competir con el rojo.

Los tokens viven en un único CSS de variables. Los componentes no escriben el hex suelto.

## 5. Cohesión con el resto de equipos

Healthy Life se reparte así. Cada identificador ajeno es un string opaco: se guarda y se reenvía, no se interpreta.

| Equipo | Módulo | Relación con E3 |
| --- | --- | --- |
| E1 | Usuarios, acceso e identidad | Dueño de `userId`. Nosotros no registramos, no autenticamos y no guardamos contraseñas. |
| E2 | Hábitos y telemetría | Puede consultar asistencia a eventos. Nosotros no guardamos sueño, nutrición ni métricas de salud. |
| E3 | Eventos y actividades | Este repositorio. Dueños de `eventoId` e `inscripcionId`. |
| E4 | Comunidad | Puede asociar un evento a un grupo con `communityGroupId`. Nosotros no creamos grupos ni feed. |
| E5 | Planes y rutinas | Puede asociar una rutina con `routineId`. Nosotros no prescribimos entrenamientos. |
| E6 | Planes nutricionales | Sin dependencia. No modelamos alimentos ni alérgenos. |

Hasta que E1 publique su contrato real, la API acepta el usuario de la petición en la cabecera `X-User-Id`. Es un sustituto temporal, documentado, y se retira cuando E1 fije el mecanismo. No se inventa un login propio “mientras tanto”.

CORS en desarrollo admite los orígenes locales de los otros Vite. No se abre `*` junto con credenciales.

Fechas en ISO-8601 con offset (`2026-10-18T10:00:00+02:00`). Identificadores propios con prefijo: `evt_`, `ins_`.

### Vocabulario estable

`deporte`: `futbol`, `running`, `padel`, `natacion`, `yoga`, `ciclismo`.

`nivel`: `iniciacion`, `intermedio`, `competicion`.

`estado` del evento: `abierta`, `cancelada`, `finalizada`.

`estado` de la inscripción: `confirmada`, `en_espera`, `cancelada`, `asistida`, `no_presentado`.

Las claves JSON van en camelCase y sin tildes, como en `contracts/eventos.ejemplo.json`. Un campo nuevo que otro equipo deba leer se añade ahí en el mismo cambio que lo introduce la API. No se renombran claves ya publicadas.

## 6. Control de Jira

Sitio: `ivohagmartinez-1789992099071.atlassian.net`. Clave de proyecto: **G3P**. Tablero: **34**.

El agente usa el MCP oficial de Atlassian (`https://mcp.atlassian.com/v2/mcp`, servidor `atlassian` en `.cursor/mcp.json`). Con él lee la issue, la comenta y la mueve de columna. No fabrica claves `G3P-*`.

Antes de escribir código de producto:

1. Leer la issue en Jira y trabajar solo sus criterios de aceptación.
2. Si el MCP no está autenticado, parar y pedir el inicio de sesión de Atlassian. No seguir “a ojo” con el CSV.
3. Crear o usar la rama cuyo nombre contiene la clave (sección 7).
4. Mover la issue a **En progreso** al empezar y a **En revisión** al abrir el pull request.
5. **Hecho** solo cuando se cumple la Definition of Done y el delegado de Product Owner ha validado los criterios. El agente no se valida a sí mismo como PO.

Columnas del tablero: Por hacer, En progreso, En revisión, Hecho.

Estimación en Fibonacci, prioridad MoSCoW. El agente no reestima ni reordena el backlog por su cuenta.

Cada comentario de progreso en la issue incluye la clave, la rama y, cuando exista, la URL del pull request.

El Sprint 1 cierra con 1 o 2 historias de extremo a extremo, sencillas y sin depender de otros módulos. Las candidatas naturales son **HU-01** (catálogo) y **HU-02** (ficha), porque solo consultan datos. Cuáles entran al sprint lo decide el equipo en Jira; el agente implementa las que estén en el sprint activo, en ese orden.

## 7. Git, ramas y pull requests

`main` es la rama estable. No se hace commit directo a `main`.

Nombre de rama, el mismo que Jira usa al crearla desde la issue:

```text
feature/G3P-123-catalogo-actividades
fix/G3P-123-plazas-negativas
```

Una issue, una rama, un pull request. El título del PR y los commits empiezan por la clave: `G3P-123: …`.

### Formato obligatorio de commits (autolink con Jira)

Todo commit en el repositorio **debe** comenzar obligatoriamente por la clave de la tarea o historia en Jira (`G3P-<número>:`):

```text
G3P-123: Resumen imperativo y claro de la funcionalidad o corrección

[Opcional] Línea en blanco seguida de la explicación del porqué,
decisiones tomadas o detalles técnicos relevantes.
```

**Por qué es obligatorio:**
- **Autolink en GitHub**: GitHub tiene configurado el autolink reference oficial. Cualquier texto con el formato `G3P-<número>` (en commits, PRs o issues) se convierte automáticamente en un hipervínculo clicable directo a `https://ivohagmartinez-1789992099071.atlassian.net/browse/G3P-<número>`.
- **Trazabilidad en Jira**: Permite que Jira vincule el commit directamente en el panel *Development* de la issue correspondiente, manteniendo al equipo alineado.

**Ejemplos correctos:**
- `G3P-36: Añadir UI de reserva y contador de plazas`
- `G3P-37: Integrar catálogo con eventos de SQLite`
- `G3P-38: Preparar demo de reservas con Docker`
- `G3P-39: Configurar pipeline de CI con GitHub Actions`

**Ejemplos incorrectos (prohibidos):**
- ❌ `feat: añadir botón` (falta la clave `G3P-XX:`)
- ❌ `G3P36: arreglado` (falta el guion en la clave)
- ❌ `cambios varios` o `fix bug` (sin clave ni trazabilidad)


Crear la rama desde el panel Development de la issue deja el desarrollo enlazado en Jira. Eso solo aparece cuando el sitio tiene instalada la app **GitHub for Jira** y este repositorio está concedido. El alta de esa app la hace un administrador del sitio Jira (el dueño del site es la cuenta de Ivo); un agente no puede completar el OAuth de Atlassian en nombre del equipo. Pasos:

1. En Jira: Configuración → Apps → GitHub → Connect GitHub.
2. Instalar **GitHub for Jira** sobre la cuenta `antoniomachuca`.
3. Conceder acceso solo a `EJERCICIOS-GRUPO-PROCESOS`.
4. En la issue: Development → Create branch, eligiendo este repositorio y `main`.

Si el botón aún no existe, la rama se crea en local con el formato de arriba. No se inventa otro formato.

Definition of Done (Anexo B del enunciado), toda ella:

- Pull request revisado por, al menos, otro miembro del equipo.
- Criterios de aceptación de la issue comprobados.
- README o contrato actualizados si la historia cambia cómo se ejecuta o qué datos se exponen.
- Sin secretos ni credenciales en el código ni en el historial.
- Pruebas en verde en CI cuando existan (obligatorias desde el Sprint 2; en el Sprint 1, al menos una prueba del comportamiento de la historia si el cambio es de lógica).

El agente no hace commit ni push salvo que se lo pidan. No hace force-push a `main`.

## 8. Cómo implementar una historia

El papel del agente como ingeniero está en `.agents/SKILLS.md`. Si contradice este archivo, manda este archivo.

- La pantalla cumple los criterios en formato Dado/Cuando/Entonces de la issue, no una versión recortada.
- Los eventos con `estado` distinto de `abierta`, o con `fin` ya pasado, no salen en el catálogo activo.
- Las plazas no bajan de cero. Dos reservas concurrentes de la última plaza no pueden dejar el aforo en negativo: la operación de escritura, cuando exista, es transaccional en SQLite.
- Mensajes de interfaz en español, con el texto que fija la historia cuando lo fija (por ejemplo, “No hay eventos disponibles en esta categoría actualmente”).
- Estados vacíos, de error de red y de lista vacía se diseñan con la misma identidad visual. No se deja la pantalla en blanco.
- No se añaden dependencias que dupliquen lo que ya cubre el stack (otro router exótico, otra capa de estado global, un ORM pesado) salvo que la historia no se pueda cerrar sin ellas.

## 9. Secretos y datos

- `.env` no se versiona. Si hace falta configuración, se versiona `.env.example` sin valores reales.
- La base SQLite, sus WAL y los `node_modules` no se versionan.
- No se suben tokens de Jira, de GitHub ni de Atlassian.
- Los usuarios de ejemplo del JSON son ficticios (`usr_mock_001`). No se usan datos personales de compañeros.
