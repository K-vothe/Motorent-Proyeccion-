import { useState } from "react";
import "./VerificarOwner.css";

function VerificarOwner() {
  const [step, setStep] = useState(1);

  const siguientePaso = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const pasoAnterior = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <main className="owner-page">
      <section className="owner-card">

        {/* Encabezado */}
        <header className="owner-header">
          <span className="owner-tag">MOTORENT</span>

          <h1>Verificación de propietario</h1>

          <p>
            Completa tu información para poder publicar motocicletas
            dentro de MotoRent.
          </p>
        </header>

        {/* Pasos */}
        <div className="owner-steps">

          <div className="owner-step-item">
            <div
              className={`owner-step-circle ${
                step >= 1 ? "active" : ""
              }`}
            >
              1
            </div>

            <span>Identidad</span>
          </div>

          <div
            className={`owner-step-line ${
              step >= 2 ? "active-line" : ""
            }`}
          />

          <div className="owner-step-item">
            <div
              className={`owner-step-circle ${
                step >= 2 ? "active" : ""
              }`}
            >
              2
            </div>

            <span>Domicilio</span>
          </div>

        </div>

        {/* ========================= */}
        {/* PASO 1 */}
        {/* ========================= */}

        {step === 1 && (
          <div className="owner-form-content">

            <div className="owner-section-heading">
              <h2>Identificación personal</h2>

              <p>
                Necesitamos verificar tu identidad antes de permitir
                la publicación de motocicletas.
              </p>
            </div>

            <div className="owner-form-group">
              <label htmlFor="cedulaNumero">
                Número de cédula
              </label>

              <input
                id="cedulaNumero"
                type="text"
                placeholder="Ej: 1023456789"
              />
            </div>

            <div className="owner-documents-grid">

              {/* Cédula frontal */}

              <div className="owner-upload-container">
                <label htmlFor="cedulaFront">
                  <div className="owner-upload-box">

                    <div className="owner-upload-icon">
                      +
                    </div>

                    <strong>
                      Cédula frontal
                    </strong>

                    <span>
                      Fotografía clara de la parte frontal
                    </span>

                    <small>
                      PNG, JPG o WEBP
                    </small>

                  </div>
                </label>

                <input
                  id="cedulaFront"
                  type="file"
                  accept="image/*"
                  hidden
                />
              </div>

              {/* Cédula posterior */}

              <div className="owner-upload-container">
                <label htmlFor="cedulaBack">
                  <div className="owner-upload-box">

                    <div className="owner-upload-icon">
                      +
                    </div>

                    <strong>
                      Cédula posterior
                    </strong>

                    <span>
                      Fotografía clara de la parte posterior
                    </span>

                    <small>
                      PNG, JPG o WEBP
                    </small>

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

            {/* Fotografía personal */}

            <div className="owner-upload-container owner-full-upload">

              <label htmlFor="photo">
                <div className="owner-upload-box">

                  <div className="owner-upload-icon">
                    +
                  </div>

                  <strong>
                    Fotografía personal
                  </strong>

                  <span>
                    Sube una fotografía reciente donde tu rostro
                    sea claramente visible.
                  </span>

                  <small>
                    PNG, JPG o WEBP
                  </small>

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

        {/* ========================= */}
        {/* PASO 2 */}
        {/* ========================= */}

        {step === 2 && (
          <div className="owner-form-content">

            <div className="owner-section-heading">
              <h2>Comprobante de domicilio</h2>

              <p>
                Adjunta un documento reciente que permita comprobar
                tu lugar de residencia.
              </p>
            </div>

            <div className="owner-info-box">

              <span className="owner-info-icon">
                i
              </span>

              <div>
                <strong>
                  ¿Qué documento puedo utilizar?
                </strong>

                <p>
                  Puedes subir un recibo reciente de agua,
                  electricidad, gas, internet u otro servicio público.
                </p>
              </div>

            </div>

            {/* Recibo */}

            <div className="owner-upload-container owner-full-upload">

              <label htmlFor="bill">
                <div className="owner-upload-box">

                  <div className="owner-upload-icon">
                    +
                  </div>

                  <strong>
                    Comprobante de domicilio
                  </strong>

                  <span>
                    Selecciona el recibo desde tu dispositivo
                  </span>

                  <small>
                    PNG, JPG, WEBP o PDF
                  </small>

                </div>
              </label>

              <input
                id="bill"
                type="file"
                accept="image/*,.pdf"
                hidden
              />

            </div>

            {/* Aviso */}

            <div className="owner-verification-box">

              <div className="owner-verification-icon">
                ✓
              </div>

              <div>
                <strong>
                  Verificación de propietario
                </strong>

                <p>
                  Tu información será revisada antes de habilitar
                  las funciones necesarias para publicar motocicletas.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* Botones */}

        <footer className="owner-actions">

          <div>
            {step > 1 && (
              <button
                type="button"
                className="owner-back-button"
                onClick={pasoAnterior}
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
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              className="owner-continue-button"
            >
              Enviar solicitud
            </button>
          )}

        </footer>

      </section>
    </main>
  );
}

export default VerificarOwner;