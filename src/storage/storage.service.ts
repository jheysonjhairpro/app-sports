import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class StorageService {
  private log = new Logger(StorageService.name);
  private cloudName?: string;

  constructor(config: ConfigService) {
    this.cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME') || undefined;
    if (this.cloudName) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: config.get<string>('CLOUDINARY_API_KEY'),
        api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
        secure: true,
      });
    }
  }

  /** Sube una imagen (máx. 1200 px de lado, optimizada) y devuelve su URL. */
  async subirImagen(file: Express.Multer.File, carpeta: string): Promise<{ url: string }> {
    if (!this.cloudName) {
      throw new ServiceUnavailableException('El almacenamiento de imágenes no está configurado (Cloudinary)');
    }
    try {
      const res = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `grassfit/${carpeta}`,
            resource_type: 'image',
            transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
          },
          (err, result) => (err || !result ? reject(err ?? new Error('Sin respuesta de Cloudinary')) : resolve(result)),
        );
        stream.end(file.buffer);
      });
      return { url: res.secure_url };
    } catch (e) {
      this.log.error(`Fallo al subir imagen: ${(e as Error)?.message ?? e}`);
      throw new BadGatewayException('No se pudo subir la imagen. Intenta de nuevo');
    }
  }

  /** Borra de Cloudinary una imagen nuestra a partir de su URL. Nunca lanza error. */
  async eliminarPorUrl(url?: string | null): Promise<void> {
    const publicId = this.publicIdDesdeUrl(url);
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    } catch (e) {
      this.log.warn(`No se pudo borrar ${publicId}: ${(e as Error)?.message ?? e}`);
    }
  }

  /**
   * Patrón "reemplazar imagen": sube la nueva, guarda en BD y recién entonces borra la anterior.
   * Si falla el guardado, borra la imagen nueva para no dejar archivos huérfanos.
   * Sin archivo, solo ejecuta `guardar` sin tocar la imagen actual.
   */
  async conImagen<T>(
    file: Express.Multer.File | undefined,
    carpeta: string,
    anterior: string | null | undefined,
    guardar: (url?: string) => Promise<T>,
  ): Promise<T> {
    if (!file) return guardar(undefined);
    const { url } = await this.subirImagen(file, carpeta);
    try {
      const resultado = await guardar(url);
      void this.eliminarPorUrl(anterior);
      return resultado;
    } catch (e) {
      void this.eliminarPorUrl(url);
      throw e;
    }
  }

  private publicIdDesdeUrl(url?: string | null): string | null {
    if (!url || !this.cloudName) return null;
    try {
      const u = new URL(url);
      if (u.hostname !== 'res.cloudinary.com' || !u.pathname.startsWith(`/${this.cloudName}/`)) return null;
      const m = u.pathname.match(/\/upload\/(?:v\d+\/)?(.+)\.[A-Za-z0-9]+$/);
      const id = m ? decodeURIComponent(m[1]) : null;
      return id && id.startsWith('grassfit/') ? id : null; // solo tocamos nuestra carpeta
    } catch {
      return null;
    }
  }
}
