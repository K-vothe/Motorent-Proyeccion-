import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import DocumentoUploadBox from "../../components/DocumentoUploadBox";
import { enviarSolicitudVerificacion } from "../../services/verificacion.service";
import {
  construirFormDataRenter,
  crearArchivoCargado,
  validarArchivo,
  validarPasoDomicilio,
  validarPasoIdentidad,
  validarPasoLicencia,
  type ArchivoCargado,
  type ErroresFormulario,
} from "../../utils/verificacion.utils";
import "./VerificarRenter.css";

interface ArchivosRenter {
  cedulaFront: ArchivoCargado | null;
  cedulaBack: ArchivoCargado | null;
  photo: ArchivoCargado | null;
  licenseFront: ArchivoCargado | null;
  licenseBack: ArchivoCargado | null;
  bill: ArchivoCargado | null;
}

type CampoArchivoRenter = keyof ArchivosRenter;

function VerificarRenter() {
  // Paso actual del formulario (1: Identidad, 2: Licencia, 3: Domicilio)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Datos de texto y selección
  const [cedulaNumero, setCedulaNumero] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("");

  // Archivos cargados con su vista previa local
  const [archivos, setArchivos] = useState<ArchivosRenter>({
    cedulaFront: null,
    cedulaBack: null,
    photo: null,
    licenseFront: null,
    licenseBack: null,
    bill: null,
  });

  // Estados de validación y envío
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [esSimulacion, setEsSimulacion] = useState(false);

  // Referencia para liberar las URLs de vista previa al desmontar el componente
  const archivosRef = useRef<ArchivosRenter>(archivos);

  useEffect(() => {
    archivosRef.current = archivos;
  }, [archivos]);

  useEffect(() => {
    return () => {
      Object.values(archivosRef.current).forEach((item) => {
        if (item) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  /** Elimina el mensaje de error de un campo específico cuando el usuario lo corrige. */
  function limpiarError(campo: string) {
    setErrores((prev) => {
      if (!prev[campo]) return prev;
      const copia = { ...prev };
      delete copia[campo];
      return copia;
    });
    if (errorGeneral) {
      setErrorGeneral("");
    }
  }

  /** Valida y guarda un archivo seleccionado por el usuario. */
  function manejarSeleccionArchivo(
    campo: CampoArchivoRenter,
    file: File,
    permitirPdf = false
  ) {
    const errorArchivo = validarArchivo(file, permitirPdf);

    if (errorArchivo) {
      setErrores((prev) => ({ ...prev, [campo]: errorArchivo }));
      return;
    }

    const nuevoArchivo = crearArchivoCargado(file);

    setArchivos((prev) => {
      // Si ya había un archivo previo en este campo, liberamos su memoria
      const anterior = prev[campo];
      if (anterior) {
        URL.revokeObjectURL(anterior.previewUrl);
      }
      return { ...prev, [campo]: nuevoArchivo };
    });

    limpiarError(campo);
  }

  /** Elimina un archivo cargado y libera su vista previa en memoria. */
  function manejarEliminarArchivo(campo: CampoArchivoRenter) {
    setArchivos((prev) => {
      const anterior = prev[campo];
      if (anterior) {
        URL.revokeObjectURL(anterior.previewUrl);
      }
      return { ...prev, [campo]: null };
    });
  }

  /** Valida el paso actual antes de permitir avanzar al siguiente. */
  function siguientePaso() {
    setErrorGeneral("");

    if (step === 1) {
      const erroresPaso1 = validarPasoIdentidad({
        cedulaNumero,
        cedulaFront: archivos.cedulaFront,
        cedulaBack: archivos.cedulaBack,
        photo: archivos.photo,
      });

      if (Object.keys(erroresPaso1).length > 0) {
        setErrores(erroresPaso1);
        setErrorGeneral("Completa todos los campos requeridos del Paso 1 antes de continuar.");
        return;
      }

      setErrores({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const erroresPaso2 = validarPasoLicencia({
        licenseNumber,
        licenseCategory,
        licenseFront: archivos.licenseFront,
        licenseBack: archivos.licenseBack,
      });

      if (Object.keys(erroresPaso2).length > 0) {
        setErrores(erroresPaso2);
        setErrorGeneral("Completa los datos y fotos de tu licencia antes de continuar.");
        return;
      }

      setErrores({});
      setStep(3);
    }
  }

  /** Regresa al paso anterior sin perder la información ya escrita. */
  function pasoAnterior() {
    setErrorGeneral("");
    setErrores({});
    if (step === 3) setStep(2);
    if (step === 2) setStep(1);
  }

  /** Valida el último paso y envía la solicitud de verificación. */
  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral("");

    const erroresPaso3 = validarPasoDomicilio({ bill: archivos.bill });
    if (Object.keys(erroresPaso3).length > 0) {
      setErrores(erroresPaso3);
      setErrorGeneral("Debes adjuntar tu comprobante de domicilio para enviar la solicitud.");
      return;
    }

    setEnviando(true);

    const formData = construirFormDataRenter(
      {
        cedulaNumero,
        cedulaFront: archivos.cedulaFront,
        cedulaBack: archivos.cedulaBack,
        photo: archivos.photo,
      },
      {
        licenseNumber,
        licenseCategory,
        licenseFront: archivos.licenseFront,
        licenseBack: archivos.licenseBack,
      },
      {
        bill: archivos.bill,
      }
    );

    const respuesta = await enviarSolicitudVerificacion("renter", formData);

    setEnviando(false);

    if (!respuesta.ok) {
      setErrorGeneral(respuesta.mensaje);
      return;
    }

    setEsSimulacion(Boolean(respuesta.simulado));
    setSolicitudEnviada(true);
  }

  // Vista de confirmación cuando el formulario fue enviado correctamente
  if (solicitudEnviada) {
    return (
      <main className="renter-page">
        <section className="renter-card renter-success-card">
          <div className="renter-success-icon" aria-hidden="true">
            ✓
          </div>

          <span className="renter-status-pill">PENDIENTE DE REVISIÓN</span>

          <h1>¡Solicitud de arrendatario enviada!</h1>

          <p className="renter-success-text">
            Recibimos tus documentos correctamente. Nuestro equipo validará tu
            cédula, tu licencia categoría <strong>{licenseCategory}</strong> y
            tu comprobante de domicilio antes de habilitar tus alquileres.
          </p>

          <div className="renter-summary-box">
            <div>
              <span>Número de cédula</span>
              <strong>{cedulaNumero.trim()}</strong>
            </div>
            <div>
              <span>Número de licencia</span>
              <strong>{licenseNumber.trim()}</strong>
            </div>
            <div>
              <span>Categoría</span>
              <strong>{licenseCategory}</strong>
            </div>
          </div>

          {esSimulacion && (
            <p className="renter-sim-notice">
              Modo prueba local (Fase 1): los datos fueron validados y guardados
              en estado pendiente local mientras se conecta el endpoint del backend.
            </p>
          )}

          <div className="renter-success-actions">
            <Link to="/dashboard" className="continue-button link-button">
              Ir a mi panel
            </Link>
            <Link to="/motos" className="back-button link-button">
              Ver catálogo de motos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="renter-page">
      <section className="renter-card">
        {/* Encabezado */}
        <header className="renter-header">
          <span className="renter-tag">MOTORENT</span>

          <h1>Verificación de arrendatario</h1>

          <p>
            Completa tu información para poder solicitar el alquiler de
            motocicletas dentro de MotoRent.
          </p>
        </header>

        {/* Indicador de pasos */}
        <div className="steps" aria-label={`Paso ${step} de 3`}>
          <div className="step-item">
            <div className={`step-circle ${step >= 1 ? "active" : ""}`}>
              {step > 1 ? "✓" : "1"}
            </div>
            <span>Identidad</span>
          </div>

          <div className={`step-line ${step >= 2 ? "active-line" : ""}`} />

          <div className="step-item">
            <div className={`step-circle ${step >= 2 ? "active" : ""}`}>
              {step > 2 ? "✓" : "2"}
            </div>
            <span>Licencia</span>
          </div>

          <div className={`step-line ${step >= 3 ? "active-line" : ""}`} />

          <div className="step-item">
            <div className={`step-circle ${step >= 3 ? "active" : ""}`}>3</div>
            <span>Domicilio</span>
          </div>
        </div>

        {/* Banner de error general del paso o del envío */}
        {errorGeneral && (
          <div className="renter-error-banner" role="alert">
            {errorGeneral}
          </div>
        )}

        <form onSubmit={manejarEnvio} noValidate>
          {/* PASO 1: IDENTIDAD */}
          {step === 1 && (
            <div className="form-content">
              <div className="section-heading">
                <h2>Identificación personal</h2>
                <p>Necesitamos algunos datos para verificar tu identidad.</p>
              </div>

              <div className="form-group">
                <label htmlFor="cedulaNumero">Número de cédula *</label>
                <input
                  id="cedulaNumero"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Ej: 1023456789"
                  value={cedulaNumero}
                  className={errores.cedulaNumero ? "input-error" : ""}
                  onChange={(e) => {
                    // Permitimos ingresar solo dígitos para evitar errores de formato
                    const soloDigitos = e.target.value.replace(/\D/g, "");
                    setCedulaNumero(soloDigitos);
                    limpiarError("cedulaNumero");
                  }}
                />
                {errores.cedulaNumero && (
                  <p className="field-error-text" role="alert">
                    {errores.cedulaNumero}
                  </p>
                )}
              </div>

              <div className="documents-grid">
                <DocumentoUploadBox
                  id="cedulaFront"
                  titulo="Cédula frontal"
                  descripcion="Sube una fotografía clara"
                  formatos="PNG, JPG o WEBP (máx. 5 MB)"
                  archivo={archivos.cedulaFront}
                  error={errores.cedulaFront}
                  onSeleccionar={(file) =>
                    manejarSeleccionArchivo("cedulaFront", file)
                  }
                  onEliminar={() => manejarEliminarArchivo("cedulaFront")}
                />

                <DocumentoUploadBox
                  id="cedulaBack"
                  titulo="Cédula posterior"
                  descripcion="Sube una fotografía clara"
                  formatos="PNG, JPG o WEBP (máx. 5 MB)"
                  archivo={archivos.cedulaBack}
                  error={errores.cedulaBack}
                  onSeleccionar={(file) =>
                    manejarSeleccionArchivo("cedulaBack", file)
                  }
                  onEliminar={() => manejarEliminarArchivo("cedulaBack")}
                />
              </div>

              <DocumentoUploadBox
                id="photo"
                titulo="Fotografía personal"
                descripcion="Sube una fotografía reciente donde tu rostro sea claramente visible"
                formatos="PNG, JPG o WEBP (máx. 5 MB)"
                archivo={archivos.photo}
                error={errores.photo}
                anchoCompleto
                onSeleccionar={(file) => manejarSeleccionArchivo("photo", file)}
                onEliminar={() => manejarEliminarArchivo("photo")}
              />
            </div>
          )}

          {/* PASO 2: LICENCIA DE CONDUCCIÓN */}
          {step === 2 && (
            <div className="form-content">
              <div className="section-heading">
                <h2>Licencia de conducción</h2>
                <p>
                  Ingresa la información correspondiente a tu licencia de
                  conducción para motocicleta.
                </p>
              </div>

              <div className="input-row">
                <div className="form-group">
                  <label htmlFor="licenseNumber">Número de licencia *</label>
                  <input
                    id="licenseNumber"
                    type="text"
                    maxLength={15}
                    placeholder="Ej: 1023456789"
                    value={licenseNumber}
                    className={errores.licenseNumber ? "input-error" : ""}
                    onChange={(e) => {
                      setLicenseNumber(e.target.value);
                      limpiarError("licenseNumber");
                    }}
                  />
                  {errores.licenseNumber && (
                    <p className="field-error-text" role="alert">
                      {errores.licenseNumber}
                    </p>
                  )}
                  {cedulaNumero.trim() &&
                    licenseNumber.trim() !== cedulaNumero.trim() && (
                      <div
                        style={{
                          marginTop: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          flexWrap: "wrap",
                          fontSize: "12px",
                          color: "var(--text-muted, #64748B)",
                        }}
                      >
                        <span>
                          En Colombia la licencia suele coincidir con tu cédula.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLicenseNumber(cedulaNumero.trim());
                            limpiarError("licenseNumber");
                          }}
                          style={{
                            border: "none",
                            background: "none",
                            color: "var(--accent, #FF6A3D)",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Usar mi cédula ({cedulaNumero.trim()})
                        </button>
                      </div>
                    )}
                </div>

                <div className="form-group">
                  <label htmlFor="licenseCategory">Categoría *</label>
                  <select
                    id="licenseCategory"
                    value={licenseCategory}
                    className={errores.licenseCategory ? "input-error" : ""}
                    onChange={(e) => {
                      setLicenseCategory(e.target.value);
                      limpiarError("licenseCategory");
                    }}
                  >
                    <option value="" disabled>
                      Seleccionar
                    </option>
                    <option value="A1">A1 (Hasta 125 cc)</option>
                    <option value="A2">A2 (Cualquier cilindraje)</option>
                  </select>
                  {errores.licenseCategory && (
                    <p className="field-error-text" role="alert">
                      {errores.licenseCategory}
                    </p>
                  )}
                </div>
              </div>

              <div className="documents-grid">
                <DocumentoUploadBox
                  id="licenseFront"
                  titulo="Licencia frontal"
                  descripcion="Fotografía de la parte frontal"
                  formatos="PNG, JPG o WEBP (máx. 5 MB)"
                  archivo={archivos.licenseFront}
                  error={errores.licenseFront}
                  onSeleccionar={(file) =>
                    manejarSeleccionArchivo("licenseFront", file)
                  }
                  onEliminar={() => manejarEliminarArchivo("licenseFront")}
                />

                <DocumentoUploadBox
                  id="licenseBack"
                  titulo="Licencia posterior"
                  descripcion="Fotografía de la parte posterior"
                  formatos="PNG, JPG o WEBP (máx. 5 MB)"
                  archivo={archivos.licenseBack}
                  error={errores.licenseBack}
                  onSeleccionar={(file) =>
                    manejarSeleccionArchivo("licenseBack", file)
                  }
                  onEliminar={() => manejarEliminarArchivo("licenseBack")}
                />
              </div>
            </div>
          )}

          {/* PASO 3: DOMICILIO */}
          {step === 3 && (
            <div className="form-content">
              <div className="section-heading">
                <h2>Comprobante de domicilio</h2>
                <p>
                  Finalmente necesitamos comprobar tu lugar de residencia.
                </p>
              </div>

              <div className="info-box">
                <span className="info-icon" aria-hidden="true">
                  i
                </span>

                <div>
                  <strong>¿Qué documento puedo utilizar?</strong>
                  <p>
                    Puedes adjuntar un recibo reciente de agua, electricidad,
                    gas, internet u otro servicio público.
                  </p>
                </div>
              </div>

              <div className="bill-upload">
                <DocumentoUploadBox
                  id="bill"
                  titulo="Comprobante de domicilio"
                  descripcion="Selecciona el recibo desde tu dispositivo"
                  formatos="PNG, JPG, WEBP o PDF (máx. 5 MB)"
                  accept="image/png,image/jpeg,image/webp,.pdf,application/pdf"
                  archivo={archivos.bill}
                  error={errores.bill}
                  anchoCompleto
                  onSeleccionar={(file) =>
                    manejarSeleccionArchivo("bill", file, true)
                  }
                  onEliminar={() => manejarEliminarArchivo("bill")}
                />
              </div>

              <div className="verification-box">
                <div className="verification-icon" aria-hidden="true">
                  ✓
                </div>

                <div>
                  <strong>Revisión de información</strong>
                  <p>
                    Una vez envíes tu solicitud, tus documentos quedarán
                    pendientes de revisión antes de habilitar las funciones de
                    arrendatario.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navegación entre pasos */}
          <footer className="form-actions">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  className="back-button"
                  onClick={pasoAnterior}
                  disabled={enviando}
                >
                  Anterior
                </button>
              )}
            </div>

            {step < 3 ? (
              <button
                type="button"
                className="continue-button"
                onClick={siguientePaso}
              >
                Continuar
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                type="submit"
                className="continue-button"
                disabled={enviando}
              >
                {enviando ? "Enviando solicitud..." : "Enviar solicitud"}
              </button>
            )}
          </footer>
        </form>
      </section>
    </main>
  );
}

export default VerificarRenter;
