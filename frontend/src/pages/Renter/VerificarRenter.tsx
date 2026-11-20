import { useState } from "react";
import "./VerificarRenter.css";

function VerificarRenter() {
  const [step, setStep] = useState(1);

  const siguientePaso = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const pasoAnterior = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <main className="renter-page">
      <section className="renter-card">

        {/* Encabezado */}
        <header className="renter-header">
          <span className="renter-tag">MOTORENT</span>

          <h1>Verificación de arrendatario</h1>

          <p>
            Completa tu información para poder solicitar el alquiler
            de motocicletas dentro de MotoRent.
          </p>
        </header>

        {/* Indicador de pasos */}
        <div className="steps">
          <div className="step-item">
            <div className={`step-circle ${step >= 1 ? "active" : ""}`}>
              1
            </div>

            <span>Identidad</span>
          </div>

          <div
            className={`step-line ${step >= 2 ? "active-line" : ""}`}
          />

          <div className="step-item">
            <div className={`step-circle ${step >= 2 ? "active" : ""}`}>
              2
            </div>

            <span>Licencia</span>
          </div>

          <div
            className={`step-line ${step >= 3 ? "active-line" : ""}`}
          />

          <div className="step-item">
            <div className={`step-circle ${step >= 3 ? "active" : ""}`}>
              3
            </div>

            <span>Domicilio</span>
          </div>
        </div>

        {/* PASO 1 */}
        {step === 1 && (
          <div className="form-content">
            <div className="section-heading">
              <h2>Identificación personal</h2>
              <p>
                Necesitamos algunos datos para verificar tu identidad.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="cedulaNumero">
                Número de cédula
              </label>

              <input
                id="cedulaNumero"
                type="text"
                placeholder="Ej: 1023456789"
              />
            </div>

            <div className="documents-grid">
              <div className="upload-container">
                <label htmlFor="cedulaFront">
                  <div className="upload-box">
                    <div className="upload-icon">+</div>

                    <strong>Cédula frontal</strong>

                    <span>Sube una fotografía clara</span>

                    <small>PNG, JPG o WEBP</small>
                  </div>
                </label>

                <input
                  id="cedulaFront"
                  type="file"
                  accept="image/*"
                  hidden
                />
              </div>

              <div className="upload-container">
                <label htmlFor="cedulaBack">
                  <div className="upload-box">
                    <div className="upload-icon">+</div>

                    <strong>Cédula posterior</strong>

                    <span>Sube una fotografía clara</span>

                    <small>PNG, JPG o WEBP</small>
                  </div>
                </label>

                <input
                  id="cedulaBack"
                  type="file"
                  accept="image/*"
                  hidden
                />
              </div>
            </div>

            <div className="upload-container full-upload">
              <label htmlFor="photo">
                <div className="upload-box">
                  <div className="upload-icon">+</div>

                  <strong>Fotografía personal</strong>

                  <span>
                    Sube una fotografía reciente donde tu rostro
                    sea claramente visible
                  </span>

                  <small>PNG, JPG o WEBP</small>
                </div>
              </label>

              <input
                id="photo"
                type="file"
                accept="image/*"
                hidden
              />
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div className="form-content">
            <div className="section-heading">
              <h2>Licencia de conducción</h2>

              <p>
                Ingresa la información correspondiente a tu licencia
                de conducción.
              </p>
            </div>

            <div className="input-row">
              <div className="form-group">
                <label htmlFor="licenseNumber">
                  Número de licencia
                </label>

                <input
                  id="licenseNumber"
                  type="text"
                  placeholder="Número de licencia"
                />
              </div>

              <div className="form-group">
                <label htmlFor="licenseCategory">
                  Categoría
                </label>

                <select
                  id="licenseCategory"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Seleccionar
                  </option>

                  <option value="A1">
                    A1
                  </option>

                  <option value="A2">
                    A2
                  </option>
                </select>
              </div>
            </div>

            <div className="documents-grid">
              <div className="upload-container">
                <label htmlFor="licenseFront">
                  <div className="upload-box">
                    <div className="upload-icon">+</div>

                    <strong>Licencia frontal</strong>

                    <span>Fotografía de la parte frontal</span>

                    <small>PNG, JPG o WEBP</small>
                  </div>
                </label>

                <input
                  id="licenseFront"
                  type="file"
                  accept="image/*"
                  hidden
                />
              </div>

              <div className="upload-container">
                <label htmlFor="licenseBack">
                  <div className="upload-box">
                    <div className="upload-icon">+</div>

                    <strong>Licencia posterior</strong>

                    <span>Fotografía de la parte posterior</span>

                    <small>PNG, JPG o WEBP</small>
                  </div>
                </label>

                <input
                  id="licenseBack"
                  type="file"
                  accept="image/*"
                  hidden
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 3 */}
        {step === 3 && (
          <div className="form-content">
            <div className="section-heading">
              <h2>Comprobante de domicilio</h2>

              <p>
                Finalmente necesitamos comprobar tu lugar de residencia.
              </p>
            </div>

            <div className="info-box">
              <span className="info-icon">i</span>

              <div>
                <strong>¿Qué documento puedo utilizar?</strong>

                <p>
                  Puedes adjuntar un recibo reciente de agua,
                  electricidad, gas, internet u otro servicio público.
                </p>
              </div>
            </div>

            <div className="upload-container full-upload bill-upload">
              <label htmlFor="bill">
                <div className="upload-box">
                  <div className="upload-icon">+</div>

                  <strong>Comprobante de domicilio</strong>

                  <span>
                    Selecciona el recibo desde tu dispositivo
                  </span>

                  <small>PNG, JPG, WEBP o PDF</small>
                </div>
              </label>

              <input
                id="bill"
                type="file"
                accept="image/*,.pdf"
                hidden
              />
            </div>

            <div className="verification-box">
              <div className="verification-icon">✓</div>

              <div>
                <strong>Revisión de información</strong>

                <p>
                  Una vez envíes tu solicitud, tus documentos
                  quedarán pendientes de revisión antes de habilitar
                  las funciones de arrendatario.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navegación */}
        <footer className="form-actions">
          <div>
            {step > 1 && (
              <button
                type="button"
                className="back-button"
                onClick={pasoAnterior}
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
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              className="continue-button"
            >
              Enviar solicitud
            </button>
          )}
        </footer>

      </section>
    </main>
  );
}

export default VerificarRenter;