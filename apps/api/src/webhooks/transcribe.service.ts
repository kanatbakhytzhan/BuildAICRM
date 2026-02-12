import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

/** Подсказка по лексике для Whisper: продукция и типичные фразы на русском и казахском. Улучшает распознавание казахской речи. */
const VOCAB_PROMPT =
  'панели сэндвич панель ламинат линолеум погрузчик трактор техника квадрат метр цена тенге Алматы доставка склад дом фасад утепление площадь размеры адрес где находитесь две недели купить. ' +
  'панельдер ламинат линолеум жүк көтергіш трактор техника қала көлем баға сұрау тауар квадрат метр тенге Алматы жеткізу қойма үй фасад жылу изоляция алаң. ' +
  'сатып алу жоспарлап отырсыз мәліметтер қажеттіліктер қызықтырады анықтау үлгі сипаттама жұмыс нақтылау сұрақ жауап беремін. ' +
  'Сәлеметсіз бе сәлем маған керек алу өгереге жүк көлем баға тауар ұйқапта упаковка объём.';

/** Скачивает аудио по URL и возвращает текст через OpenAI Whisper. Поддерживает русский и казахский. */
@Injectable()
export class TranscribeService {
  /**
   * @param audioUrl — ссылка на аудио (ChatFlow mediaData.url)
   * @param openaiApiKey — ключ OpenAI
   * @param options.prompt — подсказка по лексике. По умолчанию VOCAB_PROMPT.
   * @param options.language — код языка: 'kk' (казахский) или 'ru' (русский). Если задан, Whisper использует его и распознавание точнее.
   */
  async transcribeFromUrl(
    audioUrl: string,
    openaiApiKey: string,
    options?: { prompt?: string | null; language?: string | null },
  ): Promise<string> {
    if (!audioUrl?.trim() || !openaiApiKey?.startsWith('sk-')) return '';
    try {
      const res = await fetch(audioUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) return '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 25 * 1024 * 1024) return ''; // Whisper limit 25 MB
      const file = new File([buffer], 'audio.oga', { type: 'audio/ogg' });
      const client = new OpenAI({ apiKey: openaiApiKey });
      const prompt = (options?.prompt ?? VOCAB_PROMPT).trim().slice(0, 900) || undefined;
      const lang = options?.language === 'kk' || options?.language === 'ru' ? options.language : undefined;
      const transcription = await client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        ...(prompt && { prompt }),
        ...(lang && { language: lang }),
      });
      return (transcription?.text ?? '').trim();
    } catch {
      return '';
    }
  }
}
