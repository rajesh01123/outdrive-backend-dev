import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { AppError } from './app-error.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Some clients (Flutter/Dio without a contentType) send every file as application/octet-stream,
// so fall back to the file extension in that case only.
const isAllowedImage = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (allowedMimeTypes.has(file.mimetype)) return true;
  return file.mimetype === 'application/octet-stream' && allowedExtensions.has(ext);
};

export const uploadDirectory = (folder) => path.resolve(process.cwd(), 'uploads', folder);

export const createImageUpload = ({ folder, field, maxSizeMb }) => {
  const directory = uploadDirectory(folder);
  fs.mkdirSync(directory, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, callback) => callback(null, directory),
      filename: (req, file, callback) => {
        const ext = path.extname(file.originalname).toLowerCase();
        callback(null, `${crypto.randomUUID()}${ext || '.jpg'}`);
      }
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
      if (!isAllowedImage(file)) return callback(new AppError(`${field}_must_be_jpeg_png_or_webp`, 422));
      callback(null, true);
    }
  });
};

export const storedUploadPath = (folder, file) => (file ? `uploads/${folder}/${file.filename}` : null);

// Only files inside uploads/ are removed, so a bad stored value can never delete anything else.
export const removeStoredUpload = async (storedPath) => {
  if (!storedPath || !storedPath.startsWith('uploads/')) return;
  const absolute = path.resolve(process.cwd(), storedPath);
  if (!absolute.startsWith(path.resolve(process.cwd(), 'uploads') + path.sep)) return;
  await fs.promises.unlink(absolute).catch(() => {});
};
