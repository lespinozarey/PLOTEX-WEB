import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXT_PERMITIDAS = [".pdf", ".dwg", ".jpg", ".jpeg", ".png"];
const MIME_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/acad",
  "image/vnd.dwg",
  "application/dwg",
  "application/x-dwg",
  "application/octet-stream", // muchos navegadores reportan .dwg asi
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unico}-${base}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = EXT_PERMITIDAS.includes(ext);
  const mimeOk = MIME_PERMITIDOS.includes(file.mimetype);

  // El .dwg no tiene un mimetype estandar entre navegadores, asi que
  // confiamos principalmente en la extension del archivo para ese caso.
  if (extOk && (mimeOk || ext === ".dwg")) {
    return cb(null, true);
  }
  cb(new Error("Formato no permitido. Solo se aceptan PDF, DWG, JPG o PNG."));
}

export const uploadArchivo = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter,
}).single("archivo");

// Envuelve multer para devolver errores en formato JSON consistente con el resto de la API
export function handleUpload(req, res, next) {
  uploadArchivo(req, res, (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "El archivo supera el limite de 20MB."
          : err.message || "No se pudo procesar el archivo adjunto.";
      return res.status(400).json({ ok: false, error: msg });
    }
    next();
  });
}
