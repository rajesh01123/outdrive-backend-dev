import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { AppError } from './app-error.js';

const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'profiles');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadDirectory),
  filename: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${ext || '.jpg'}`);
  }
});

export const profileUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new AppError('profile_picture_must_be_jpeg_png_or_webp', 422));
    callback(null, true);
  }
});

export const storedProfilePath = (file) => (file ? `uploads/profiles/${file.filename}` : null);
