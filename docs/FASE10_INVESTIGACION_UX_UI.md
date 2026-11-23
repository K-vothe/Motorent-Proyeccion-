# Fase 10 — Investigación y Auditoría UX/UI del Frontend (Solo Diagnóstico)

## 1. Estándares Estudiados
- **Nielsen Norman Group (10 Heurísticas):** Skeleton screens con shimmer direccional para cargas de 2–10 s, estados vacíos accionables sin callejones sin salida, y toasts reservados únicamente para confirmaciones no críticas (errores de formulario siempre inline).
- **W3C WCAG 2.2 Nivel AA:** Contraste ≥ 4.5:1 (texto) y ≥ 3:1 (controles), `:focus-visible` (2.4.7), *Focus Not Obscured* con `scroll-padding-top` ante navbar sticky (2.4.11), targets táctiles ≥ 24×24 px (2.5.8, objetivo 44 px en móvil) y `@media (prefers-reduced-motion: reduce)` (2.3.3).
- **Marketplaces P2P (Airbnb / Turo):** Señales de confianza visibles (verificación, contrato SHA-256, inspección PICKUP/RETURN), jerarquía escaneable en tarjetas y navegación móvil sin fricción.

## 2. Hallazgos Priorizados para Fase 11
| ID | Prioridad | Archivo | Mejora planificada |
|---|---|---|---|
| **H1** | Crítica | `Navbar.tsx` / `Navbar.css` | Menú hamburguesa y drawer móvil accesible en `<= 768px` |
| **H2** | Alta | `Home.tsx` / `Motos.tsx` | Reemplazar emojis residuales por SVG, conectar categorías vía `?categoria=` y reforzar señales de confianza |
| **H3** | Alta | `Motos.tsx` / `Rentas.tsx` | Componente reutilizable `SkeletonCard` con shimmer suave |
| **H4** | Alta | `index.css` / `App.tsx` | `:focus-visible`, `scroll-padding-top`, `Skip Link` y `prefers-reduced-motion` |
| **H5** | Media | Nuevo `Toast` + `EmptyState` | Confirmaciones `aria-live="polite"` y estados vacíos con CTA claro |
| **H6** | Media | `MotoCard.tsx` | Sello discreto de licencia (`A1`/`A2`) y verificación |
| **H7** | Media | `Home.css` / `rentas.css` | Limpieza de estilos legados de navbars eliminadas + contraste dark mode |
