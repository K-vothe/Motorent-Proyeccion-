import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import DocumentoUploadBox from "../../components/DocumentoUploadBox";
import { enviarSolicitudVerificacion } from "../../services/verificacion.service";
import {
  construirFormDataOwner,
  crearArchivoCargado,
  validarArchivo,
  validarPasoDomicilio,
  validarPasoIdentidad,
  type ArchivoCargado,
  type ErroresFormulario,
} from "../../utils/verificacion.utils";
import "./VerificarOwner.css";

interface ArchivosOwner {
  cedulaFront: ArchivoCargado | null;
  cedulaBack: ArchivoCargado | null;
  photo: ArchivoCargado | null;
  bill: ArchivoCargado | null;
}

type CampoArchivoOwner = keyof ArchivosOwner;

function VerificarOwner() {
  // Paso actual del formulario (1: Identidad, 2: Domicilio)
  const [step, setStep] = useState<1 | 2>(1);

  // Datos de texto
  const [cedulaNumero, setCedulaNumero] = useState("");

  // Archivos cargados con vista previa local
  const [archivos, setArchivos] = useState<ArchivosOwner>({
    cedulaFront: null,
    cedulaBack: null,
    photo: null,
    bill: null,
  });

  // Estados de validación y envío
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [esSimulacion, setEsSimulacion] = useState(false);

  // Referencia para liberar URLs de vista previa cuando se cierre la pantalla
  const archivosRef = useRef<ArchivosOwner>(archivos);

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

  /** Limpia el error de un campo cuando el usuario vuelve a editarlo. */
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

  /** Valida y guarda un documento o fotografía seleccionada. */
  function manejarSeleccionArchivo(
    campo: CampoArchivoOwner,
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
      const anterior = prev[campo];
      if (anterior) {
        URL.revokeObjectURL(anterior.previewUrl);
      }
      return { ...prev, [campo]: nuevoArchivo };
    });

    limpiarError(campo);
  }

  /** Elimina un archivo cargado y libera su vista previa. */
  function manejarEliminarArchivo(campo: CampoArchivoOwner) {
    setArchivos((prev) => {
      const anterior = prev[campo];
      if (anterior) {
        URL.revokeObjectURL(anterior.previewUrl);
      }
      return { ...prev, [campo]: null };
    });
  }

  /** Valida el Paso 1 antes de avanzar al Paso 2. */
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
        setErrorGeneral(
          "Completa tu número de cédula y las 3 fotografías antes de continuar."
        );
        return;
      }

      setErrores({});
      setStep(2);
    }
  }

  /** Regresa al Paso 1 conservando los datos ingresados. */
  function pasoAnterior() {
    setErrorGeneral("");
    setErrores({});
    if (step === 2) {
      setStep(1);
    }
  }

  /** Valida el comprobante de domicilio y envía la solicitud de propietario. */
  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral("");

    const erroresPaso2 = validarPasoDomicilio({ bill: archivos.bill });
    if (Object.keys(erroresPaso2).length > 0) {
      setErrores(erroresPaso2);
      setErrorGeneral(
        "Debes adjuntar tu comprobante de domicilio para enviar la solicitud."
      );
      return;
    }

    setEnviando(true);

    const formData = construirFormDataOwner(
      {
        cedulaNumero,
        cedulaFront: archivos.cedulaFront,
        cedulaBack: archivos.cedulaBack,
        photo: archivos.photo,
      },
      {
        bill: archivos.bill,
      }
    );

    const respuesta = await enviarSolicitudVerificacion("owner", formData);

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
      <main className="owner-page">
        <section className="owner-card owner-success-card">
          <div className="owner-success-icon" aria-hidden="true">
            ✓
          </div>

          <span className="owner-status-pill">PENDIENTE DE REVISIÓN</span>

          <h1>¡Solicitud de propietario enviada!</h1>

          <p className="owner-success-text">
            Recibimos tu documentación correctamente. Validaremos tu identidad y
            comprobante de domicilio antes de habilitar la publicación de
            motocicletas en MotoRent.
          </p>

          <div className="owner-summary-box">
            <div>
              <span>Número de cédula</span>
              <strong>{cedulaNumero.trim()}</strong>
            </div>
            <div>
              <span>Documentos adjuntos</span>
              <strong>4 archivos verificados</strong>
            </div>
          </div>

          {esSimulacion && (
            <p className="owner-sim-notice">
              Modo prueba local (Fase 1): los datos fueron validados y guardados
              en estado pendiente local mientras se conecta el endpoint del backend.
            </p>
          )}

          <div className="owner-success-actions">
            <Link to="/dashboard" className="owner-continue-button owner-link-button">
              Ir a mi panel
            </Link>
            <Link to="/publicarmoto" className="owner-back-button owner-link-button">
              Ver formulario de moto
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="owner-page">
      <section className="owner-card">
        {/* Encabezado */}
        <header className="owner-header">
          <span className="owner-tag">MOTORENT</span>

          <h1>Verificación de propietario</h1>

          <p>
            Completa tu información para poder publicar motocicletas dentro de
            MotoRent.
          </p>
        </header>

        {/* Indicador de pasos */}
        <div className="owner-steps" aria-label={`Paso ${step} de 2`}>
          <div className="owner-step-item">
            <div className={`owner-step-circle ${step >= 1 ? "active" : ""}`}>
              {step > 1 ? "✓" : "1"}
            </div>
            <span>Identidad</span>
          </div>

          <div className={`owner-step-line ${step >= 2 ? "active-line" : ""}`} />

          <div className="owner-step-item">
            <div className={`owner-step-circle ${step >= 2 ? "active" : ""}`}>
              2
            </div>
            <span>Domicilio</span>
          </div>
        </div>

        {/* Banner de error general */}
        {errorGeneral && (
          <div className="owner-error-banner" role="alert">
            {errorGeneral}
          </div>
        )}

        <form onSubmit={manejarEnvio} noValidate>
          {/* PASO 1: IDENTIDAD */}
          {step === 1 && (
            <div className="owner-form-content">
              <div className="owner-section-heading">
                <h2>Identificación personal</h2>
                <p>
                  Necesitamos verificar tu identidad antes de permitir la
                  publicación de motocicletas.
                </p>
              </div>

              <div className="owner-form-group">
                <label htmlFor="cedulaNumero">Número de cédula *</label>
                <input
                  id="cedulaNumero"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Ej: 1023456789"
                  value={cedulaNumero}
                  className={errores.cedulaNumero ? "owner-input-error" : ""}
                  onChange={(e) => {
                    const soloDigitos = e.target.value.replace(/\D/g, "");
                    setCedulaNumero(soloDigitos);
                    limpiarError("cedulaNumero");
                  }}
                />
                {errores.cedulaNumero && (
                  <p className="owner-field-error-text" role="alert">
                    {errores.cedulaNumero}
                  </p>
                )}
              </div>

              <div className="owner-documents-grid">
                <DocumentoUploadBox
                  id="ownerCedulaFront"
                  titulo="Cédula frontal"
                  descripcion="Fotografía clara de la parte frontal"
                  formatos="PNG, JPG o WEBP (máx. 5 MB)"
                  archivo={archivos.cedulaFront}
                  error={errores.cedulaFront}
                  onSeleccionar={(file) =>
                    manejarSeleccionArchivo("cedulaFront", file)
                  }
                  onEliminar={() => manejarEliminarArchivo("cedulaFront")}
                />

                <DocumentoUploadBox
                  id="ownerCedulaBack"
                  titulo="Cédula posterior"
                  descripcion="Fotografía clara de la parte posterior"
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
                id="ownerPhoto"
                titulo="Fotografía personal"
                descripcion="Sube una fotografía reciente donde tu rostro sea claramente visible."
                formatos="PNG, JPG o WEBP (máx. 5 MB)"
                archivo={archivos.photo}
                error={errores.photo}
                anchoCompleto
                onSeleccionar={(file) => manejarSeleccionArchivo("photo", file)}
                onEliminar={() => manejarEliminarArchivo("photo")}
              />
            </div>
          )}

          {/* PASO 2: COMPROBANTE DE DOMICILIO */}
          {step === 2 && (
            <div className="owner-form-content">
              <div className="owner-section-heading">
                <h2>Comprobante de domicilio</h2>
                <p>
                  Adjunta un documento reciente que permita comprobar tu lugar
                  de residencia.
                </p>
              </div>

              <div className="owner-info-box">
                <span className="owner-info-icon" aria-hidden="true">
                  i
                </span>

                <div>
                  <strong>¿Qué documento puedo utilizar?</strong>
                  <p>
                    Puedes subir un recibo reciente de agua, electricidad, gas,
                    internet u otro servicio público.
                  </p>
                </div>
              </div>

              <DocumentoUploadBox
                id="ownerBill"
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

              <div className="owner-verification-box">
                <div className="owner-verification-icon" aria-hidden="true">
                  ✓
                </div>

                <div>
                  <strong>Verificación de propietario</strong>
                  <p>
                    Tu información será revisada antes de habilitar las
                    funciones necesarias para publicar motocicletas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación */}
          <footer className="owner-actions">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  className="owner-back-button"
                  onClick={pasoAnterior}
                  disabled={enviando}
                >
                  Anterior
                </button>
              )}
            </div>

            {step < 2 ? (
              <button
                type="button"
                className="owner-continue-button"
                onClick={siguientePaso}
              >
                Continuar
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                type="submit"
                className="owner-continue-button"
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

export default VerificarOwner;
