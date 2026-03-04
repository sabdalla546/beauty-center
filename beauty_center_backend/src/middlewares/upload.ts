// src/middlewares/upload.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const PRODUCTS_DIR = path.join(UPLOAD_ROOT, "products");
const SERVICES_DIR = path.join(UPLOAD_ROOT, "services");

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_MB || "5") * 1024 * 1024;

type UploadFolder = "products" | "services";

const ensureDirSync = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// ✅ create all folders once on module load (prevents ENOENT)
ensureDirSync(UPLOAD_ROOT);
ensureDirSync(PRODUCTS_DIR);
ensureDirSync(SERVICES_DIR);

const safeFilename = (originalname: string) => {
  const ext = path.extname(originalname).toLowerCase();
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
  const finalExt = allowedExt.includes(ext) ? ext : ".jpg";
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${finalExt}`;
};

const makeStorage = (folder: UploadFolder) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = folder === "products" ? PRODUCTS_DIR : SERVICES_DIR;
      ensureDirSync(dir); // extra safety
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
  });

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error("Invalid file type. Allowed: jpeg, png, webp"));
  }
  cb(null, true);
};

const makeUploader = (folder: UploadFolder) =>
  multer({
    storage: makeStorage(folder),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  });

export const uploadProductImage = makeUploader("products");
export const uploadServiceImage = makeUploader("services");

// اختياري: error handler
export const multerErrorHandler = (
  err: any,
  req: Request,
  res: any,
  next: any,
) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: {
        message: req.t?.("upload.file_too_large", "File too large"),
        code: "upload.file_too_large",
        maxMb: Number(process.env.UPLOAD_MAX_MB || "5"),
      },
    });
  }
  if (err) {
    return res.status(400).json({
      error: {
        message: err.message || "Upload error",
        code: "upload.error",
      },
    });
  }
  next();
};
