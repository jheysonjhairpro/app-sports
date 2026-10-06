import { BadRequestException } from '@nestjs/common';

/** Opciones de multer para imágenes: máx. 5 MB y solo JPG / PNG / WEBP. */
export const OPCIONES_IMAGEN = {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req: unknown, file: { mimetype: string }, cb: (error: Error | null, aceptar: boolean) => void) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP'), false);
    }
    cb(null, true);
  },
};
