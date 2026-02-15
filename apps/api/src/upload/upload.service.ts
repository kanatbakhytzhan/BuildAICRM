import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class UploadService {
  constructor(private cloudinary: CloudinaryService) {}

  /**
   * Скачивает файл по URL и загружает в Cloudinary (если настроен) или сохраняет в uploads.
   * Возвращает постоянный public URL (Cloudinary) или путь /uploads/filename.
   */
  async saveFromUrl(mediaUrl: string): Promise<string | null> {
    try {
      const res = await fetch(mediaUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (this.cloudinary.isEnabled()) {
        const cloudUrl = await this.cloudinary.uploadBuffer(buf);
        if (cloudUrl) return cloudUrl;
      }
      const contentType = res.headers.get('content-type') || '';
      const ext = contentType.includes('ogg') ? '.ogg' : contentType.includes('mpeg') || contentType.includes('mp3') ? '.mp3' : contentType.includes('m4a') || contentType.includes('mp4') ? '.m4a' : contentType.includes('webm') ? '.webm' : '.ogg';
      const filename = `voice-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buf);
      return `/uploads/${filename}`;
    } catch {
      return null;
    }
  }
}
