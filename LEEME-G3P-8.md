# G3P-8 · HU-01 Catálogo general de actividades deportivas

## Qué copiar a tu repo (rama feature/G3P-8-catalogo-actividades)
- apps/api/            API sin dependencias (Node 22.18+, igual que la rama G3P-23)
- apps/web/            interfaz React + Vite (listado de eventos)
- data/eventos.json    semilla con 10 eventos (7 activos y 3 que deben ocultarse)
- contracts/eventos.ejemplo.json   mismo contrato + campo imagenUrl
- docker-compose.yml

## Ejecutar
    cd apps/api && npm start        # http://127.0.0.1:3001/api/v1/events
    cd apps/web && npm install && npm run dev    # http://localhost:5173
    cd apps/api && npm test         # 12 pruebas

O con Docker: docker compose up --build  (web en http://localhost:5173)

## Imágenes
`imagenUrl` de cada evento apunta a apps/web/public/img/eventos/<deporte>.jpg.
Los .jpg incluidos son marcadores grises: sustitúyelos por fotos reales con el
mismo nombre, o pon otra ruta/URL en imagenUrl dentro de data/eventos.json.
Si la imagen falta o no carga, la tarjeta muestra un hueco gris.

## Párrafo para el README (Definition of Done)
HU-01 (G3P-8): `GET /api/v1/events` devuelve `{ "eventos": [...] }` solo con eventos
`abierta` cuyo `fin` no ha pasado, ordenados por `inicio`. Lee `data/eventos.json`.
El contrato añade `imagenUrl` (ruta o URL de la imagen, puede ser null).
Arranque: `cd apps/api && npm start` y `cd apps/web && npm install && npm run dev`.

## Al hacer merge con la rama G3P-23 (reservas) habrá conflictos esperables en
- apps/api/package.json (unir los scripts `test`)
- apps/api/src/domain/modelo.ts (quedarse con el suyo y añadir `imagenUrl`)
- apps/api/src/http/server.ts (llamar a manejarCatalogo para GET /api/v1/events
  y a manejarReservas para POST /api/v1/events/{id}/reservations)
- data/eventos.json y contracts/eventos.ejemplo.json (unir eventos y claves)
