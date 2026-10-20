# LOG de cambios de opinión

Registro de los cambios de criterio del Equipo 3 a partir del feedback de los compañeros
(refinamiento del backlog, sesiones de Team Topologies y revisión entre equipos).

## 2026-10-20 — La HU-17 se divide en HU-17 y HU-21

- **Origen:** refinamiento del Product Backlog del Sprint 2 (Práctica II, §3.2), tras
  contrastar el alcance con los compañeros.
- **Decisión anterior (G3P-28):** un único panel «Mis Actividades» con dos secciones,
  «Próximas actividades» e «Historial completado», que mezclaba reservas confirmadas, en
  espera y actividades pasadas.
- **Decisión nueva:**
  - **HU-17 (G3P-28):** se queda solo con las actividades futuras confirmadas, ordenadas
    cronológicamente, con estado vacío que enlaza al catálogo y tarjeta que abre la ficha
    del evento. Sigue en el Sprint 2 con 2 puntos.
  - **HU-21 (G3P-46):** recoge el histórico y registro de actividades pasadas, con su
    propia estimación (2 puntos) y criterios de aceptación independientes.
- **Motivo del cambio:** la historia original tenía dos comportamientos con ciclo de vida
  distinto (lo que está por venir y lo ya celebrado). Al separarlos, cada historia se puede
  implementar, probar y validar por separado, y el panel de próximas actividades no arrastra
  la lógica del histórico.
- **Impacto:** dos issues en Jira dentro de la épica EP-04 (G3P-11), cada una con su rama
  `feature/G3P-<id>-...`. Ambas se estiman y priorizan de forma independiente en el backlog.
- **Pendiente:** HU-21 está creada pero aún sin descripción ni criterios de aceptación
  detallados, y sin asignar al Sprint 2.
