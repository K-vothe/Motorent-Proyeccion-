# REGISTRO DE CAMBIOS Y GUÍA PARA EL EQUIPO — MOTORENT

**Proyecto base comparado:** `MOTORENT-PROYECTO-` (rama `feat/formularios-ui`, commit `d05ece5`)  
**Copia de trabajo:** `C:\Users\haine\OneDrive\Desktop\MOTORENT-COPIA-TRABAJO`  
**Metodología:** Implementación incremental por fases (con documentación comparativa y pruebas verificadas en cada fase).

---

# FASE 1: Lógica de Formularios de Verificación (`VerificarRenter` y `VerificarOwner`) + Seguridad de Rutas

## 1. Resumen Ejecutivo
En el proyecto principal existía únicamente el diseño visual (HTML/CSS) de los formularios `VerificarRenter` y `VerificarOwner`, sin estados, sin validaciones y sin retroalimentación al cargar archivos.

En esta **Fase 1** se implementó toda la lógica real de ambos formularios manteniendo un código **limpio, modular y fácil de leer**, alineado exactamente con los modelos `Renter` y `Owner` de `backend/prisma/schema.prisma`.

---

## 2. Comparativa Detallada: Proyecto Principal vs Copia de Trabajo

| Archivo | Estado en Proyecto Principal (`d05ece5`) | Cambio en Copia de Trabajo (Fase 1) | Por qué se hizo este cambio |
| :--- | :--- | :--- | :--- |
| `frontend/src/utils/verificacion.utils.ts` | **No existía** | **CREADO** — Contiene constantes (límite 5 MB, formatos permitidos), validadores puros (`validarNumeroCedula`, `validarNumeroLicencia`, `validarArchivo`, `validarPasoIdentidad`, `validarPasoLicencia`, `validarPasoDomicilio`) y constructores de `FormData`. | Evita repetir la misma lógica en dos pantallas, hace el código más fácil de leer y permite ejecutar pruebas unitarias automáticas sin navegador. |
| `frontend/src/services/verificacion.service.ts` | **No existía** | **CREADO** — Servicio encargado de enviar `FormData` al backend con el header `Authorization: Bearer <token>`. Incluye bandera temporal `USAR_SIMULACION_LOCAL = true` mientras se construyen los endpoints en el backend. | Separa la comunicación HTTP de los componentes visuales. Cuando el backend esté listo, solo se cambia una variable (`false`) sin tocar los formularios. |
| `frontend/src/components/DocumentoUploadBox.tsx` + `.css` | **No existía** | **CREADO** — Componente reutilizable para las cajas de subida de documentos e imágenes. | Reemplaza 10 bloques HTML casi idénticos. Agrega vista previa de foto (miniatura), insignia para PDF, nombre y tamaño del archivo, botones **Cambiar / Quitar** y estado visual de error. |
| `frontend/src/pages/Renter/VerificarRenter.tsx` | Solo manejaba `step` (`1`, `2`, `3`). Los inputs no guardaban datos, "Continuar" avanzaba vacío y "Enviar solicitud" no hacía nada. | **MODIFICADO** — Inputs controlados, validación obligatoria antes de avanzar de paso, filtro numérico en cédula, carga/preview de 6 documentos, liberación de memoria (`URL.revokeObjectURL`), estado de carga y tarjeta final de confirmación. | Convierte la maqueta en un formulario funcional, seguro y con buena experiencia de usuario. |
| `frontend/src/pages/Renter/VerificarRenter.css` | Solo estilos base de tarjeta, pasos e inputs. | **MODIFICADO** — Se agregaron estilos para banner de error, inputs con borde rojo, botones deshabilitados y pantalla de confirmación de solicitud enviada. | Mantiene coherencia visual con la paleta oficial (`#0F2537` y `#FF6A3D`) en los nuevos estados. |
| `frontend/src/pages/Owner/VerificarOwner.tsx` | Solo manejaba `step` (`1`, `2`). Sin estados, sin validaciones y sin acción al enviar. | **MODIFICADO** — Misma arquitectura clara que `VerificarRenter`, adaptada al flujo de 2 pasos del propietario (cédula + 3 fotos + comprobante de domicilio). | Garantiza consistencia total entre ambos formularios y reduce la curva de aprendizaje para el equipo. |
| `frontend/src/pages/Owner/VerificarOwner.css` | Solo estilos base. | **MODIFICADO** — Estilos de error, validación, botón deshabilitado y tarjeta de confirmación. | Coherencia visual con el resto de la aplicación. |
| `frontend/src/App.tsx` | `/verificar-renter` y `/verificar-owner` eran rutas **públicas** (fuera de `<ProtectedRoute />`). | **MODIFICADO** — Ambas rutas se movieron **dentro de `<ProtectedRoute />`**. | Para verificar a un usuario se necesita su sesión (`token` / `idUser`). Evita que alguien sin cuenta llene 3 pasos y falle al final. |
| `frontend/tests/verificacion.utils.test.ts` | **No existía** | **CREADO** — Suite de **12 pruebas unitarias** nativas con `node:test` y `node:assert/strict`. | Comprueba automáticamente todas las reglas de validación de cédula, licencia, formatos, pesos de archivo y pasos del formulario. |

---

## 3. Cómo Entender la Nueva Estructura (Guía Rápida para el Equipo)

```text
VerificarRenter.tsx / VerificarOwner.tsx   (Pantallas: muestran los pasos y llaman a las utilidades)
        │
        ├──► DocumentoUploadBox.tsx        (Caja visual reutilizable para subir y previsualizar archivos)
        ├──► verificacion.utils.ts         (Reglas de validación y armado de FormData)
        └──► verificacion.service.ts       (Envío HTTP al backend o simulación temporal controlada)
```

### Detalles técnicos cuidados en el código:
1. **Prevención de fugas de memoria:** Cada vez que el usuario sube, reemplaza o quita una foto (o sale de la pantalla), se ejecuta `URL.revokeObjectURL(...)` para liberar la memoria de la vista previa.
2. **Bug clásico de `<input type="file">` resuelto:** En `DocumentoUploadBox.tsx` se limpia `evento.target.value = ""` tras leer el archivo, permitiendo que el usuario pueda quitar una foto y volver a elegir exactamente el mismo archivo sin que el navegador lo ignore.
3. **Cumplimiento estricto de React 19:** Se corrigió la actualización de `useRef` dentro de `useEffect` para cumplir la regla `react-hooks/refs` de ESLint.

---

## 4. Contrato `FormData` Listo para el Equipo de Backend (Fase Posterior)

Cuando el backend cree los endpoints de verificación con `multer` (o el gestor de subida que elijan), el frontend ya envía exactamente estos campos (alineados con `schema.prisma`):

### `POST /api/renter/verificar` (`multipart/form-data`, Header: `Authorization: Bearer <token>`)
- `cedulaNumero` (texto, 6 a 12 dígitos)
- `cedulaFront` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `cedulaBack` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `photo` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `licenseNumber` (texto, 6 a 15 caracteres alfanuméricos)
- `licenseCategory` (`"A1"` o `"A2"`)
- `licenseFront` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `licenseBack` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `bill` (archivo imagen o PDF, máx. 5 MB)

### `POST /api/owner/verificar` (`multipart/form-data`, Header: `Authorization: Bearer <token>`)
- `cedulaNumero` (texto, 6 a 12 dígitos)
- `cedulaFront` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `cedulaBack` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `photo` (archivo imagen: PNG/JPG/WEBP, máx. 5 MB)
- `bill` (archivo imagen o PDF, máx. 5 MB)

> **Para activar la conexión real en el futuro:** Abrir `frontend/src/services/verificacion.service.ts` y cambiar `USAR_SIMULACION_LOCAL = true` por `false`.

---

## 5. Resultados de Pruebas Verificadas (Fase 1)

| Verificación | Comando ejecutado | Resultado |
| :--- | :--- | :--- |
| **Pruebas unitarias de validación** | `node --test frontend/tests/verificacion.utils.test.ts` | **12/12 Aprobadas** (`pass 12, fail 0`, 132 ms) |
| **Compilación TypeScript + Vite** | `npm --prefix frontend run build` | **Exitosa** (`58 modules transformed`, 185 ms, 0 errores) |
| **ESLint en archivos de Fase 1** | `npm --prefix frontend run lint` | **0 errores y 0 advertencias** en todos los archivos nuevos y modificados |

---

## 6. Sugerencias y Hallazgos Importantes para el Equipo

1. **Bug detectado en `frontend/src/pages/Register/Register.tsx` (Línea 120):**
   - Actualmente hace `localStorage.setItem("token", data.token)`, pero el backend `POST /auth/register` no devuelve `token` (solo devuelve `{ ok: true, data: newUser }`). Eso guarda `"undefined"` en `localStorage` y deja al usuario sin sesión real.
   - *Sugerencia:* Redirigir al `/login` con mensaje de *"Cuenta creada, inicia sesión"* (o hacer que el backend devuelva el JWT en el registro). Podemos corregirlo en la siguiente fase.
2. **Error de ESLint preexistente en `frontend/src/pages/Motos/Motos.tsx` (Línea 79):**
   - Usa `(m: any)` lo que genera 1 error de `@typescript-eslint/no-explicit-any`. Conviene tiparlo con la interfaz `Moto`.
3. **Desfase de tipos en el Backend (`npm run typecheck`):**
   - Existen errores de TypeScript en `documento.repository.ts`, `renta.repository.ts` y `seedClauses.ts` por cambios recientes en `schema.prisma` (migración de `Client` a `Renter`). El equipo de backend debe regenerar/sincronizar Prisma antes de conectar nuevos endpoints.
4. **Decisión de negocio recomendada para `Owner`:**
   - Notamos que el nuevo modelo `Owner` en `schema.prisma` quitó los campos bancarios (`bankName`, `accountType`, `accountNumber`) y ahora solo solicita identidad y domicilio. Conviene confirmar con el equipo si los datos bancarios irán en una tabla separada o en el perfil después de ser aprobados.

---

# FASE 2: Dashboard Adaptativo por Roles (`USER`, `RENTER`, `OWNER`, Modo Dual y `ADMIN`) + Corrección de Sesión

## 1. Resumen Ejecutivo de Fase 2
En el proyecto principal, `/dashboard` mostraba una única vista estática que mezclaba estadísticas de cliente y propietario sin leer el rol real del usuario ni mostrar el estado de verificación de sus documentos. Además, `Register.tsx` guardaba `"undefined"` como token al registrarse y `Navbar.tsx` dejaba datos del usuario anterior al cerrar sesión.

En esta **Fase 2** se separó la lógica de roles en utilidades puras, se creó un servicio resiliente de carga de panel, se dividió el Dashboard en 4 vistas enfocadas por rol + selector dual, y se corrigió el flujo de registro y cierre de sesión.

---

## 2. Comparativa Detallada de Fase 2: Proyecto Principal vs Copia de Trabajo

| Archivo | Estado en Proyecto Principal (`d05ece5`) | Cambio en Copia de Trabajo (Fase 2) | Por qué se hizo este cambio |
| :--- | :--- | :--- | :--- |
| `frontend/src/utils/roles.utils.ts` | **No existía** | **CREADO** — Normaliza roles (`USER`, `RENTER`/`CLIENT`, `OWNER`, `ADMIN`), unifica estados (`APPROVED`/`VERIFIED`, `PENDING`, `REJECTED`, `NOT_STARTED`) y calcula el modo inicial y soporte de usuario dual. | Centraliza las reglas de roles en funciones puras fáciles de leer y probar con tests unitarios. |
| `frontend/src/services/dashboard.service.ts` | **No existía** | **CREADO** — Ejecuta `GET /auth/me` y `GET /dashboard` en paralelo con `Promise.allSettled`, sincroniza `localStorage.user` y detecta sesiones vencidas (`401`/`403`). | Garantiza que el Dashboard lea el rol actualizado desde PostgreSQL y no colapse si un endpoint falla. |
| `frontend/src/pages/Dashboard/components/DashboardUserView.tsx` | **No existía** | **CREADO** — Vista de onboarding para `USER` con tarjetas directas hacia `/verificar-renter` y `/verificar-owner`, badges de estado en tiempo real y motivos de rechazo si aplica. | Guía claramente al usuario recién registrado hacia su verificación. |
| `frontend/src/pages/Dashboard/components/DashboardRenterView.tsx` | **No existía** | **CREADO** — Vista enfocada en el Arrendatario: renta activa, viajes realizados, próxima entrega, accesos rápidos e invitación secundaria a convertirse en Propietario. | Muestra únicamente la información relevante para quien alquila. |
| `frontend/src/pages/Dashboard/components/DashboardOwnerView.tsx` | **No existía** | **CREADO** — Vista enfocada en el Propietario: motos publicadas, ganancias del mes (85% COP), banner de publicación e invitación secundaria a verificarse como Arrendatario. | Separa la operación financiera del anfitrión del resto de la app. |
| `frontend/src/pages/Dashboard/components/DashboardAdminView.tsx` | **No existía** | **CREADO** — Estructura base del panel administrativo para futuras colas de revisión (`Renter`, `Owner`, `Moto`) con aviso explícito de endpoints pendientes. | Deja lista la arquitectura visual sin simular aprobaciones inexistentes. |
| `frontend/src/pages/Dashboard/dashboard.tsx` + `dashboard.css` | Un solo bloque monolítico que mezclaba todas las métricas sin distinguir rol. Importaba `./Dashboard.css` (mayúscula inconsistente). | **MODIFICADO** — Orquestador limpio que muestra badge de rol, **Switch de Modo Dual** (`Arrendatario` / `Propietario`), barra temporal de vista previa solo en `npm run dev` (`import.meta.env.DEV`) y corrige import a `./dashboard.css`. | Permite al equipo probar las 5 vistas en desarrollo sin modificar la BD, y desaparece automáticamente en producción. |
| `frontend/src/pages/Register/Register.tsx` | Guardaba `localStorage.setItem("token", data.token)` generando `"undefined"` porque el backend no devuelve JWT en el registro. | **MODIFICADO** — Valida que exista un token real; si no viene token, redirige a `/login` con estado `{ registroExitoso: true, correoRegistrado }`. | Elimina un bug crítico que dejaba al usuario recién registrado roto frente a `<ProtectedRoute />`. |
| `frontend/src/pages/Login/Login.tsx` + `Login.css` | No mostraba confirmación al llegar desde el registro. | **MODIFICADO** — Lee `location.state`, precarga el correo recién registrado y muestra un banner verde de cuenta creada. | Cierra el flujo de registro -> inicio de sesión de forma natural y clara. |
| `frontend/src/components/Navbar.tsx` | `handleLogout()` solo borraba `token`, dejando `user` en `localStorage`. El menú no se cerraba al hacer clic en un enlace y faltaba "Mis Rentas". | **MODIFICADO** — Limpia `token`, `user` y estados temporales al cerrar sesión, cierra el menú desplegable al navegar y añade enlace directo a `/rentas`. | Previene fuga visual de datos al cambiar de cuenta en el mismo navegador. |
| `frontend/tests/roles.utils.test.ts` | **No existía** | **CREADO** — Suite de **11 pruebas unitarias** para todos los roles, estados, compatibilidad retroactiva `CLIENT -> RENTER`, modo dual y rechazos. | Eleva la cobertura del frontend a **23 pruebas unitarias aprobadas**. |

---

## 3. Resultados de Pruebas Verificadas (Fase 1 + Fase 2 Acumuladas)

| Verificación | Comando ejecutado | Resultado |
| :--- | :--- | :--- |
| **Pruebas unitarias acumuladas** | `node --test frontend/tests/verificacion.utils.test.ts frontend/tests/roles.utils.test.ts` | **23/23 Aprobadas** (`12` Fase 1 + `11` Fase 2, 177 ms) |
| **Compilación TypeScript + Vite** | `npm --prefix frontend run build` | **Exitosa** (`64 modules transformed`, 279 ms, 0 errores) |
| **ESLint en archivos de Fase 1 + 2** | `npm --prefix frontend run lint` | **0 errores y 0 advertencias** en todo el código tocado |

---

---

# FASE 2.5: Refinamiento Visual Sobrio/Empresarial + Navbar Dinámica por Rol

## 1. Resumen Ejecutivo
A partir de la revisión visual en vivo del Dashboard, se refinó la identidad de la interfaz para hacerla **sobria, empresarial y más intuitiva** (sin saturación visual ni emojis informales) y se conectó la **Navbar global** para que cambie dinámicamente según el rol con el que inicie sesión u opere el usuario.

---

## 2. Comparativa Detallada de Fase 2.5

| Archivo | Antes (Fase 2 / Proyecto Principal) | Después (Copia de Trabajo — Fase 2.5) | Motivo del Cambio |
| :--- | :--- | :--- | :--- |
| `frontend/src/components/Icons.tsx` | **No existía** (se usaban emojis del sistema operativo). | **CREADO** — 16 íconos vectoriales SVG minimalistas (trazo 1.75 px) sin dependencias externas. | Apariencia corporativa uniforme en Windows, macOS, Android e iOS y mejor accesibilidad. |
| `frontend/src/utils/rolActivo.storage.ts` | **No existía** (el Dashboard y la Navbar no compartían el rol activo en tiempo real). | **CREADO** — Sincronización ligera con `sessionStorage` y evento `motorent:cambio-rol`. | Permite que al iniciar sesión, cambiar de modo dual o probar roles en DEV, la Navbar se actualice al instante. |
| `frontend/src/utils/roles.utils.ts` | Solo calculaba la vista del Dashboard. | **MODIFICADO** — Agrega `obtenerNavegacionPorRol()` con enlaces principales, menú de perfil e insignia por rol (`Cuenta base`, `Arrendatario`, `Propietario`, `Administrador`). | Reglas de navegación centralizadas, fáciles de leer y cubiertas por pruebas unitarias. |
| `frontend/src/components/Navbar.tsx` + `Navbar.css` | Enlaces estáticos (siempre mostraba `+ Publicar Moto` incluso a cuentas sin verificar) e íconos con emojis. | **MODIFICADO** — Navbar dinámica por rol con insignia sutil, íconos SVG, cambio rápido de modo dual en el menú desplegable y limpieza total al cerrar sesión. | Navegación intuitiva que refleja exactamente lo que cada rol puede hacer. |
| `frontend/src/pages/Dashboard/dashboard.tsx`, `dashboard.css` y las 4 vistas en `components/` | Usaban emojis y un banner naranja brillante (`.owner-promo-card`). | **MODIFICADO** — Reemplazo total de emojis por contenedores `.icon-chip` + SVG, banner de propietario sobrio (superficie blanca con acento `#0F2537`) y barra DEV neutra. | Interfaz limpia, empresarial y descansada para la vista sin resultar opresiva. |
| `frontend/src/pages/Login/Login.tsx` | Botón mostrar contraseña con emojis y sin notificar cambio de rol a la Navbar. | **MODIFICADO** — Íconos `<IconEye />` / `<IconEyeOff />` y llamada a `limpiarEstadoRolTemporal()` al iniciar sesión. | Coherencia visual y actualización inmediata de la Navbar al loguearse. |
| `frontend/tests/roles.utils.test.ts` | 11 pruebas unitarias de roles. | **MODIFICADO** — Se sumaron **5 pruebas** para `obtenerNavegacionPorRol` (total acumulado: **28/28 aprobadas**). | Garantiza que cada rol vea exactamente los enlaces correctos en la Navbar. |

---

## 3. Resultados de Pruebas Verificadas (Acumulado Fase 1 + 2 + 2.5)
- **Pruebas unitarias (`node --test`):** **28 / 28 aprobadas** (`138 ms`).
- **Compilación (`tsc -b && vite build`):** **Exitosa en 339 ms** (`66 módulos`, 0 errores).
- **ESLint:** **0 errores y 0 advertencias** en todo el código creado o modificado.

---

## 4. Próxima Fase Sugerida — Fase 3 (Integración Real Backend + Frontend)
1. Sincronizar los archivos del backend afectados por el cambio de `Client` a `Renter` (`dashboard.repository.ts`, `auth.repository.ts`, `documento.repository.ts`, `renta.repository.ts`) y regenerar Prisma Client.
2. Implementar los endpoints `POST /api/renter/verificar` y `POST /api/owner/verificar` con subida de archivos (`multer` + almacenamiento elegido) y middleware de roles (`requireRole`).
3. Cambiar `USAR_SIMULACION_LOCAL = false` en `verificacion.service.ts` para activar la conexión real de extremo a extremo.

---

# FASE 3: Integración Real Backend + Frontend, Middleware RBAC y Módulo de Verificación de Perfiles

## 1. Resumen Ejecutivo de Fase 3
En el proyecto principal, el esquema Prisma ya había evolucionado hacia los modelos `Renter` y `Owner`, pero el backend aún referenciaba al antiguo modelo `Client`, carecía de control de acceso por roles (RBAC), creaba perfiles de propietario "pendientes" con campos obsoletos al publicar motos y no exponía endpoints para recibir o aprobar verificaciones de identidad.

En esta **Fase 3** se completó la integración real de extremo a extremo:
1. **Sincronización con Prisma (`Renter` / `Owner`):** Se actualizó Prisma Client v7.10.0 y se alinearon `auth.repository.ts`, `dashboard.repository.ts`, `dashboard.service.ts`, `moto.repository.ts` y `moto.service.ts`.
2. **Control de Acceso por Roles (RBAC):** Se creó el middleware reutilizable `permitirRoles(...roles)` y se protegió `POST /api/create/moto` (`OWNER` / `ADMIN`) así como las rutas administrativas (`ADMIN`).
3. **Módulo Completo de Verificación de Perfiles (4 capas):** Repositorio, Servicio, Controlador y Rutas con documentación OpenAPI/Swagger, reutilizando el validador nativo Base64 `parseDataUrl` del proyecto sin instalar dependencias nuevas.
4. **Conexión Real del Frontend + Panel Admin en Vivo:** `verificacion.service.ts` ahora codifica los archivos a Base64 Data URLs y envía peticiones reales por defecto (manteniendo simulación opt-in con `VITE_SIMULAR_VERIFICACION=true`), y `DashboardAdminView.tsx` consulta y resuelve colas reales de verificación con aprobación y rechazo inline.

---

## 2. Comparativa Detallada de Fase 3: Proyecto Principal vs Copia de Trabajo

| Archivo | Estado en Proyecto Principal (`d05ece5`) | Cambio en Copia de Trabajo (Fase 3) | Por qué se hizo este cambio |
| :--- | :--- | :--- | :--- |
| `backend/src/middleware/role.middleware.ts` | **No existía** | **CREADO** — Middleware RBAC `permitirRoles(...roles)` que responde `401` sin sesión y `403` si el rol JWT no está autorizado. | Impide que un `USER` o `RENTER` acceda a acciones exclusivas de `OWNER` o `ADMIN` directamente por API. |
| `backend/src/repositories/verificacion-perfil.repository.ts` | **No existía** | **CREADO** — Consultas de duplicados (cédula/licencia), `upsert` de `Renter`/`Owner`, colas pendientes y promoción automática de `User.role` al aprobar. | Separa el acceso a PostgreSQL en su propia capa y asegura consistencia entre estado del perfil y rol JWT. |
| `backend/src/services/verificacion-perfil.service.ts` | **No existía** | **CREADO** — Valida cédula, licencia, categoría (`A1`/`A2`) y archivos Base64 (`parseDataUrl`) antes de persistir en `backend/uploads/verificaciones/<tipo>/<userId>/`. | Validación "todo o nada" que evita archivos huérfanos en disco, bloquea duplicados (`409`) y exige motivo de rechazo (`400`). |
| `backend/src/controllers/verificacion-perfil.controller.ts` | **No existía** | **CREADO** — Controladores con `ejecutar(...)` y `exigirUsuario(...)` para los 4 endpoints de verificación y administración. | Manejo uniforme de códigos HTTP (`201`, `200`, `400`, `401`, `404`, `409`). |
| `backend/src/routes/verificacion-perfil.routes.ts` | **No existía** | **CREADO** — Expone 4 endpoints con anotaciones `@openapi` para `/doc_swagger`. | Documentación interactiva automática y rutas protegidas con `verificarToken` + `permitirRoles`. |
| `backend/src/app.ts` + `.gitignore` | Límite JSON `15mb`, sin rutas de verificación y sin ignorar `backend/uploads/`. | **MODIFICADO** — Registra `verificacionPerfilRoutes` en `/api`, sube límite JSON a `35mb` (para 6 documentos Base64) e ignora `backend/uploads/` en Git. | Permite enviar el paquete completo del Arrendatario y evita subir documentos privados al repositorio. |
| `backend/src/repositories/auth.repository.ts` | Consultaba `client: true` (modelo eliminado) y `findUserByIdentifier` no incluía perfiles. | **MODIFICADO** — Actualizado a `include: { renter: true, owner: true }` en login y `/auth/me`. | Entrega al frontend los perfiles y estados reales desde el inicio de sesión. |
| `backend/src/repositories/dashboard.repository.ts` + `services/dashboard.service.ts` | Consultaba `user.client` y `clientId`. | **MODIFICADO** — Migrado a `user.renter` y `renterId` conservando intacta la forma JSON `{ estadisticas, rentaActiva }`. | Evita errores en tiempo de ejecución contra el nuevo esquema Prisma sin romper el Dashboard actual. |
| `backend/src/repositories/moto.repository.ts`, `services/moto.service.ts` + `routes/moto.routes.ts` | Usaba `where: { userId }` y creaba un `Owner` con campos bancarios inexistentes; ruta sin RBAC. | **MODIFICADO** — Usa `where: { idUser }`, exige perfil `Owner` en estado `APPROVED` y protege `POST /api/create/moto` con `permitirRoles("OWNER", "ADMIN")`. | Cierra un hueco de seguridad: nadie sin verificación de propietario aprobada puede publicar motocicletas. |
| `frontend/src/services/verificacion.service.ts` | Tenía `USAR_SIMULACION_LOCAL = true` y enviaba `FormData` directo. | **MODIFICADO** — Convierte archivos a Base64 Data URLs (JSON), activa conexión real por defecto (`VITE_SIMULAR_VERIFICACION === "true"` opt-in) y añade funciones para colas ADMIN. | Integración real sin tocar `VerificarRenter.tsx` ni `VerificarOwner.tsx` ni requerir `multer`. |
| `frontend/src/pages/Dashboard/components/DashboardAdminView.tsx` + `dashboard.css` + `Icons.tsx` | Vista estática con contadores `"--"` y aviso de endpoints pendientes. | **MODIFICADO** — Consume `GET /api/admin/verificaciones`, muestra KPIs reales, pestañas de Arrendatarios/Propietarios, botones **Aprobar / Rechazar** con motivo inline y manejo claro de HTTP `403`. | Panel administrativo operativo, sobrio, sin emojis y con retroalimentación clara del RBAC. |
| `backend/test/role.middleware.test.ts`, `verificacion-perfil.service.test.ts` + `moto.controller.test.ts` | Solo existía 1 test en `moto.controller.test.ts` con `userId` obsoleto. | **CREADO / MODIFICADO** — Se agregaron **17 nuevas pruebas unitarias aisladas** (5 RBAC + 11 Verificación + 1 Owner pendiente en `createMoto`). | Verifica todas las reglas de negocio y seguridad sin tocar ni escribir en PostgreSQL. |

---

## 3. Contratos de Endpoints Implementados (Listos en `/doc_swagger`)

| Método y Ruta | Seguridad | Cuerpo / Parámetros | Respuesta Exitosa |
| :--- | :--- | :--- | :--- |
| `POST /api/renter/verificar` | `verificarToken` | JSON: `cedulaNumero`, `licenseNumber`, `licenseCategory` (`A1`/`A2`), `cedulaFront`, `cedulaBack`, `photo`, `licenseFront`, `licenseBack` (imágenes Base64), `bill` (imagen/PDF Base64) | `201 Created` — Perfil `Renter` en estado `PENDING` |
| `POST /api/owner/verificar` | `verificarToken` | JSON: `cedulaNumero`, `cedulaFront`, `cedulaBack`, `photo` (imágenes Base64), `bill` (imagen/PDF Base64) | `201 Created` — Perfil `Owner` en estado `PENDING` |
| `GET /api/admin/verificaciones` | `verificarToken` + `permitirRoles("ADMIN")` | — | `200 OK` — `{ renters, owners, resumen: { rentersPendientes, ownersPendientes, motosPendientes } }` |
| `PATCH /api/admin/verificaciones/:tipo/:id` | `verificarToken` + `permitirRoles("ADMIN")` | Params: `tipo` (`renter` \| `owner`), `id`. Body: `{ estado: "APPROVED" \| "REJECTED", motivoRechazo? }` | `200 OK` — Perfil actualizado + ascenso automático de `User.role` si fue aprobado |
| `POST /api/create/moto` | `verificarToken` + `permitirRoles("OWNER", "ADMIN")` | Datos de la moto (exige además perfil `Owner` en estado `APPROVED`) | `201 Created` — Motocicleta registrada |

---

## 4. Nota Crítica de Base de Datos y Hallazgos Preexistentes para el Equipo

1. **Migraciones pendientes en PostgreSQL local (NO ejecutadas automáticamente por seguridad):**
   Al inspeccionar con `npx prisma migrate status`, la base de datos local `motorent` aún no tiene aplicadas 3 migraciones del repositorio (`20261014135400_init`, `20261026001540_documentos_cifrados_clausulas_pagos` y `20261120021950_se_anadio_modelos_arrendatario_y_arrendador`).
   Cuando el equipo decida sincronizar su base de datos local para probar los endpoints reales en vivo, debe ejecutar dentro de `backend/`:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
   *Si un desarrollador desea probar los formularios sin haber aplicado todavía las migraciones, puede añadir `VITE_SIMULAR_VERIFICACION=true` en `frontend/.env`.*
2. **Errores TypeScript preexistentes en módulos ajenos a esta fase:**
   Todos los archivos creados y modificados en Fase 3 compilan con **0 errores de TypeScript** (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Los únicos errores reportados por `npx tsc --noEmit` pertenecen a módulos de otra rama/compañero (`documento.repository.ts`, `documento.service.ts`, `renta.repository.ts`, `renta.service.ts` y `seedClauses.ts`), los cuales se dejaron intactos para no generar conflictos al integrar.

---

## 5. Resultados de Pruebas Verificadas (Acumulado Completo: Fase 1 + 2 + 2.5 + 3)

| Suite / Verificación | Comando ejecutado | Resultado |
| :--- | :--- | :--- |
| **Pruebas unitarias Backend (aisladas sin BD)** | `npx tsx --test test/moto.controller.test.ts test/role.middleware.test.ts test/verificacion-perfil.service.test.ts src/Tests/moto.service.test.ts src/Tests/validateLoginData.middleware.test.ts src/Tests/validateRegisterData.test.ts` | **43 / 43 Aprobadas** (`0 fallos`, 721 ms) |
| **Pruebas unitarias Frontend** | `node --test tests/verificacion.utils.test.ts tests/roles.utils.test.ts` | **28 / 28 Aprobadas** (`0 fallos`, 141 ms) |
| **Compilación Frontend (`tsc -b && vite build`)** | `npm --prefix frontend run build` | **Exitosa en 284 ms** (`66 módulos`, 0 errores) |
| **ESLint Frontend (archivos tocados/creados)** | `npx eslint ...` | **0 errores y 0 advertencias** |
| **TypeScript Backend (archivos Fase 3)** | `npx tsc --noEmit` | **0 errores** en todos los archivos creados/modificados en Fase 3 |
| **Total combinado de pruebas automatizadas** | Backend + Frontend | **71 / 71 Pruebas Aprobadas (100%)** |

---

# FASE 4: Protección de Rutas por Rol en Frontend, Refactorización de Perfil y Pulido Sobrio Integral

## 1. Resumen Ejecutivo de Fase 4
Para cerrar la experiencia de extremo a extremo con la misma calidad sobria y empresarial en toda la aplicación, la **Fase 4** incorporó control de acceso por rol en el enrutador del frontend (`RoleRoute`), refactorizó `Perfil.tsx` (que contenía doble llamada a `/auth/me`, referencias obsoletas a `client`, formularios simulados sin conexión y emojis), corrigió el bug de **doble barra de navegación** en `Rentas.tsx`, eliminó los últimos emojis en `PublicarMoto.tsx` y `Motos.tsx`, e hizo que `npm run lint` (`eslint .`) aprobara con **0 errores en todo el proyecto frontend**.

---

## 2. Comparativa Detallada de Fase 4: Proyecto Principal vs Copia de Trabajo

| Archivo | Estado en Proyecto Principal (`d05ece5`) | Cambio en Copia de Trabajo (Fase 4) | Por qué se hizo este cambio |
| :--- | :--- | :--- | :--- |
| `frontend/src/components/RoleRoute.tsx` + `.css` | **No existía** (cualquier usuario autenticado podía abrir `/publicarmoto` o `/rentas`). | **CREADO** — Guardia de rutas por rol que evalúa `tienePermisoParaRuta(...)` y muestra una tarjeta sobria de verificación con estado `PENDING`/`REJECTED` y acceso directo al formulario correspondiente. | Complementa el RBAC del backend y guía intuitivamente al usuario sin pantallas rotas ni redirecciones confusas. |
| `frontend/src/utils/roles.utils.ts` | Solo calculaba vista del Dashboard y navegación de la Navbar. | **MODIFICADO** — Agrega la función pura `tienePermisoParaRuta(resumen, rolesPermitidos)`. | Mantiene las reglas de permisos centralizadas y cubiertas por tests unitarios. |
| `frontend/src/App.tsx` | `/publicarmoto` y `/rentas` solo usaban `<ProtectedRoute />`. | **MODIFICADO** — `/publicarmoto` queda protegido con `RoleRoute` (`OWNER`, `ADMIN`) y `/rentas` con `RoleRoute` (`RENTER`, `ADMIN`). | Coherencia total entre lo que muestra la Navbar, las rutas permitidas y la seguridad del backend. |
| `frontend/src/pages/perfil/perfil.tsx` + `.css` | Tenía **dos `useEffect` duplicados** llamando a `/auth/me`, emojis (`⚠️`, `👤`, `🪪`, `🏦`, `💡`), referencia obsoleta a `usuario.client` y formularios falsos que no guardaban en BD. | **MODIFICADO** — Una sola consulta a `/auth/me` con sincronización de Navbar, cero emojis (íconos SVG), insignia de rol real y 3 pestañas sobrias conectadas al estado real de `Renter` y `Owner` con enlaces directos a `/verificar-renter` y `/verificar-owner`. | Elimina peticiones redundantes, evita confusión con formularios duplicados y alinea el perfil con el flujo oficial de verificación. |
| `frontend/src/pages/Rentas/rentas.tsx` + `.css` | Renderizaba una **segunda barra de navegación duplicada** debajo de la Navbar global, importaba `./Rentas.css` con mayúscula inconsistente y su logout no limpiaba `user`. | **MODIFICADO** — Se eliminó la barra duplicada, se corrigió el import a `./rentas.css`, se actualizó la tarjeta activa al azul corporativo `#0F2537` y se añadió un aviso sobrio de datos de referencia. | Corrige un bug visual grave y un posible fallo de compilación en Linux/CI. |
| `frontend/src/pages/Publicarmoto/publicarmoto.tsx` | Usaba emojis (`🎉`, `⚠️`) y `window.alert()` si la foto superaba 3 MB. | **MODIFICADO** — Íconos `<IconCheckCircle />` y `<IconAlert />` y manejo inline del error de tamaño. | Mantiene la estética corporativa sobria sin ventanas emergentes intrusivas del navegador. |
| `frontend/src/pages/Motos/Motos.tsx` | Tenía el error preexistente de ESLint `(m: any)`, emojis en el modal (`🏍️`, `📄`, `🛡️`) y `window.alert()` para cualquier usuario logueado. | **MODIFICADO** — Tipado fuerte `(m: Moto)`, íconos SVG en ficha técnica, confirmación inline y botón de reserva consciente del rol (invita a verificarse como Arrendatario si aún es `USER`). | Deja **todo el frontend con 0 errores de ESLint** y alinea el catálogo con las reglas de verificación. |
| `frontend/tests/roles.utils.test.ts` | 16 pruebas (Dashboard + Navbar). | **MODIFICADO** — Se sumaron **5 pruebas unitarias** para `tienePermisoParaRuta` (acumulado frontend: **33/33 pass**). | Valida automáticamente el bloqueo/acceso para `USER`, `RENTER`, `OWNER`, `DUAL` y `ADMIN`. |

---

## 3. Resultados de Pruebas Verificadas (Acumulado Final: Fases 1 + 2 + 2.5 + 3 + 4)

| Verificación | Comando ejecutado | Resultado |
| :--- | :--- | :--- |
| **Pruebas unitarias Backend** | `npx tsx --test ...` (6 suites, 0 escrituras en BD) | **43 / 43 Aprobadas** (709 ms) |
| **Pruebas unitarias Frontend** | `node --test tests/verificacion.utils.test.ts tests/roles.utils.test.ts` | **33 / 33 Aprobadas** (151 ms) |
| **Total combinado de pruebas** | Backend + Frontend | **76 / 76 Pruebas Aprobadas (100%)** |
| **Compilación Frontend (`tsc -b && vite build`)** | `npm --prefix frontend run build` | **Exitosa en 184 ms** (`68 módulos`, 0 errores) |
| **ESLint Global Frontend (`eslint .`)** | `npm --prefix frontend run lint` | **0 errores y 0 advertencias en todo el proyecto** |

---

# FASE 5: Tarjetas Compactas de Motos, Ficha Completa con Descripción y Galería Actualizada tras Cada Renta

## 1. Resumen Ejecutivo de Fase 5
En esta fase se rediseñó la experiencia del catálogo de motocicletas para que cada **tarjeta de vista previa** muestre únicamente los datos esenciales de comparación rápida (foto de portada, categoría, año, color, **cilindraje cc**, **kilometraje km**, **licencia requerida** y tarifa diaria), mientras que al abrir la **ficha completa** el usuario accede a:
1. **Galería fotográfica interactiva:** foto principal, flechas, teclado (`←`/`→`), miniaturas, contador y pestañas de origen (**Todas**, **Propietario** y **Última inspección**).
2. **Actualización automática tras cada renta:** el endpoint `GET /api/motos/:id/galeria` combina las fotos subidas por el propietario con las evidencias de inspección de devolución (`HandoverType.RETURN` en `VehicleHandover` + `HandoverEvidence` de Prisma), mostrando siempre la fecha de la última inspección.
3. **Descripción completa y ficha técnica estructurada:** combina la descripción redactada por el propietario con un resumen técnico basado estrictamente en datos reales (sin inventar equipamiento), además de la calculadora de renta consciente del rol.
4. **Publicación con múltiples fotos y descripción:** `PublicarMoto.tsx` ahora permite subir hasta **6 fotografías** optimizadas automáticamente en el navegador (`comprimirImagen`) junto con una descripción detallada que se envía a `POST /api/motos/:id/galeria`.

---

## 2. Comparativa Detallada de Fase 5: Proyecto Principal vs Copia de Trabajo

| Archivo | Estado Anterior | Cambio en Copia de Trabajo (Fase 5) | Beneficio |
| :--- | :--- | :--- | :--- |
| `backend/src/repositories/moto.repository.ts` | Solo listaba y creaba motos. | **MODIFICADO** — Agrega `buscarMotoPorId` y `obtenerEvidenciasDevolucion` (consulta `HandoverEvidence` de entregas `RETURN` ordenadas de la más reciente a la más antigua). | Alimenta la galería con fotos reales tomadas al devolver cada moto. |
| `backend/src/services/moto-galeria.service.ts` + `controllers/moto-galeria.controller.ts` | **No existían** | **CREADOS** — Gestión de galería (máx. 6 por envío, 12 totales, validación Base64 "todo o nada", descripción 20–1200 caracteres y portada automática). | Persistencia real sin alterar el esquema de Prisma ni agregar dependencias. |
| `backend/src/routes/moto.routes.ts`, `services/moto.service.ts` + `app.ts` | `GET /api/motos` no incluía portada; no había endpoints de galería ni estáticos públicos. | **MODIFICADOS** — Exponen `GET /api/motos/:id/galeria` (pública) y `POST /api/motos/:id/galeria` (dueño/ADMIN) con Swagger, añaden `fotoPortada` a `GET /api/motos` y sirven únicamente `/uploads/motos` (manteniendo `/uploads/verificaciones` privado). | Seguridad estricta entre documentos privados y fotos públicas del catálogo. |
| `frontend/src/utils/moto.utils.ts` + `imagen.utils.ts` + `services/motos.service.ts` | Lógica mezclada en `Motos.tsx` y carga sin compresión. | **CREADOS** — Formateadores COP/km, regla colombiana A1/A2, generador de descripción, constructor de galería, compresión `Canvas` en el navegador y cliente HTTP del catálogo. | Código modular, rápido en subida y probado con tests unitarios. |
| `frontend/src/pages/Motos/components/MotoCard.tsx`, `MotoGaleria.tsx`, `MotoDetalleModal.tsx` + `MotoCatalogo.css` + `Motos.tsx` | Tarjetas sobrecargadas y modal básico con 1 foto fija. | **CREADOS / MODIFICADOS** — Tarjeta compacta (`cc`, `km`, licencia, tarifa) y modal de ficha completa con galería multi-foto, filtro de inspecciones post-renta y calculadora lateral. | Comparación ágil en el catálogo y máxima transparencia al revisar cada moto. |
| `frontend/src/pages/Publicarmoto/publicarmoto.tsx` + `.css` | Solo aceptaba 1 foto guardada en `localStorage` y no enviaba descripción. | **MODIFICADO** — Campo de descripción (20–1200 chars), selector de hasta 6 fotos optimizadas con insignia `Portada` y envío real a `POST /api/motos/:id/galeria`. | Los propietarios publican galerías completas desde el primer momento. |
| `backend/test/moto-galeria.service.test.ts` + `frontend/tests/moto.utils.test.ts` | **No existían** | **CREADOS** — **18 nuevas pruebas unitarias** (9 backend + 9 frontend), elevando el total acumulado a **94 / 94 pruebas aprobadas**. | Garantiza reglas de permisos, límites de fotos, descripciones y galería. |

---

## 3. Resultados de Pruebas Verificadas (Acumulado Completo: Fases 1 a 5)

| Verificación | Resultado |
| :--- | :--- |
| **Pruebas unitarias Backend** (7 suites, 0 escrituras en BD ni disco) | **52 / 52 Aprobadas** (`9` nuevas) |
| **Pruebas unitarias Frontend** (3 suites: verificación, roles y motos) | **42 / 42 Aprobadas** (`9` nuevas) |
| **Total combinado de pruebas** | **94 / 94 Aprobadas (100%)** |
| **Build Producción Frontend (`tsc -b && vite build`)** | **Exitoso en 215 ms** (`75 módulos`) |
| **ESLint Global Frontend (`npm run lint`)** | **0 errores y 0 advertencias en todo el proyecto** |

---

# FASE 5.5: Refinación UI/UX (Modo Oscuro M3, Configuración, Menú Limpio y Filtros Inteligentes) + Auditoría Integral (Fases 1–5.5)

## 1. Resumen Ejecutivo y Guías de Diseño Aplicadas
Antes de iniciar la Fase 6 de reseñas bidireccionales, se realizó una refinación integral del frontend fundamentada en tres guías estándar de la industria:
1. **Material Design 3 (Dark Theme):** Modo oscuro real con superficies tonales en azul-pizarra (`#0B141D` → `#111E2B` → `#18293A`), sin negro puro `#000000`, acento desaturado (`#FF8159`) y contraste WCAG AA.
2. **Nielsen Norman Group (Menús de Perfil y Configuración):** Se eliminaron enlaces redundantes (`Mi Panel`, `Mis Rentas`) del desplegable del perfil, se incorporó el acceso a **`/configuracion`** y un cambio rápido de tema inline, más cierre con tecla `Escape`.
3. **Baymard Institute (Catálogos, Filtros y Paginación):** Grilla adaptable `minmax(275px, 1fr)`, filtro por cilindraje (`cc`) con **búsqueda automática de coincidencias más cercanas** (`|cc_moto - ccObjetivo|`), chips de filtros activos con botón `×`, ordenamiento múltiple y paginación de **24 motos por página** (configurable `12` / `24` / `30`).

---

## 2. Comparativa Detallada de Fase 5.5

| Archivo | Cambio | Justificación Técnica y Pedagógica |
| :--- | :--- | :--- |
| `frontend/src/utils/preferencias.storage.ts` | **CREADO** — Gestión tipada de tema (`claro`/`oscuro`/`sistema`), motos por página (`12`/`24`/`30`), notificaciones y privacidad, con evento `motorent:preferencias`. | Separa el estado global ligero en funciones puras (`resolverTemaEfectivo`, `sanearPreferencias`) fáciles de estudiar y probar sin librerías externas. |
| `frontend/src/index.css` + `src/styles/dark-mode.css` + `src/main.tsx` | **MODIFICADO / CREADO** — Tokens semánticos CSS + hoja dedicada para `:root[data-theme="dark"]` e inicialización previa al render (`inicializarTemaGlobal()`). | Evita el parpadeo blanco al recargar en modo oscuro y mantiene centralizadas todas las reglas oscuras para fácil lectura. |
| `frontend/src/pages/Configuracion/Configuracion.tsx` + `.css` + `App.tsx` | **CREADO / MODIFICADO** — Nueva ruta protegida `/configuracion` con 4 pestañas (*Apariencia y catálogo*, *Notificaciones*, *Privacidad*, *Seguridad y cuenta*). | Cubre utilidades reales esperadas en una plataforma moderna y deja lista la preferencia de nombre público para la Fase 6. |
| `frontend/src/utils/roles.utils.ts` + `components/Navbar.tsx` + `Icons.tsx` | **MODIFICADO** — Menú de perfil depurado (sin repetir `Mi Panel` ni `Mis Rentas`), enlace a `/configuracion`, toggle rápido de tema inline y cierre con `Escape`. | Reduce ruido visual y evita duplicar la barra de navegación principal. |
| `frontend/src/utils/moto.utils.ts` + `pages/Motos/Motos.tsx` + `Motos.css` | **MODIFICADO** — `filtrarYOrdenarMotos` (exacto o más cercano por `cc`), `paginarLista` (12/24/30), barra de filtros activos y banner informativo de proximidad. | Evita callejones sin salida al buscar un cilindraje específico y escala limpiamente a cientos de motos. |
| `frontend/tests/preferencias.storage.test.ts`, `moto.utils.test.ts` + `roles.utils.test.ts` | **CREADO / MODIFICADO** — **8 nuevas pruebas unitarias** (total acumulado: **102 / 102 pruebas aprobadas**). | Comprueba automáticamente tema, saneamiento, cercanía de `cc`, paginación y menú limpio. |

---

## 3. Auditoría Integral de Cumplimiento (Fase 1 a Fase 5.5)

| Parámetro Evaluado | Estado | Evidencia Verificada |
| :--- | :--- | :--- |
| **Repositorio original `MOTORENT-PROYECTO-` intacto** | **CUMPLE** | 0 archivos fuente modificados en `Documents\MOTORENT-PROYECTO-`. |
| **Pruebas automatizadas aisladas (0 escrituras en BD)** | **CUMPLE** | **102 / 102 aprobadas** (`52` backend + `50` frontend). |
| **Compilación y ESLint global Frontend** | **CUMPLE** | `vite build` limpio en 373 ms (`79` módulos) y `eslint .` con **0 errores**. |
| **Código limpio, comentado y fácil de estudiar** | **CUMPLE** | Lógica de negocio separada en funciones puras (`utils/`) y 4 capas en backend. |
| **Estética sobria y cero emojis en módulos intervenidos** | **CUMPLE CON HALLAZGO MENOR** | **0 emojis** en todos los módulos creados/editados (Fases 1–5.5). Se detectaron 9 emojis heredados en 5 pantallas legacy no intervenidas (`Home.tsx`, `Contrato.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `VerificarCorreo.tsx`). |
| **Documentación acumulativa y PDFs en Lora 12pt** | **CUMPLE** | 6 reportes PDF generados y revisados visualmente en `Downloads/` + `CAMBIOS_PARA_EL_EQUIPO.md`. |

---

# FASE 6: Perfil Público de Reputación, Reseñas Bidireccionales (Doble Ciego 30 min) y Ajustes de Modo Oscuro

## 1. Resumen Ejecutivo de Fase 6
En esta fase se corrigieron los contrastes de modo oscuro en la barra de búsqueda del catálogo (`.motos-search-field`) y las tipografías de todos los formularios, se añadió una ayuda no bloqueante de cédula/licencia en `VerificarRenter.tsx` (adaptada al estándar RUNT Colombia sin bloquear extranjeros), y se implementó el sistema completo de **Confianza Bidireccional y Perfil Público**:
1. **Modelo `Review` en Prisma (`schema.prisma`):** con `ReviewTargetType (MOTO | OWNER | RENTER)`, `visibleAt` (doble ciego a 30 minutos) y restricción única `@@unique([rentalId, authorId, targetType])`.
2. **Backend en 4 capas con Swagger (`resena.*`):**
   - `POST /api/resenas` (`verificarToken`): valida renta `COMPLETED`, impide auto-reseñas y duplicados (`409`), exige comentario mínimo de 10 caracteres cuando la nota es `≤ 3`, y fija `visibleAt = ahora + 30 min`.
   - `GET /api/resenas/pendientes` (`verificarToken`): detecta rentas completadas sin evaluar para la regla de **evaluación obligatoria** antes de la siguiente operación.
   - `GET /api/motos/:id/resenas` (pública): devuelve promedio y reseñas visibles.
   - `GET /api/usuarios/:id/perfil-publico` (pública): proyección estricta que **nunca expone** correo, teléfono, contraseña, cédula ni licencia.
3. **Frontend completo:**
   - Nueva ruta pública **`/usuario/:id`** (`PerfilPublico.tsx`): nombre público (*Primer nombre + inicial*), insignias verificadas, reputación general / como propietario / como arrendatario y listado de motos.
   - **Ficha de Moto (`MotoDetalleModal.tsx`):** tarjeta del propietario clicable hacia `/usuario/:id` + opiniones verificadas.
   - **Mis Rentas (`Rentas.tsx`):** aviso de calificación obligatoria pendiente y formulario inline de estrellas SVG (Moto + Propietario) con política transparente de doble ciego a 30 minutos.

---

## 2. Resultados de Pruebas Verificadas (Acumulado Final: Fases 1 a 6)

| Verificación | Resultado |
| :--- | :--- |
| **Pruebas unitarias Backend** (8 suites, 0 escrituras en BD) | **62 / 62 Aprobadas** (`10` nuevas en `resena.service.test.ts`) |
| **Pruebas unitarias Frontend** (5 suites, `node:test`) | **54 / 54 Aprobadas** (`3` nuevas en `resenas.utils.test.ts` + `1` carrusel 8 fotos) |
| **Total combinado de pruebas** | **116 / 116 Aprobadas (100%)** |
| **Build Producción Frontend (`tsc -b && vite build`)** | **Exitoso en 545 ms** (`83 módulos`) |
| **ESLint Global Frontend (`npm run lint`)** | **0 errores y 0 advertencias en todo el proyecto** |

> **Nota para el equipo (migración Prisma):** Para crear la nueva tabla `Review` en PostgreSQL local cuando el equipo decida sincronizar la BD, ejecutar en `backend/`:
> `npx prisma migrate dev --name add_reviews`

---

# FASE 7: Panel Administrativo Completo (`ADMIN`) — Visor Privado de Documentos, Aprobación de Motos, Usuarios y Alertas de Reseñas

## 1. Resumen Ejecutivo de Fase 7
Se completó el centro de control operativo para el rol `ADMIN` con 4 módulos funcionales y seguridad estricta (RBAC + protección contra Path Traversal + descarga de documentos privados con Bearer token vía `Blob`):
1. **Visor privado de documentos de verificación:** `GET /api/admin/documentos/:tipo/:userId/:archivo` (solo `ADMIN`) sirve cédula frontal/posterior, foto de rostro, licencia y recibo de domicilio sin hacer pública la carpeta `backend/uploads/verificaciones/`.
2. **Aprobación y control de motocicletas:** `GET /api/admin/motos` (priorizando `PENDING_APPROVAL`) y `PATCH /api/admin/motos/:id/estado` para pasar motos a `AVAILABLE`, `MAINTENANCE`, `INACTIVE` o `REJECTED`.
3. **Directorio de usuarios:** `GET /api/admin/usuarios` con buscador por nombre/correo/rol, estado real de verificaciones y enlace al perfil público (`/usuario/:id`).
4. **Supervisión de reseñas y alertas:** `GET /api/admin/resenas` destacando automáticamente calificaciones bajas (`≤ 3` estrellas) + `GET /api/admin/resumen` para los 4 KPIs del panel.
5. **Vista de ejemplo en modo `DEV`:** Si el desarrollador previsualiza `ADMIN` desde una cuenta `USER` (recibiendo `403` real del backend), puede cargar un conjunto de ejemplo en memoria para probar las 4 pestañas sin relajar el RBAC real.

---

## 2. Resultados de Pruebas Verificadas (Acumulado Final: Fases 1 a 7)

| Verificación | Resultado |
| :--- | :--- |
| **Pruebas unitarias Backend** (9 suites, 0 escrituras en BD ni disco) | **67 / 67 Aprobadas** (`5` nuevas en `admin.service.test.ts`) |
| **Pruebas unitarias Frontend** (6 suites, `node:test`) | **58 / 58 Aprobadas** (`4` nuevas en `admin.utils.test.ts`) |
| **Total combinado de pruebas** | **125 / 125 Aprobadas (100%)** |
| **Build Producción Frontend (`tsc -b && vite build`)** | **Exitoso en 527 ms** (`85 módulos`) |
| **ESLint Global Frontend (`npm run lint`)** | **0 errores y 0 advertencias en todo el proyecto** |
