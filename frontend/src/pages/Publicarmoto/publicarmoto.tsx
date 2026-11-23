// frontend/src/pages/Publicarmoto/publicarmoto.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { IconAlert, IconCamera, IconCheckCircle, IconClose } from "../../components/Icons";
import { actualizarGaleriaMoto, API_URL } from "../../services/motos.service";
import { comprimirImagen } from "../../utils/imagen.utils";
import "./publicarmoto.css";

const MAX_FOTOS_PUBLICAR = 8;

interface MotoFormData {
  brand: string;
  model: string;
  year: string;
  displacement: string;
  licensePlate: string;
  KM: string;
  color: string;
  category: string;
  dailyRate: string;
  transitLicenseNumber: string;
  description: string;
}

interface FormErrors {
  brand?: string;
  model?: string;
  year?: string;
  displacement?: string;
  licensePlate?: string;
  KM?: string;
  color?: string;
  dailyRate?: string;
  [key: string]: string | undefined;
}

function PublicarMoto() {
  const [formData, setFormData] = useState<MotoFormData>({
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    displacement: "",
    licensePlate: "",
    KM: "",
    color: "",
    category: "Uso diario",
    dailyRate: "",
    transitLicenseNumber: "",
    description: "",
  });

  const [fotosBase64, setFotosBase64] = useState<string[]>([]);
  const [procesandoFotos, setProcesandoFotos] = useState<boolean>(false);
  const [avisoGaleria, setAvisoGaleria] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string>("");
  const [cargando, setCargando] = useState<boolean>(false);
  const [publicadoExitoso, setPublicadoExitoso] = useState<boolean>(false);

  const regexPlaca = /^[A-Z]{3}\d{2}[A-Z]{1}$/;

  const handleFotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (archivos.length === 0) return;

    const cupoDisponible = MAX_FOTOS_PUBLICAR - fotosBase64.length;
    if (cupoDisponible <= 0) {
      setApiError(`Ya alcanzaste el máximo de ${MAX_FOTOS_PUBLICAR} fotografías por publicación.`);
      return;
    }

    const seleccionados = archivos.slice(0, cupoDisponible);
    setProcesandoFotos(true);
    setApiError("");

    try {
      const nuevas: string[] = [];
      for (const file of seleccionados) {
        if (!file.type.startsWith("image/")) {
          setApiError("Solo se permiten archivos de imagen (JPG, PNG o WEBP).");
          continue;
        }
        const comprimida = await comprimirImagen(file);
        nuevas.push(comprimida);
      }

      if (nuevas.length > 0) {
        setFotosBase64((prev) => [...prev, ...nuevas].slice(0, MAX_FOTOS_PUBLICAR));
      }
    } catch {
      setApiError("No se pudieron procesar una o más imágenes. Intenta con JPG o PNG.");
    } finally {
      setProcesandoFotos(false);
    }
  };

  const eliminarFoto = (indice: number) => {
    setFotosBase64((prev) => prev.filter((_, i) => i !== indice));
  };

  const validarCampos = (): boolean => {
    const nuevosErrores: FormErrors = {};

    if (!formData.brand.trim()) {
      nuevosErrores.brand = "La marca es obligatoria";
    }
    if (!formData.model.trim()) {
      nuevosErrores.model = "El modelo es obligatorio";
    }

    const anio = Number(formData.year);
    if (!formData.year || isNaN(anio) || anio <= 2005) {
      nuevosErrores.year = "El año de la moto tiene que ser mayor al 2005";
    }

    const cc = Number(formData.displacement);
    if (!formData.displacement || isNaN(cc) || cc < 100 || cc > 1500) {
      nuevosErrores.displacement = "El cilindraje debe estar entre 100 y 1500 cc";
    }

    const placaLimpia = formData.licensePlate.trim().toUpperCase();
    if (!placaLimpia) {
      nuevosErrores.licensePlate = "La placa es obligatoria";
    } else if (!regexPlaca.test(placaLimpia)) {
      nuevosErrores.licensePlate = "Formato de placa inválido. Ej: ABC12D (3 letras, 2 números, 1 letra)";
    }

    const km = Number(formData.KM);
    if (formData.KM === "" || isNaN(km) || km < 0) {
      nuevosErrores.KM = "El kilometraje debe ser mayor o igual a 0";
    }

    if (!formData.color.trim()) {
      nuevosErrores.color = "El color es obligatorio";
    }

    const tarifa = Number(formData.dailyRate);
    if (!formData.dailyRate || isNaN(tarifa) || tarifa <= 0) {
      nuevosErrores.dailyRate = "Ingresa una tarifa diaria válida mayor a 0";
    }

    const descLimpia = formData.description.trim();
    if (descLimpia.length > 0 && descLimpia.length < 20) {
      nuevosErrores.description =
        "Si escribes una descripción, debe tener al menos 20 caracteres.";
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const tarifaDiaria = Number(formData.dailyRate) || 0;
  const comisionApp = tarifaDiaria * 0.15;
  const gananciaNetaDueno = tarifaDiaria - comisionApp;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError("");

    if (!validarCampos()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setApiError("Debes iniciar sesión para publicar una moto. No se encontró ninguna sesión activa.");
      return;
    }

    setCargando(true);

    const placaLimpia = formData.licensePlate.trim().toUpperCase();

    const bodyEnvio = {
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: Number(formData.year),
      licensePlate: placaLimpia,
      dailyRate: Number(formData.dailyRate),
      displacement: Number(formData.displacement),
      color: formData.color.trim(),
      KM: Number(formData.KM),
    };

    try {
      const response = await fetch(`${API_URL}/api/create/moto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyEnvio),
      });

      const data = await response.json();

      if (!response.ok) {
        // Lee cualquier variante de mensaje de error que pueda mandar el backend o middleware
        const mensajeBackend = data.mensaje || data.message || data.error || "No se pudo registrar la moto.";
        setApiError(mensajeBackend);
        setCargando(false);
        return;
      }

      // Si se guardó en la DB, subimos la galería (fotos + descripción) al endpoint real
      const motoIdCreada = data?.data?.id || data?.id;
      const descripcionLimpia = formData.description.trim();

      if (fotosBase64[0]) {
        localStorage.setItem(`foto_moto_${placaLimpia}`, fotosBase64[0]);
      }

      if (motoIdCreada && (fotosBase64.length > 0 || descripcionLimpia.length >= 20)) {
        const resGaleria = await actualizarGaleriaMoto(
          motoIdCreada,
          fotosBase64,
          descripcionLimpia || undefined
        );
        if (!resGaleria.ok) {
          setAvisoGaleria(
            "La motocicleta quedó registrada, pero no se pudo subir la galería completa. Podrás agregarla nuevamente después."
          );
        }
      }

      setCargando(false);
      setPublicadoExitoso(true);
    } catch (error) {
      console.error("Error al registrar moto:", error);
      setApiError("No se pudo conectar con el servidor backend en " + API_URL);
      setCargando(false);
    }
  };

  return (
    <div className="publish-page">
      <main className="publish-container">
        {publicadoExitoso ? (
          <div className="success-card">
            <div className="success-icon" style={{ color: "#15803D" }}>
              <IconCheckCircle size={42} />
            </div>
            <h2>Tu motocicleta fue registrada con éxito</h2>
            <p>
              Registramos tu <strong>{formData.brand} {formData.model}</strong> ({formData.licensePlate.toUpperCase()}).
            </p>
            <div className="review-badge">
              Estado: <span>DISPONIBLE EN CATÁLOGO</span>
            </div>
            <p className="review-info">
              {avisoGaleria ||
                "Los datos, descripción y galería de fotos se guardaron correctamente y ya aparecen en el catálogo."}
            </p>
            <div className="success-buttons">
              <Link to="/dashboard" className="btn-primary">
                Ir a mi panel
              </Link>
              <Link to="/motos" className="btn-secondary">
                Ver catálogo
              </Link>
            </div>
          </div>
        ) : (
          <div className="publish-card">
            <div className="publish-header">
              <span className="badge-owner">PANEL DE PROPIETARIOS</span>
              <h1>Publica tu moto y comienza a ganar</h1>
              <p>Completa los datos de tu vehículo para ponerlo en renta.</p>
            </div>

            {apiError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "24px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
                role="alert"
              >
                <IconAlert size={18} />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="publish-form" noValidate>
              <div className="form-section">
                <h3>1. Información del vehículo</h3>
                <div className="form-grid">
                  
                  {/* MARCA */}
                  <div className="form-group">
                    <label>Marca *</label>
                    <input
                      type="text"
                      name="brand"
                      placeholder="Ej. Yamaha, Honda, Suzuki"
                      value={formData.brand}
                      onChange={handleChange}
                      style={{ borderColor: errors.brand ? "#EF4444" : undefined }}
                    />
                    {errors.brand && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.brand}
                      </span>
                    )}
                  </div>

                  {/* MODELO */}
                  <div className="form-group">
                    <label>Modelo y Línea *</label>
                    <input
                      type="text"
                      name="model"
                      placeholder="Ej. MT-03, Pulsar NS200"
                      value={formData.model}
                      onChange={handleChange}
                      style={{ borderColor: errors.model ? "#EF4444" : undefined }}
                    />
                    {errors.model && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.model}
                      </span>
                    )}
                  </div>

                  {/* AÑO */}
                  <div className="form-group">
                    <label>Año * (Mayor a 2005)</label>
                    <input
                      type="number"
                      name="year"
                      placeholder="Ej. 2023"
                      value={formData.year}
                      onChange={handleChange}
                      style={{ borderColor: errors.year ? "#EF4444" : undefined }}
                    />
                    {errors.year && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.year}
                      </span>
                    )}
                  </div>

                  {/* CILINDRAJE */}
                  <div className="form-group">
                    <label>Cilindraje (cc) * (100 a 1500)</label>
                    <input
                      type="number"
                      name="displacement"
                      placeholder="Ej. 160, 250, 321"
                      value={formData.displacement}
                      onChange={handleChange}
                      style={{ borderColor: errors.displacement ? "#EF4444" : undefined }}
                    />
                    {errors.displacement && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.displacement}
                      </span>
                    )}
                  </div>

                  {/* PLACA */}
                  <div className="form-group">
                    <label>Placa del vehículo * (Formato: ABC12D)</label>
                    <input
                      type="text"
                      name="licensePlate"
                      placeholder="Ej. ABC12D"
                      maxLength={6}
                      value={formData.licensePlate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value.toUpperCase();
                        setFormData((prev) => ({ ...prev, licensePlate: val }));
                        if (errors.licensePlate) {
                          setErrors((prev) => ({ ...prev, licensePlate: undefined }));
                        }
                      }}
                      style={{ borderColor: errors.licensePlate ? "#EF4444" : undefined }}
                    />
                    {errors.licensePlate && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.licensePlate}
                      </span>
                    )}
                  </div>

                  {/* KILOMETRAJE */}
                  <div className="form-group">
                    <label>Kilometraje Actual (KM) *</label>
                    <input
                      type="number"
                      name="KM"
                      placeholder="Ej. 14500"
                      value={formData.KM}
                      onChange={handleChange}
                      style={{ borderColor: errors.KM ? "#EF4444" : undefined }}
                    />
                    {errors.KM && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.KM}
                      </span>
                    )}
                  </div>

                  {/* COLOR */}
                  <div className="form-group">
                    <label>Color *</label>
                    <input
                      type="text"
                      name="color"
                      placeholder="Ej. Negro Mate, Azul"
                      value={formData.color}
                      onChange={handleChange}
                      style={{ borderColor: errors.color ? "#EF4444" : undefined }}
                    />
                    {errors.color && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.color}
                      </span>
                    )}
                  </div>

                  {/* CATEGORÍA */}
                  <div className="form-group">
                    <label>Categoría recomendada *</label>
                    <select name="category" value={formData.category} onChange={handleChange}>
                      <option value="Uso diario">Uso Diario / Ciudad</option>
                      <option value="Viaje">Viaje y Turismo</option>
                      <option value="Trabajo">Trabajo y Mensajería</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: TARIFA */}
              <div className="form-section">
                <h3>2. Tarifa y ganancias</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>¿Cuánto quieres cobrar por día? (COP) *</label>
                    <input
                      type="number"
                      name="dailyRate"
                      placeholder="Ej. 65000"
                      step="1000"
                      value={formData.dailyRate}
                      onChange={handleChange}
                      style={{ borderColor: errors.dailyRate ? "#EF4444" : undefined }}
                    />
                    {errors.dailyRate && (
                      <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                        {errors.dailyRate}
                      </span>
                    )}
                    <small className="input-hint">
                      El precio promedio suele estar entre $35.000 y $90.000 COP/día.
                    </small>
                  </div>
                </div>

                {tarifaDiaria > 0 && (
                  <div className="earnings-preview">
                    <div className="earnings-row">
                      <span>Tarifa cobrada al cliente:</span>
                      <span>{tarifaDiaria.toLocaleString("es-CO")} COP</span>
                    </div>
                    <div className="earnings-row fee">
                      <span>Comisión de servicio MotoRent (15%):</span>
                      <span>- {comisionApp.toLocaleString("es-CO")} COP</span>
                    </div>
                    <div className="earnings-divider"></div>
                    <div className="earnings-row net">
                      <span>Tu ganancia neta por día:</span>
                      <strong className="net-amount">
                        {gananciaNetaDueno.toLocaleString("es-CO")} COP
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: DESCRIPCIÓN Y GALERÍA DE FOTOS */}
              <div className="form-section">
                <h3>3. Descripción y galería de fotografías</h3>

                <div className="form-group full-width" style={{ marginBottom: "18px" }}>
                  <label htmlFor="description">
                    Descripción para los arrendatarios (opcional, mín. 20 caracteres)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    maxLength={1200}
                    placeholder="Ej. Moto con mantenimiento reciente en taller oficial, llantas en excelente estado, ideal para trayectos diarios o carretera."
                    value={formData.description}
                    onChange={handleChange}
                    className="publish-textarea"
                    style={{ borderColor: errors.description ? "#EF4444" : undefined }}
                  />
                  {errors.description && (
                    <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                      {errors.description}
                    </span>
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="fotosMoto">
                    Fotografías del vehículo ({fotosBase64.length}/{MAX_FOTOS_PUBLICAR} — la primera será la portada)
                  </label>
                  <label htmlFor="fotosMoto" className="publish-upload-trigger">
                    <IconCamera size={18} />
                    <span>
                      {procesandoFotos
                        ? "Optimizando fotografías..."
                        : fotosBase64.length >= MAX_FOTOS_PUBLICAR
                        ? "Límite de 8 fotos alcanzado"
                        : "Seleccionar fotografías (hasta 8 en JPG, PNG o WEBP)"}
                    </span>
                  </label>
                  <input
                    id="fotosMoto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={procesandoFotos || fotosBase64.length >= MAX_FOTOS_PUBLICAR}
                    className="publish-file-hidden"
                    onChange={handleFotosChange}
                  />
                  <small className="input-hint">
                    Sube varios ángulos (frontal, laterales, tablero). Tras cada renta, la galería se actualizará con las fotos de inspección.
                  </small>

                  {fotosBase64.length > 0 && (
                    <div className="publish-photos-grid">
                      {fotosBase64.map((src, indice) => (
                        <div key={indice} className="publish-photo-item">
                          <img src={src} alt={`Vista previa ${indice + 1}`} />
                          {indice === 0 && (
                            <span className="publish-cover-badge">Portada</span>
                          )}
                          <button
                            type="button"
                            className="publish-remove-photo"
                            aria-label={`Quitar foto ${indice + 1}`}
                            onClick={() => eliminarFoto(indice)}
                          >
                            <IconClose size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BOTÓN ENVIAR */}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-submit-moto"
                  disabled={cargando}
                  style={{ opacity: cargando ? 0.7 : 1 }}
                >
                  {cargando ? "Guardando en la base de datos..." : "Publicar moto"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default PublicarMoto;