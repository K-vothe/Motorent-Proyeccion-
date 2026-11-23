import type { ChangeEvent } from "react";
import {
  formatearTamanoArchivo,
  type ArchivoCargado,
} from "../utils/verificacion.utils";
import "./DocumentoUploadBox.css";

interface DocumentoUploadBoxProps {
  /** Identificador único del input file (vincula el label con el input). */
  id: string;
  /** Título visible dentro del recuadro (ej. "Cédula frontal"). */
  titulo: string;
  /** Instrucción corta para orientar al usuario. */
  descripcion: string;
  /** Texto de formatos aceptados (ej. "PNG, JPG o WEBP"). */
  formatos: string;
  /** Valor del atributo HTML accept (por defecto solo imágenes). */
  accept?: string;
  /** Archivo actualmente seleccionado o null si está vacío. */
  archivo: ArchivoCargado | null;
  /** Mensaje de error a mostrar debajo del recuadro, si existe. */
  error?: string;
  /** Si es true, ocupa el ancho completo del formulario. */
  anchoCompleto?: boolean;
  /** Se ejecuta cuando el usuario elige un archivo desde su dispositivo. */
  onSeleccionar: (file: File) => void;
  /** Se ejecuta cuando el usuario pulsa "Quitar" para limpiar el archivo. */
  onEliminar: () => void;
}

/**
 * Componente reutilizable para la carga de documentos e imágenes en los
 * formularios de verificación (Arrendatario y Propietario).
 *
 * Maneja 3 estados visuales claros:
 *  - Vacío: recuadro punteado con ícono "+" para seleccionar archivo.
 *  - Cargado: vista previa de imagen (o insignia PDF), nombre, tamaño y botones Cambiar / Quitar.
 *  - Error: borde rojo y mensaje descriptivo debajo del campo.
 */
function DocumentoUploadBox({
  id,
  titulo,
  descripcion,
  formatos,
  accept = "image/png,image/jpeg,image/webp",
  archivo,
  error,
  anchoCompleto = false,
  onSeleccionar,
  onEliminar,
}: DocumentoUploadBoxProps) {
  function manejarCambio(evento: ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];
    if (file) {
      onSeleccionar(file);
    }
    // Limpiamos el valor del input para permitir volver a subir el mismo archivo
    // si el usuario lo elimina y lo selecciona de nuevo.
    evento.target.value = "";
  }

  const clasesCaja = [
    "doc-upload-box",
    archivo ? "doc-upload-box--loaded" : "",
    error ? "doc-upload-box--error" : "",
    anchoCompleto ? "doc-upload-box--full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`doc-upload-container ${
        anchoCompleto ? "doc-upload-container--full" : ""
      }`}
    >
      {/* Input oculto controlado mediante <label htmlFor={id}> */}
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={manejarCambio}
        hidden
      />

      {!archivo ? (
        /* ESTADO 1: VACÍO (Esperando archivo) */
        <label htmlFor={id} className={clasesCaja}>
          <div className="doc-upload-icon" aria-hidden="true">
            +
          </div>
          <strong className="doc-upload-title">{titulo}</strong>
          <span className="doc-upload-desc">{descripcion}</span>
          <small className="doc-upload-formats">{formatos}</small>
        </label>
      ) : (
        /* ESTADO 2: ARCHIVO CARGADO (Con vista previa y acciones) */
        <div className={clasesCaja}>
          <div className="doc-preview-header">
            <span className="doc-loaded-badge">✓ Cargado</span>
            <strong className="doc-upload-title">{titulo}</strong>
          </div>

          <div className="doc-preview-body">
            {archivo.esPdf ? (
              <div className="doc-pdf-badge" aria-label="Documento PDF">
                PDF
              </div>
            ) : (
              <img
                src={archivo.previewUrl}
                alt={`Vista previa de ${titulo}`}
                className="doc-preview-thumb"
              />
            )}

            <div className="doc-file-meta">
              <span className="doc-file-name" title={archivo.file.name}>
                {archivo.file.name}
              </span>
              <small className="doc-file-size">
                {formatearTamanoArchivo(archivo.file.size)}
              </small>
            </div>
          </div>

          <div className="doc-preview-actions">
            <label htmlFor={id} className="doc-btn-change">
              Cambiar
            </label>
            <button
              type="button"
              className="doc-btn-remove"
              onClick={onEliminar}
            >
              Quitar
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de error debajo del recuadro */}
      {error && (
        <p className="doc-upload-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default DocumentoUploadBox;
