import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

/** Скачивает аудио по URL и возвращает текст через OpenAI Whisper. При ошибке возвращает пустую строку. */
@Injectable()
export class TranscribeService {
  async transcribeFromUrl(audioUrl: string, openaiApiKey: string): Promise<string> {
    if (!audioUrl?.trim() || !openaiApiKey?.startsWith('sk-')) return '';
    try {
      const res = await fetch(audioUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 25 * 1024 * 1024) return ''; // Whisper limit 25 MB
      const file = new File([buffer], 'audio.oga', { type: 'audio/ogg' });
      const client = new OpenAI({ apiKey: openaiApiKey });
      const transcription = await client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      return (transcription?.text ?? '').trim();
    } catch {
      return '';
    }
  }
}
