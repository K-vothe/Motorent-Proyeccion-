import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import { ToastProvider } from "./components/UiFeedback";


import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Dashboard from "./pages/Dashboard/dashboard";
import Motos from "./pages/Motos/Motos";
import Perfil from "./pages/perfil/perfil";
import PerfilPublico from "./pages/PerfilPublico/PerfilPublico";
import Configuracion from "./pages/Configuracion/Configuracion";
import Rentas from "./pages/Rentas/rentas";
import Contrato from "./pages/Contrato/Contrato";
import PublicarMoto from "./pages/Publicarmoto/publicarmoto";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import VerificarCorreo from "./pages/VerificarCorreo/VerificarCorreo";
import VerificarRenter from "./pages/Renter/VerificarRenter"; 
import VerificarOwner from "./pages/Owner/VerificarOwner";

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <a href="#contenido-principal" className="skip-link">
          Saltar al contenido principal
        </a>

        <Navbar />

        <div id="contenido-principal" tabIndex={-1}>
          <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/motos" element={<Motos />} />
        <Route path="/usuario/:id" element={<PerfilPublico />} />
        <Route path="/recuperar-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verificar-correo/:token" element={<VerificarCorreo />} />

        {/* Rutas protegidas: requieren sesión iniciada (token JWT válido) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contrato" element={<Contrato />} />
          <Route path="/verificar-renter" element={<VerificarRenter />} />
          <Route path="/verificar-owner" element={<VerificarOwner />} />

          {/* Rutas restringidas por rol verificado */}
          <Route
            element={
              <RoleRoute
                rolesPermitidos={["RENTER", "OWNER", "ADMIN"]}
                tipoRequerido="renter"
              />
            }
          >
            <Route path="/rentas" element={<Rentas />} />
          </Route>

          <Route
            element={
              <RoleRoute
                rolesPermitidos={["OWNER", "ADMIN"]}
                tipoRequerido="owner"
              />
            }
          >
            <Route path="/publicarmoto" element={<PublicarMoto />} />
          </Route>
        </Route>

          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;