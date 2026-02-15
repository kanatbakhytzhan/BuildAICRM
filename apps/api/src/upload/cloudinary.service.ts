import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    this.enabled = !!(cloudName && apiKey && apiSecret);
    if (this.enabled) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Загружает буфер в Cloudinary. Возвращает public URL или null при ошибке.
   */
  async uploadBuffer(buffer: Buffer, options?: { resourceType?: 'image' | 'video' | 'raw'; folder?: string }): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const stream = Readable.from(buffer);
      return new Promise<string | null>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: options?.resourceType ?? 'auto', folder: options?.folder ?? 'buildcrm' },
          (err, result) => {
            if (err) reject(err);
            else resolve(result?.secure_url ?? null);
          },
        );
        stream.pipe(uploadStream);
      });
    } catch {
      return null;
    }
  }

  /**
   * Загружает файл по URL в Cloudinary. Возвращает public URL или null.
   */
  async uploadFromUrl(url: string, options?: { resourceType?: 'image' | 'video' | 'raw'; folder?: string }): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const result = await cloudinary.uploader.upload(url, {
        resource_type: options?.resourceType ?? 'auto',
        folder: options?.folder ?? 'buildcrm',
      });
      return result?.secure_url ?? null;
    } catch {
      return null;
    }
  }
}
