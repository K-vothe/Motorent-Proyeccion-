import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/logo/logo.png";
import { IconEye, IconEyeOff } from "../../components/Icons";
import { useAppTransition } from "../../components/SessionTransitionOverlay";
import { limpiarEstadoRolTemporal } from "../../utils/rolActivo.storage";
import "./Login.css";

interface LoginLocationState {
  registroExitoso?: boolean;
  correoRegistrado?: string;
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ejecutarTransicion } = useAppTransition();
  const estadoNavegacion = (location.state as LoginLocationState | null) || null;

  // Estados de los campos (si viene recién registrado, precargamos el correo)
  const [usuario, setUsuario] = useState(
    estadoNavegacion?.correoRegistrado || ""
  );
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Mensaje de confirmación si llega desde Register.tsx
  const [mensajeRegistro] = useState(
    estadoNavegacion?.registroExitoso
      ? "¡Cuenta creada con éxito! Inicia sesión con tus credenciales para continuar."
      : ""
  );

  // Estados de errores
  const [errorUsuario, setErrorUsuario] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [apiError, setApiError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErrorUsuario("");
    setErrorPassword("");
    setApiError("");

    let formularioValido = true;

    if (usuario.trim() === "") {
      setErrorUsuario("El usuario o correo es obligatorio");
      formularioValido = false;
    }

    if (password.trim() === "") {
      setErrorPassword("La contraseña es obligatoria");
      formularioValido = false;
    }

    if (!formularioValido) return;

    setCargando(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: usuario,
          password: password,
        }),
      });

      const data = await response.json();

      // Si las credenciales son incorrectas o la cuenta no existe
      if (!response.ok) {
        setApiError(data.message || "Usuario o contraseña incorrectos");
        setCargando(false);
        return;
      }

      // Si todo está bien, guardamos el token y ejecutamos la transición suave de bienvenida
      const token = data.data?.token || data.token;
      const user = data.data?.user || data.user;

      ejecutarTransicion(
        {
          tipo: "login",
          nombreUsuario: user?.fullName,
        },
        () => {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          limpiarEstadoRolTemporal();
          navigate("/dashboard", { replace: true });
        }
      );
    } catch (error) {
      console.error(error);
      setApiError("No se pudo conectar con el servidor backend.");
      setCargando(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Botón flotante para regresar a la Home */}
      <Link to="/" className="auth-back-link">
        ← Volver al inicio
      </Link>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <img src={logo} alt="MotoRent" className="auth-logo" />
          <span className="auth-brand-name">
            <span>MOTO</span>RENT
          </span>
        </div>

        <h1>Iniciar sesión</h1>
        <p className="auth-subtitle">Ingresa tus credenciales para acceder a tu panel</p>

        {/* Mensaje de confirmación tras registrarse correctamente */}
        {mensajeRegistro && !apiError && (
          <div className="auth-success-banner" role="status">
            ✓ {mensajeRegistro}
          </div>
        )}

        {/* Mensaje de error de la API (visible y destacado) */}
        {apiError && <div className="auth-error-banner">{apiError}</div>}

        <div className="form-field">
          <label>Usuario o correo electrónico</label>
          <input
            type="text"
            placeholder="ej. haroldm o harold@correo.com"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
          {errorUsuario && <p className="field-error">{errorUsuario}</p>}
        </div>

        <div className="form-field">
          <label>Contraseña</label>
          <div style={{ position: "relative" }}> {/* Div contenedor */}
            <input
              type={mostrarPassword ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
              }}
            >
              {mostrarPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {errorPassword && <p className="field-error">{errorPassword}</p>}
        </div>

        {/* Enlace para recuperar contraseña */}
        <div style={{ textAlign: "right", marginTop: "-10px", marginBottom: "20px" }}>
          <Link 
            to="/recuperar-password" 
            style={{ color: "#FF6A3D", fontSize: "13px", textDecoration: "none", fontWeight: "600" }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button type="submit" className="auth-button" disabled={cargando}>
          {cargando ? "Iniciando sesión..." : "Ingresar"}
        </button>

        <p className="auth-switch">
          ¿No tienes una cuenta? <Link to="/register">Regístrate gratis</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;