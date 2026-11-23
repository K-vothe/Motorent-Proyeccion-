/**
 * Utilidades puras para determinar roles, estados de verificación y
 * la vista correspondiente del Dashboard según el perfil del usuario.
 *
 * Compatible tanto con el esquema actual de Prisma (Renter / Owner)
 * como con el nombre anterior (Client) por si alguna respuesta del backend
 * todavía devuelve la propiedad "client".
 */

import type { EstadoVerificacion } from "../services/verificacion.service.ts";

export type RolBase = "USER" | "RENTER" | "OWNER" | "ADMIN";
export type EstadoPerfilUI = "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED";
export type ModoDashboard = "USER" | "RENTER" | "OWNER" | "ADMIN";

export interface PerfilVerificable {
  estadoVerificacion?: string | null;
  verificationStatus?: string | null;
  motivoRechazo?: string | null;
  verificationNotes?: string | null;
}

export interface UsuarioSesion {
  id?: string;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  isEmailVerified?: boolean;
  renter?: PerfilVerificable | null;
  client?: PerfilVerificable | null;
  owner?: PerfilVerificable | null;
}

export interface ResumenRolesUsuario {
  rolPrincipal: RolBase;
  esAdmin: boolean;
  estadoRenter: EstadoPerfilUI;
  estadoOwner: EstadoPerfilUI;
  motivoRechazoRenter: string | null;
  motivoRechazoOwner: string | null;
  puedeVerModoRenter: boolean;
  puedeVerModoOwner: boolean;
  esUsuarioDual: boolean;
  modoInicial: ModoDashboard;
  etiquetaRol: string;
}

/**
 * Normaliza el rol recibido del backend a uno de los 4 roles oficiales.
 * Si llega "CLIENT" (esquema anterior), lo mapea automáticamente a "RENTER".
 */
export function normalizarRolBase(role?: string | null): RolBase {
  const rolLimpio = (role || "USER").toUpperCase();

  if (rolLimpio === "ADMIN") return "ADMIN";
  if (rolLimpio === "OWNER") return "OWNER";
  if (rolLimpio === "RENTER" || rolLimpio === "CLIENT") return "RENTER";

  return "USER";
}

/**
 * Unifica los nombres de estado de verificación de Prisma
 * (APPROVED / VERIFIED / PENDING / REJECTED) a un formato único para la UI.
 */
export function normalizarEstadoVerificacion(
  estado?: string | null
): EstadoPerfilUI {
  const valor = (estado || "").toUpperCase();

  if (valor === "APPROVED" || valor === "VERIFIED") return "APPROVED";
  if (valor === "PENDING") return "PENDING";
  if (valor === "REJECTED") return "REJECTED";

  return "NOT_STARTED";
}

/**
 * Calcula qué vistas, permisos visuales y tarjetas de onboarding debe ver
 * el usuario en el Dashboard.
 */
export function obtenerResumenRoles(
  usuario: UsuarioSesion | null,
  estadoLocalRenter: EstadoVerificacion | null = null,
  estadoLocalOwner: EstadoVerificacion | null = null
): ResumenRolesUsuario {
  const rolPrincipal = normalizarRolBase(usuario?.role);
  const esAdmin = rolPrincipal === "ADMIN";

  // 1. Estado del perfil Arrendatario (soporta "renter" nuevo y "client" anterior)
  const perfilRenter = usuario?.renter ?? usuario?.client ?? null;
  const estadoRenterBackend = normalizarEstadoVerificacion(
    perfilRenter?.estadoVerificacion ?? perfilRenter?.verificationStatus
  );

  let estadoRenter: EstadoPerfilUI = estadoRenterBackend;
  if (estadoRenter === "NOT_STARTED" && rolPrincipal === "RENTER") {
    estadoRenter = "APPROVED";
  } else if (estadoRenter === "NOT_STARTED" && estadoLocalRenter) {
    estadoRenter = normalizarEstadoVerificacion(estadoLocalRenter);
  }

  // 2. Estado del perfil Propietario (Owner)
  const perfilOwner = usuario?.owner ?? null;
  const estadoOwnerBackend = normalizarEstadoVerificacion(
    perfilOwner?.estadoVerificacion ?? perfilOwner?.verificationStatus
  );

  let estadoOwner: EstadoPerfilUI = estadoOwnerBackend;
  if (estadoOwner === "NOT_STARTED" && rolPrincipal === "OWNER") {
    estadoOwner = "APPROVED";
  } else if (estadoOwner === "NOT_STARTED" && estadoLocalOwner) {
    estadoOwner = normalizarEstadoVerificacion(estadoLocalOwner);
  }

  const motivoRechazoRenter =
    perfilRenter?.motivoRechazo ?? perfilRenter?.verificationNotes ?? null;
  const motivoRechazoOwner =
    perfilOwner?.motivoRechazo ?? perfilOwner?.verificationNotes ?? null;

  // 3. Modos habilitados en el Dashboard
  const puedeVerModoRenter = estadoRenter === "APPROVED" || rolPrincipal === "RENTER";
  const puedeVerModoOwner = estadoOwner === "APPROVED" || rolPrincipal === "OWNER";
  const esUsuarioDual = !esAdmin && puedeVerModoRenter && puedeVerModoOwner;

  // 4. Modo inicial que se abre al entrar a /dashboard
  let modoInicial: ModoDashboard = "USER";
  let etiquetaRol = "Usuario registrado";

  if (esAdmin) {
    modoInicial = "ADMIN";
    etiquetaRol = "Administrador";
  } else if (esUsuarioDual) {
    modoInicial = "RENTER";
    etiquetaRol = "Arrendatario y Propietario";
  } else if (puedeVerModoOwner) {
    modoInicial = "OWNER";
    etiquetaRol = "Propietario verificado";
  } else if (puedeVerModoRenter) {
    modoInicial = "RENTER";
    etiquetaRol = "Arrendatario verificado";
  }

  return {
    rolPrincipal,
    esAdmin,
    estadoRenter,
    estadoOwner,
    motivoRechazoRenter,
    motivoRechazoOwner,
    puedeVerModoRenter,
    puedeVerModoOwner,
    esUsuarioDual,
    modoInicial,
    etiquetaRol,
  };
}

/**
 * Devuelve texto legible y clase visual para mostrar una insignia de estado.
 */
export function obtenerInfoBadgeEstado(estado: EstadoPerfilUI): {
  texto: string;
  variante: "neutral" | "pending" | "approved" | "rejected";
} {
  switch (estado) {
    case "APPROVED":
      return { texto: "Verificado", variante: "approved" };
    case "PENDING":
      return { texto: "En revisión", variante: "pending" };
    case "REJECTED":
      return { texto: "Requiere corrección", variante: "rejected" };
    default:
      return { texto: "Sin verificar", variante: "neutral" };
  }
}

export interface EnlaceNavegacion {
  label: string;
  to: string;
  destacado?: boolean;
}

export interface ConfiguracionNavbar {
  enlacesPrincipales: EnlaceNavegacion[];
  enlacesMenuPerfil: EnlaceNavegacion[];
  etiquetaRolNav: string | null;
  varianteRolNav: "user" | "renter" | "owner" | "admin" | null;
}

/**
 * Define qué enlaces principales, opciones de menú e insignia de rol debe
 * mostrar la barra de navegación superior (Navbar) según la sesión y el rol activo.
 */
export function obtenerNavegacionPorRol(
  haySesion: boolean,
  resumen: ResumenRolesUsuario | null,
  modoActivo?: ModoDashboard | null
): ConfiguracionNavbar {
  // 1. Visitante sin sesión iniciada
  if (!haySesion || !resumen) {
    return {
      enlacesPrincipales: [
        { label: "Inicio", to: "/" },
        { label: "Catálogo", to: "/motos" },
      ],
      enlacesMenuPerfil: [],
      etiquetaRolNav: null,
      varianteRolNav: null,
    };
  }

  const modo: ModoDashboard = modoActivo || resumen.modoInicial;

  // 2. Administrador
  // Nota UX (Nielsen Norman Group): el desplegable del perfil solo incluye
  // utilidades de cuenta (Perfil, Configuración, Verificaciones) y evita repetir
  // enlaces que ya están en la barra principal (como Mi Panel o Mis Rentas).
  if (modo === "ADMIN") {
    return {
      enlacesPrincipales: [
        { label: "Panel Administrativo", to: "/dashboard" },
        { label: "Catálogo", to: "/motos" },
      ],
      enlacesMenuPerfil: [
        { label: "Mi Perfil", to: "/perfil" },
        { label: "Configuración", to: "/configuracion" },
      ],
      etiquetaRolNav: "Administrador",
      varianteRolNav: "admin",
    };
  }

  // 3. Propietario verificado (OWNER)
  if (modo === "OWNER") {
    const enlacesPerfil: EnlaceNavegacion[] = [
      { label: "Mi Perfil", to: "/perfil" },
      { label: "Configuración", to: "/configuracion" },
    ];

    if (!resumen.puedeVerModoRenter) {
      enlacesPerfil.push({
        label: "Verificarme como Arrendatario",
        to: "/verificar-renter",
      });
    }

    return {
      enlacesPrincipales: [
        { label: "Mi Panel", to: "/dashboard" },
        { label: "Catálogo", to: "/motos" },
        { label: "Rentas", to: "/rentas" },
        { label: "Publicar moto", to: "/publicarmoto", destacado: true },
      ],
      enlacesMenuPerfil: enlacesPerfil,
      etiquetaRolNav: "Propietario",
      varianteRolNav: "owner",
    };
  }

  // 4. Arrendatario verificado (RENTER)
  if (modo === "RENTER") {
    const enlacesPerfil: EnlaceNavegacion[] = [
      { label: "Mi Perfil", to: "/perfil" },
      { label: "Configuración", to: "/configuracion" },
    ];

    if (!resumen.puedeVerModoOwner) {
      enlacesPerfil.push({
        label: "Verificarme como Propietario",
        to: "/verificar-owner",
      });
    }

    return {
      enlacesPrincipales: [
        { label: "Mi Panel", to: "/dashboard" },
        { label: "Catálogo", to: "/motos" },
        { label: "Mis Rentas", to: "/rentas" },
      ],
      enlacesMenuPerfil: enlacesPerfil,
      etiquetaRolNav: "Arrendatario",
      varianteRolNav: "renter",
    };
  }

  // 5. Usuario registrado base (USER aún sin perfil aprobado)
  return {
    enlacesPrincipales: [
      { label: "Mi Panel", to: "/dashboard" },
      { label: "Catálogo", to: "/motos" },
    ],
    enlacesMenuPerfil: [
      { label: "Mi Perfil", to: "/perfil" },
      { label: "Configuración", to: "/configuracion" },
      { label: "Verificarme como Arrendatario", to: "/verificar-renter" },
      { label: "Verificarme como Propietario", to: "/verificar-owner" },
    ],
    etiquetaRolNav: "Cuenta base",
    varianteRolNav: "user",
  };
}

// ============================================================================
// CONTROL DE ACCESO POR ROL EN RUTAS DEL FRONTEND (FASE 4)
// ============================================================================

export type RolRutaProtegida = "RENTER" | "OWNER" | "ADMIN";

/**
 * Evalúa si el usuario actual cumple alguno de los roles requeridos
 * para ingresar a una ruta restringida (ej. /publicarmoto o /rentas).
 */
export function tienePermisoParaRuta(
  resumen: ResumenRolesUsuario,
  rolesPermitidos: RolRutaProtegida[]
): boolean {
  if (rolesPermitidos.includes("ADMIN") && resumen.esAdmin) {
    return true;
  }
  if (rolesPermitidos.includes("OWNER") && resumen.puedeVerModoOwner) {
    return true;
  }
  if (rolesPermitidos.includes("RENTER") && resumen.puedeVerModoRenter) {
    return true;
  }
  return false;
}
