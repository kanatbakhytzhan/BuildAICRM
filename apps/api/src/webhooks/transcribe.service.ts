import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

/** Подсказка по лексике для Whisper: русский, казахский и смешанная речь. Лимит ~224 токена. */
const VOCAB_PROMPT = [
  'привет здравствуйте добрый день да нет спасибо пожалуйста извините подскажите скажите сколько стоит когда где как купить заказать доставка цена стоимость рубль тенге метр квадратный штука тонна панель панели сэндвич ламинат линолеум погрузчик трактор техника склад адрес телефон позвоните напишите жду ответьте могу можно нужно хочу интересно покажите скидка оплата наличные карта рассрочка завтра сегодня сейчас позже неделя месяц.',
  'Сәлеметсіз бе сәлем салем саған маған сіздер сіз сұрақ жауап керек алу сатып алу баға тауар жеткізу қойма үй панельдер ламинат линолеум жүк көтергіш техника қала көлем тенге жылу изоляция алаң мәліметтер қажеттіліктер қызықтырады үлгі сипаттама жұмыс нақтылау беремін жоспарлап отырсыз анықтау рахмет кешіріңіз иә жоқ айтыңыз көмектесіңіз жіберіңіз бүгін ертең келесі апта ай.',
  'қанша тұрады неше тәуір болады қайда орналасқан қашан жібересіз қалай тапсырасыз түскен соң сұраймын айтыңызшы жауап беріңіз қоңырау соғыңыз хабарласыңыз күтемін төлем төлеу нақты қолма-қол карта бөліп төлеу.',
  'бір екі үш төрт бес алты жеті сегіз тоғыз он жиырма отыз қырық елу алпыс жетпіс сексен тоқсан жүз мың миллион шаршы погондық.',
  'здравствуйте интересует интересует меня нужна нужен хочу узнать уточнить пришлите скиньте перезвоню напишу жду звонка когда будет готово в наличии под заказ сроки доставки самовывоз Алматы Астана Шымкент.',
  'маған керек сізге керек қызықтырады сұраймын жіберіңіз жазыңыз соғыңыз күтемін қашан дайын қоймада тапсырыс бойынша уақыты жеткізу өзің алу.',
].join(' ');

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
      const prompt = (options?.prompt ?? VOCAB_PROMPT).trim().slice(0, 1100) || undefined;
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
