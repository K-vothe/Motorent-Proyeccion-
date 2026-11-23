# Motorent-Proyeccion- (MVP Completo)

Plataforma web **Peer-to-Peer (P2P)** de alquiler de motocicletas desarrollada como **MVP sólido de punta a punta** (Fases 1 a 13), con base de datos PostgreSQL 18 aislada, verificación de identidad por roles, ciclo completo de renta con contratos SHA-256, actas fotográficas `PICKUP`/`RETURN`, reseñas bidireccionales doble ciego, panel administrativo y diseño accesible WCAG 2.2 AA con tema claro/oscuro Material Design 3.

---

## Arquitectura del Proyecto

- **Backend (`backend/`)**: Node.js + Express 5 + TypeScript + Prisma 7 + PostgreSQL 18 bajo arquitectura limpia en 4 capas (`routes → controllers → services → repositories`) con inyección de dependencias.
- **Frontend (`frontend/`)**: React 19 + TypeScript + Vite 8 + React Router 7, variables semánticas Material Design 3 (claro/oscuro), accesibilidad WCAG 2.2 AA y transiciones GPU a 60 fps (`transform`/`opacity`).
- **Base de datos aislada**: Cluster PostgreSQL 18 local en `localhost:5433` (`motorent_trabajo`), gestionado desde `backend/scripts/db-local.mjs` sin interferir con otras instancias del puerto `5432`.

---

## Funcionalidades Principales (Fases 1 a 13)

1. **Identidad y Verificación por Rol (`USER`, `RENTER`, `OWNER`, `DUAL`, `ADMIN`)**: formularios guiados para arrendatarios y propietarios, middleware RBAC en backend y `RoleRoute` en frontend.
2. **Catálogo y Galería de Motocicletas**: tarjetas compactas con sello *Verificada*, filtros desplegables, búsqueda por cercanía de cilindraje (`cc`), paginación configurable y carrusel giratorio de 8 fotos alimentado por fotos del propietario e inspecciones de devolución.
3. **Ciclo Completo de Renta en Vivo**:
   - Solicitud (`PENDING`) con validación de solapamientos y bloqueo por reseña obligatoria pendiente.
   - Lectura y firma digital de cláusulas (`RentalClause` inmutable + `Contract.documentHash` SHA-256).
   - Registro de pago (`PAID` → moto `RESERVED`), acta de entrega `PICKUP` (`ACTIVE` → moto `RENTED`) y acta de devolución `RETURN` (`COMPLETED` → actualiza `Moto.KM`, galería y libera moto a `AVAILABLE`).
   - Cancelación y reporte de incidentes (`ACCIDENT`, `THEFT`, `DISAPPEARANCE`).
4. **Reputación y Reseñas Doble Ciego**: evaluación mutua post-renta oculta hasta que ambas partes voten o transcurran 30 minutos, más perfil público `/usuario/:id`.
5. **Panel Administrativo (`ADMIN`)**: métricas globales en vivo, visor privado de documentos con protección anti Path Traversal, aprobación/gestión de motos, directorio de usuarios y alertas de reseñas bajas (`≤ 3★`).
6. **Experiencia UX/UI y Transiciones MD3**: menú móvil accesible (drawer), skeletons shimmer, `EmptyState`, toasts `aria-live="polite"`, cambio de perfil dual exclusivo desde el menú del avatar con confirmación previa y animaciones suaves para inicio de sesión, cambio de perfil y cierre de sesión (con soporte `prefers-reduced-motion`).

---

## Arranque Rápido Local

### 1. Preparar base de datos aislada + Seed idempotente (1 paso en Windows PowerShell)
```powershell
.\iniciar-motorent-mvp.ps1
```
*(O manualmente desde `backend/`: `npm run db:start`, `npm run db:sync`, `npm run db:seed`.)*

### 2. Levantar Backend y Frontend
```powershell
# Terminal 1 — Backend (http://localhost:3000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

### 3. Ejecutar Pruebas y Validaciones (149 / 149 en verde)
```powershell
# Backend: TypeScript (0 errores) + 79 pruebas unitarias + 6 flujos E2E en PostgreSQL
cd backend
npm run typecheck
npm test
npm run test:e2e

# Frontend: Build producción + ESLint (0 errores) + 64 pruebas unitarias
cd frontend
npm run build
npm run lint
npm test
```

---

## Cuentas Demo Incluidas en el Seed
Contraseña común para todas las cuentas: `MotoRent2026*`

| Rol | Correo | Escenario incluido |
|---|---|---|
| **ADMIN** | `admin@motorent.co` | Panel administrativo completo, KPIs, visor privado y moderación. |
| **DUAL** | `diego.dual@motorent.co` | Perfiles `RENTER` + `OWNER` aprobados para probar cambio dual animado desde el avatar. |
| **OWNER** | `carlos.owner@motorent.co` / `laura.owner@motorent.co` | Motos disponibles (155–895 cc) + 1 moto en `PENDING_APPROVAL`. |
| **RENTER** | `mateo.renter@motorent.co` | Rentas `ACTIVE` y `COMPLETED` con reseñas mutuas. |
| **USER (Pendiente)** | `sofia.pendiente@motorent.co` | Solicitud `PENDING` con archivos de muestra para el visor privado ADMIN. |
