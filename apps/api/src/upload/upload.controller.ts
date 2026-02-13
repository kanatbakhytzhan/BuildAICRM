import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/webm'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function getExtension(mimetype: string): string {
  const map: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/webm': '.webm',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  return map[mimetype] || '.bin';
}

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = [...ALLOWED_AUDIO, ...ALLOWED_IMAGE].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Недопустимый тип файла'), ok);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = getExtension(file.mimetype);
          const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
          cb(null, name);
        },
      }),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('Файл не загружен');
    let baseUrl = process.env.API_URL || process.env.PUBLIC_URL;
    if (!baseUrl) {
      const proto = req.get('x-forwarded-proto') || (req.protocol === 'https' ? 'https' : 'http');
      const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${process.env.PORT || 4000}`;
      baseUrl = `${proto}://${host}`;
    }
    const url = `${baseUrl.replace(/\/$/, '')}/uploads/${file.filename}`;
    return { url };
  }
}
