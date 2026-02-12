import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { FollowupsSchedulerService } from '../followups/followups.scheduler.service';
import { MessageDirection, MessageSource, Prisma } from '@prisma/client';
import { SystemLogsService } from '../system/system.logs.service';
import { SystemSettingsService } from '../system/system.settings.service';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private messages: MessagesService,
    private followups: FollowupsSchedulerService,
    private logs: SystemLogsService,
    private systemSettings: SystemSettingsService,
  ) {}

  private mergeMetadata(
    current: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  private extractMetadataFromText(
    current: Prisma.JsonValue | null,
    text: string,
  ): Prisma.InputJsonValue {
    const lower = text.toLowerCase();
    const patch: Record<string, unknown> = {};

    // Город (очень грубо, под текущего клиента)
    if (lower.includes('алматы')) {
      patch.city = 'Алматы';
    } else if (lower.includes('астана') || lower.includes('нур-султан')) {
      patch.city = 'Астана';
    }

    // Размеры: ищем шаблоны вида "10x20", "10 x 20", "10 на 20"
    const dimensionMatch =
      lower.match(/(\d+)\s*(x|х|\*)\s*(\d+)/) ||
      lower.match(/(\d+)\s*на\s*(\d+)/);
    if (dimensionMatch) {
      const a = Number(dimensionMatch[1]);
      const b = Number(dimensionMatch[3] ?? dimensionMatch[2]);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        patch.dimensions = {
          length: a,
          width: b,
        };
      }
    }

    // Фундамент
    if (lower.includes('фундамент')) {
      if (lower.includes('без фунда') || lower.includes('нет фунда')) {
        patch.foundation = 'нет';
      } else if (lower.includes('есть фунда') || lower.includes('на фунда')) {
        patch.foundation = 'есть';
      } else {
        patch.foundation = 'уточнить';
      }
    }

    // Кол-во окон
    const windowsMatch = lower.match(/(\d+)\s*(окн)/);
    if (windowsMatch) {
      const count = Number(windowsMatch[1]);
      if (!Number.isNaN(count)) {
        patch.windowsCount = count;
      }
    }

    // Кол-во дверей
    const doorsMatch = lower.match(/(\d+)\s*(двер)/);
    if (doorsMatch) {
      const count = Number(doorsMatch[1]);
      if (!Number.isNaN(count)) {
        patch.doorsCount = count;
      }
    }

    // Когда перезвонить: «через полчаса», «жарты сагат», «бугин жарт сагат кейн», «через час», «завтра в 10»
    const callTime = this.parseSuggestedCallTime(text);
    if (callTime) {
      patch.suggestedCallAt = callTime.at;
      patch.suggestedCallNote = callTime.note;
    }

    if (Object.keys(patch).length === 0) {
      return (current ?? {}) as Prisma.InputJsonValue;
    }
    return this.mergeMetadata(current, patch);
  }

  /**
   * Первый этап для темы (по порядку) — для тем Ламинат/Линолеум/Погрузчик: лид сразу в колонку темы, не в общие 6 стадий.
   */
  private async findFirstStageForTopic(tenantId: string, topicId: string): Promise<{ id: string } | null> {
    return this.prisma.pipelineStage.findFirst({
      where: { tenantId, topicId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
  }

  /**
   * Выбирает этап воронки по типу. Если у лида есть тема (topicId), сначала ищется этап с этой темой.
   * useTopicOnly=true — для Ламинат/Линолеум/Погрузчик: только тематические этапы, общие 6 стадий не трогать.
   */
  private async findStageByType(
    tenantId: string,
    type: string,
    leadTopicId?: string | null,
    useTopicOnly?: boolean,
  ): Promise<{ id: string } | null> {
    if (leadTopicId) {
      const withTopic = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type, topicId: leadTopicId },
        select: { id: true },
      });
      if (withTopic) return withTopic;
    }
    if (useTopicOnly) return null; // Ламинат/Линолеум/Погрузчик — не использовать общие 6 стадий
    const general = await this.prisma.pipelineStage.findFirst({
      where: { tenantId, type, topicId: null },
      select: { id: true },
    });
    if (general) return general;
    return this.prisma.pipelineStage.findFirst({
      where: { tenantId, type },
      select: { id: true },
    });
  }

  /** Парсит из текста указание «когда перезвонить» и возвращает ISO-дату и подпись. Всегда пишем в БД точное время. */
  private parseSuggestedCallTime(text: string): { at: string; note: string } | null {
    const lower = text.toLowerCase().trim().replace(/[іәғқңүұһө]/g, (c) => ({ і: 'и', ө: 'о', ұ: 'у', ү: 'у', ғ: 'г', қ: 'к', ң: 'н', ҳ: 'х', ә: 'а' }[c] || c));
    const now = new Date();
    let at: Date | null = null;
    let note = '';

    // казах: жарты сагаттан кейн / жарты сагат
    if (/жарты\s*сагат(тан?\s*кейн)?/.test(lower) || /бугин\s+жарт\s+сагат/.test(lower)) {
      at = new Date(now.getTime() + 30 * 60 * 1000);
      note = 'Через 30 мин';
    }
    // казах: еки сагаттан кейн, 2 сагаттан кейн, N сагаттан кейн
    if (!at && /(\d+)\s*сагат(тан?\s*кейн)?/.test(lower)) {
      const kzHoursMatch = lower.match(/(\d+)\s*сагат(тан?\s*кейн)?/);
      if (kzHoursMatch) {
        const h = Number(kzHoursMatch[1]);
        if (!Number.isNaN(h) && h >= 1 && h <= 24) {
          at = new Date(now.getTime() + h * 60 * 60 * 1000);
          note = h === 1 ? 'Через 1 час' : `Через ${h} ч`;
        }
      }
    }
    // казах: еки/екі сагаттан кейн (словом "два")
    if (!at && /(еки|екі)\s*сагат(тан?\s*кейн)?/.test(lower)) {
      at = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      note = 'Через 2 ч';
    }
    // казах: бір сагаттан кейн / сагаттан кейн (один час)
    if (!at && /(бир|бір)\s*сагат(тан?\s*кейн)?|сагаттан\s*кейн/.test(lower)) {
      at = new Date(now.getTime() + 60 * 60 * 1000);
      note = 'Через 1 час';
    }
    // через полчаса / пол часа (рус)
    if (!at && (/(через\s+)?(полчаса|пол\s+часа)/.test(lower) || /полчаса\s+кейн/.test(lower))) {
      at = new Date(now.getTime() + 30 * 60 * 1000);
      note = 'Через 30 мин';
    }
    // через N часов (2 часа, через 3 часа) — рус
    if (!at) {
      const hoursMatch = lower.match(/через\s+(\d+)\s*час/);
      if (hoursMatch) {
        const h = Number(hoursMatch[1]);
        if (!Number.isNaN(h) && h >= 1 && h <= 24) {
          at = new Date(now.getTime() + h * 60 * 60 * 1000);
          note = h === 1 ? 'Через 1 час' : `Через ${h} ч`;
        }
      }
    }
    // через час / через 1 час (рус)
    if (!at && /(через\s+)?(1\s+)?час[ау]?(\s+кейн)?/.test(lower) && !lower.includes('полчаса') && !lower.includes('жарты')) {
      at = new Date(now.getTime() + 60 * 60 * 1000);
      note = 'Через 1 час';
    }
    // через N минут
    if (!at) {
      const minsMatch = lower.match(/через\s+(\d+)\s*м(ин|инут)/);
      if (minsMatch) {
        const m = Number(minsMatch[1]);
        if (!Number.isNaN(m) && m > 0 && m < 1440) {
          at = new Date(now.getTime() + m * 60 * 1000);
          note = `Через ${m} мин`;
        }
      }
    }
    // завтра в 10 / завтра в 10:30
    if (!at && /завтра\s+в\s+(\d{1,2})(?::(\d{2}))?/.test(lower)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hourMatch = lower.match(/завтра\s+в\s+(\d{1,2})(?::(\d{2}))?/);
      if (hourMatch) {
        const h = Number(hourMatch[1]);
        const min = hourMatch[2] ? Number(hourMatch[2]) : 0;
        if (!Number.isNaN(h) && h >= 0 && h <= 23) {
          tomorrow.setHours(h, Number.isNaN(min) ? 0 : min, 0, 0);
          at = tomorrow;
          note = `Завтра в ${h}:${String(min).padStart(2, '0')}`;
        }
      }
    }
    // казах: ертен сагат 10:30 / ертен 10:30 / ертен в 10 (завтра)
    if (!at && /ертен\s*(сагат\s*)?(\d{1,2})(?::(\d{2}))?/.test(lower)) {
      const ertenMatch = lower.match(/ертен\s*(?:сагат\s*)?(\d{1,2})(?::(\d{2}))?/);
      if (ertenMatch) {
        const h = Number(ertenMatch[1]);
        const min = ertenMatch[2] ? Number(ertenMatch[2]) : 0;
        if (!Number.isNaN(h) && h >= 0 && h <= 23) {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(h, min, 0, 0);
          at = tomorrow;
          note = `Ертен ${h}:${String(min).padStart(2, '0')}`;
        }
      }
    }
    // сегодня в 18:00 / в 15:00 / в 14:30 (время на сегодня)
    if (!at && /(сегодня\s+)?в\s+(\d{1,2})(?::(\d{2}))?/.test(lower)) {
      const timeMatch = lower.match(/(?:сегодня\s+)?в\s+(\d{1,2})(?::(\d{2}))?/);
      if (timeMatch) {
        const h = Number(timeMatch[1]);
        const min = timeMatch[2] ? Number(timeMatch[2]) : 0;
        if (!Number.isNaN(h) && h >= 0 && h <= 23) {
          const today = new Date(now);
          today.setHours(h, Number.isNaN(min) ? 0 : min, 0, 0);
          if (today.getTime() <= now.getTime()) today.setDate(today.getDate() + 1);
          at = today;
          note = `В ${h}:${String(min).padStart(2, '0')}`;
        }
      }
    }
    // завтра утром / завтра днём / утром / днём — одно конкретное время
    if (!at && (/завтра\s+утром|утром\s+завтра|ертен\s+таңертең|таңертең/.test(lower) || (lower.includes('утром') && !lower.includes('в ')))) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      at = tomorrow;
      note = 'Завтра утром (10:00)';
    }
    if (!at && (/завтра\s+днем|завтра\s+днём|днем\s+завтра|днём\s+завтра|кундиз|күндіз|ертен\s+кундиз|ертең\s+күндіз/.test(lower) || (lower.includes('днём') && !lower.includes('в ')) || lower.includes('кундиз'))) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      at = tomorrow;
      note = 'Завтра днём (14:00)';
    }
    // пять вечера / завтра в пять / в 17 — рус
    if (!at && (/в\s+пять\s+вечера|завтра\s+в\s+пять|в\s+17\s*:?\s*00?/.test(lower) || (lower.includes('пять') && lower.includes('вечер')))) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      at = tomorrow;
      note = 'Завтра в 17:00 (пять вечера)';
    }
    // казах: ертең сағат беске / кешкі бесте / сағат беске = завтра в 17:00
    if (!at && (/ертен\s+сагат\s+беске|сагат\s+беске|кешки\s+бесте|кешкі\s+бесте|ертен\s+сағат\s+беске/.test(lower) || (lower.includes('беске') && lower.includes('сагат')) || (lower.includes('бесте') && lower.includes('кешки')))) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      at = tomorrow;
      note = 'Завтра в 17:00';
    }

    if (!at) return null;
    return { at: at.toISOString(), note };
  }

  /** Этап 4: базовый системный промпт — язык, вопросы по одному, время звонка, темы. */
  private getDefaultSystemPrompt(): string {
    return `Ты вежливый AI-ассистент компании. Отвечай кратко и по делу.

Язык: отвечай строго на том же языке, что и последнее сообщение клиента. Если клиент написал на казахском (например «Салеметсизбе», «Ертен кундиз») — весь твой ответ должен быть на казахском, без перехода на русский. Если на русском — отвечай на русском. Не смешивай языки в одном сообщении (например не пиши «Салем» и дальше по-русски).

Вопросы: задавай не больше одного-двух вопросов за раз. Не перечисляй подряд 4–5 вопросов в одном сообщении — это перегружает клиента. Лучше один вопрос, дождаться ответа, потом следующий.

Время созвона: если клиент называет размытое время («утром», «днём», «завтра днём», «ертен кундиз», «завтра утром») — не спрашивай «Когда вам удобно?». Предложи одно конкретное время: например «Перезвоню завтра в 10:00, подойдёт?» или по-казахски «Ертең сағат 10-да хабарласамын, бола ма?» (утром — 10:00, днём — 14:00). Если клиент согласен — подтверди и на этом заверши обсуждение времени.

Опечатки и неформальное написание: клиенты часто пишут с ошибками, латиницей вместо кириллицы. Понимай по смыслу. Например: «панел», «линулеум», «ламанат» — распознавай как панели/линолеум/ламинат. Не указывай на ошибки, отвечай по делу.

Голосовые сообщения: в истории может быть [Голосовое сообщение] без текста или транскрипт. Если только пометка — ответь вежливо, кратко опиши продукцию и спроси одно: что интересует или уточни текст. Если есть транскрипт — учитывай суть и отвечай по существу.

Тема/продукт: направления — панели, ламинат, линолеум, погрузчик. Если тема не ясна — один раз спроси: «Что вас интересует: панели, ламинат, линолеум или другое?» (или то же на казахском). Не повторяй многократно.

Не приветствуй первым — только отвечай на реплики клиента.`;
  }

  private formatMetadataForPrompt(metadata: Prisma.JsonValue | null): string {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
    const m = metadata as Record<string, unknown>;
    const parts: string[] = [];
    if (m.city != null) parts.push(`Город: ${String(m.city)}`);
    if (m.dimensions != null && typeof m.dimensions === 'object' && !Array.isArray(m.dimensions)) {
      const d = m.dimensions as { length?: number; width?: number };
      if (d.length != null && d.width != null) parts.push(`Размеры (длина x ширина): ${d.length} x ${d.width}`);
    }
    if (m.foundation != null) parts.push(`Фундамент: ${String(m.foundation)}`);
    if (m.windowsCount != null) parts.push(`Окон: ${Number(m.windowsCount)}`);
    if (m.doorsCount != null) parts.push(`Дверей: ${Number(m.doorsCount)}`);
    if (m.suggestedCallAt != null || m.suggestedCallNote != null) {
      parts.push(`Перезвонить: ${m.suggestedCallNote != null ? String(m.suggestedCallNote) : new Date(String(m.suggestedCallAt)).toLocaleString('ru-RU')}`);
    }
    if (parts.length === 0) return '';
    return `\n\nУже известные данные по клиенту (не спрашивай их повторно, опирайся на них): ${parts.join('. ')}.`;
  }

  private async generateOpenAIReply(params: {
    leadId: string;
    systemPrompt: string | null;
    openaiApiKey: string;
    openaiModel?: string | null;
    currentUserMessage: string;
    leadMetadata?: Prisma.JsonValue | null;
    topicScenario?: string | null;
    topicName?: string | null;
  }): Promise<string> {
    const recent = await this.prisma.message.findMany({
      where: { leadId: params.leadId },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    const contextBlock = this.formatMetadataForPrompt(params.leadMetadata ?? null);
    let systemContent = (params.systemPrompt?.trim() || this.getDefaultSystemPrompt()) + contextBlock;
    if (params.topicScenario?.trim()) {
      systemContent += `\n\nСценарий по текущей теме${params.topicName ? ` (${params.topicName})` : ''} — придерживайся его в ответах:\n${params.topicScenario.trim()}`;
    }
    const history = recent.map((m) => ({
      role: m.direction === MessageDirection.in ? ('user' as const) : ('assistant' as const),
      content: m.body || '',
    }));
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...history,
      ...(params.currentUserMessage ? [{ role: 'user' as const, content: params.currentUserMessage }] : []),
    ];
    const client = new OpenAI({ apiKey: params.openaiApiKey });
    const model = (params.openaiModel?.trim() && ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'].includes(params.openaiModel.trim()))
      ? params.openaiModel.trim()
      : 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 500,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    return content || 'Спасибо за сообщение! Мы скоро свяжемся с вами.';
  }

  async handleFakeIncoming(params: { tenantId: string; leadId: string; text: string; skipSaveIncoming?: boolean }) {
    const { tenantId, leadId, text, skipSaveIncoming } = params;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        stage: true,
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const systemSettings = await this.systemSettings.getSettings();
    if (!systemSettings.aiGlobalEnabled) {
      if (!skipSaveIncoming) {
        await this.messages.create(lead.id, {
          source: MessageSource.human,
          direction: MessageDirection.in,
          body: text,
        });
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: text.slice(0, 120),
            noResponseSince: null,
          },
        });
      }
      return { leadId: lead.id, aiHandled: false, reply: undefined };
    }

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    // Save incoming message from client (unless processing batch — already saved in webhook)
    if (!skipSaveIncoming) {
      await this.messages.create(lead.id, {
        source: MessageSource.human,
        direction: MessageDirection.in,
        body: text,
      });
    }

    // Client replied – cancel pending follow-ups for this lead
    this.followups.cancelLeadFollowUps(lead.id);

    const now = new Date();
    let newScore = lead.leadScore;
    let newStageId: string | undefined;
    let decisionReason = 'сообщение не попало ни под одно правило';

    const newMetadata = this.extractMetadataFromText(lead.metadata ?? null, text);
    const meta = (newMetadata && typeof newMetadata === 'object' ? newMetadata : {}) as Record<string, unknown>;

    const lower = text.toLowerCase();
    // Нормализация казахских букв для поиска (ә→а, ң→н и т.д.)
    const lowerNorm = lower.replace(/[іәғқңүұһө]/g, (c) => ({ і: 'и', ө: 'о', ұ: 'у', ү: 'у', ғ: 'г', қ: 'к', ң: 'н', ҳ: 'х', ә: 'а' }[c] || c));

    // Определение темы по тексту (ламинат, панели, линолеум, погрузчик и т.д.)
    let newTopicId: string | null = lead.topicId;
    let newTopicNameNorm: string | null = null; // для «Ламинат/Линолеум/Погрузчик» — только тематические этапы, общие 6 не трогать
    const tenantTopics = await this.prisma.tenantTopic.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });
    // Ключевые слова для тем (если в названии темы нет точного совпадения с сообщением)
    const topicKeywords: Record<string, string[]> = {
      погрузчик: ['погрузчик', 'трактор', 'техника'],
      трактор: ['погрузчик', 'трактор', 'техника'],
      ламинат: ['ламинат'],
      линолеум: ['линолеум'],
      панел: ['панел', 'сэндвич', 'фасад', 'утеплен', 'дом'],
    };
    const DEDICATED_TOPICS = ['ламинат', 'линолеум', 'погрузчик', 'трактор']; // отдельные колонки, общие 6 стадий не трогать
    for (const t of tenantTopics) {
      const nameNorm = t.name.toLowerCase().replace(/[іәғқңүұһө]/g, (c) => ({ і: 'и', ө: 'о', ұ: 'у', ү: 'у', ғ: 'г', қ: 'к', ң: 'н', ҳ: 'х', ә: 'а' }[c] || c));
      if (lowerNorm.includes(nameNorm) || lower.includes(t.name.toLowerCase())) {
        newTopicId = t.id;
        if (DEDICATED_TOPICS.some((d) => nameNorm.includes(d) || d.includes(nameNorm))) newTopicNameNorm = nameNorm;
        break;
      }
      const keywords = topicKeywords[nameNorm] ?? [nameNorm];
      if (keywords.some((kw) => lowerNorm.includes(kw) || lower.includes(kw))) {
        newTopicId = t.id;
        if (DEDICATED_TOPICS.some((d) => nameNorm.includes(d) || d.includes(nameNorm))) newTopicNameNorm = nameNorm;
        break;
      }
    }
    // Если тема уже у лида и это Ламинат/Линолеум/Погрузчик — тоже только тематические этапы
    if (newTopicNameNorm == null && (newTopicId ?? lead.topicId) != null) {
      const tid = newTopicId ?? lead.topicId;
      const t = tenantTopics.find((x) => x.id === tid);
      if (t) {
        const nameNorm = t.name.toLowerCase().replace(/[іәғқңүұһө]/g, (c) => ({ і: 'и', ө: 'о', ұ: 'у', ү: 'у', ғ: 'г', қ: 'к', ң: 'н', ҳ: 'х', ә: 'а' }[c] || c));
        if (DEDICATED_TOPICS.some((d) => nameNorm.includes(d) || d.includes(nameNorm))) newTopicNameNorm = nameNorm;
      }
    }
    const topicOnly = newTopicNameNorm != null; // Ламинат/Линолеум/Погрузчик — только тематические этапы
    if (lower.includes('не интересно') || lower.includes('отказ') || lower.includes('не актуально')) {
      newScore = 'cold';
      decisionReason = 'клиент явно отказался (\"не интересно\", \"отказ\", \"не актуально\")';
      const refusedStage = await this.findStageByType(tenantId, 'refused', newTopicId ?? lead.topicId, topicOnly);
      if (refusedStage) newStageId = refusedStage.id;
    } else if (meta.suggestedCallAt != null || meta.suggestedCallNote != null || lower.includes('звон') || lower.includes('созвон') || lowerNorm.includes('конырау') || lowerNorm.includes('қоңырау') || lowerNorm.includes('жасайык') || lowerNorm.includes('хабарласайык') || lowerNorm.includes('хабарласамын') || lowerNorm.includes('хабарласа') || lowerNorm.includes('договорились') || lowerNorm.includes('договорились на') || lowerNorm.includes('перезвон') || lowerNorm.includes('кундиз хабарласа') || lowerNorm.includes('күндіз хабарласа')) {
      newScore = 'hot';
      decisionReason = meta.suggestedCallAt != null || meta.suggestedCallNote != null ? 'указано время перезвона' : 'клиент хочет созвон / договорились на звонок';
      const wantsCall = await this.findStageByType(tenantId, 'wants_call', newTopicId ?? lead.topicId, topicOnly);
      if (wantsCall) newStageId = wantsCall.id;
    } else if (lower.includes('цена') || lower.includes('стоимость') || lower.includes('сколько')) {
      newScore = 'warm';
      decisionReason = 'клиент уточняет условия/цену';
      const inProgress = await this.findStageByType(tenantId, 'in_progress', newTopicId ?? lead.topicId, topicOnly);
      if (inProgress) newStageId = inProgress.id;
    } else if (meta.city != null || meta.dimensions != null) {
      newScore = 'warm';
      decisionReason = meta.city != null && meta.dimensions != null
        ? 'получены город и размеры'
        : meta.city != null
          ? 'получен город'
          : 'получены размеры';
      const inProgress2 = await this.findStageByType(tenantId, 'in_progress', newTopicId ?? lead.topicId, topicOnly);
      if (inProgress2) newStageId = inProgress2.id;
    }
    if (meta.city != null && meta.dimensions != null && newScore === 'warm') {
      const fullData = await this.findStageByType(tenantId, 'full_data', newTopicId ?? lead.topicId, topicOnly);
      if (fullData) {
        newStageId = fullData.id;
        decisionReason = 'город и размеры получены — полные данные';
      }
    }
    // Ламинат, Линолеум, Погрузчик — сразу в колонку темы (не в общие 6 стадий). Первый этап по теме = колонка.
    if (newStageId == null && newTopicId != null) {
      const topicStage = await this.findFirstStageForTopic(tenantId, newTopicId);
      if (topicStage) {
        newStageId = topicStage.id;
        newScore = 'warm';
        decisionReason = 'определён интерес по продукту — в колонку темы';
      }
    }

    const effectiveStageId = newStageId ?? lead.stageId;
    const stageForNotes =
      effectiveStageId === lead.stageId
        ? lead.stage
        : await this.prisma.pipelineStage.findFirst({
            where: { id: effectiveStageId },
            select: { name: true },
          });
    const stageName = stageForNotes && 'name' in stageForNotes ? stageForNotes.name : 'текущая';
    const scoreLabel = newScore === 'hot' ? 'горячий' : newScore === 'warm' ? 'тёплый' : 'холодный';
    const aiNotes = `Оценка: ${scoreLabel}. Стадия: ${stageName}. ${decisionReason}`;

    const updatedLead = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        leadScore: newScore,
        stageId: newStageId ?? lead.stageId,
        topicId: newTopicId ?? lead.topicId,
        lastMessageAt: now,
        lastMessagePreview: text.slice(0, 120),
        noResponseSince: null,
        aiNotes,
        metadata: newMetadata,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Night mode: if enabled, do not answer, send night message once
    if (settings?.nightModeEnabled) {
      // crude: we don't compute timezone here, just send special message
      if (settings.nightModeMessage) {
        await this.messages.create(lead.id, {
          source: MessageSource.ai,
          direction: MessageDirection.out,
          body: settings.nightModeMessage,
        });
      }
      await this.logs.log({
        tenantId,
        category: 'ai',
        message: `Ночное сообщение отправлено лиду ${lead.id}`,
        meta: { leadId: lead.id },
      });
      return { lead: updatedLead, aiHandled: true, reply: settings.nightModeMessage ?? undefined };
    }

    // If AI is disabled on tenant or lead, stop here
    if (!settings?.aiEnabled || !updatedLead.aiActive) {
      await this.logs.log({
        tenantId,
        category: 'ai',
        message: `Входящее сообщение без AI-обработки (AI выключен) для лида ${lead.id}`,
        meta: { leadId: lead.id, text },
      });
      return { lead: updatedLead, aiHandled: false, reply: undefined };
    }

    // Этап 4: сценарий по теме лида (панели, ламинат и т.д.) — подставляем в промпт
    let topicScenario: string | null = null;
    let topicName: string | null = null;
    if (updatedLead.topicId) {
      const topic = await this.prisma.tenantTopic.findFirst({
        where: { id: updatedLead.topicId, tenantId: updatedLead.tenantId },
      });
      if (topic) {
        topicScenario = topic.scenarioText ?? null;
        topicName = topic.name;
      }
    }

    // Ответ: OpenAI GPT (если задан ключ у клиента) или шаблон. При батче (skipSaveIncoming) контекст уже в БД, не дублируем.
    let reply: string;
    if (settings?.openaiApiKey?.startsWith('sk-')) {
      try {
        reply = await this.generateOpenAIReply({
          leadId: lead.id,
          systemPrompt: settings.systemPrompt,
          openaiApiKey: settings.openaiApiKey,
          openaiModel: settings.openaiModel,
          currentUserMessage: skipSaveIncoming ? '' : text,
          leadMetadata: updatedLead.metadata,
          topicScenario,
          topicName,
        });
      } catch (err) {
        await this.logs.log({
          tenantId,
          category: 'ai',
          message: `OpenAI ошибка для лида ${lead.id}: ${(err as Error).message}`,
          meta: { leadId: lead.id },
        });
        reply = 'Спасибо за сообщение! Сейчас заняты, скоро ответим.';
      }
    } else {
      reply = 'Спасибо за сообщение! ';
      if (settings?.suggestCall) {
        reply += 'Мы можем организовать для вас звонок и подробно всё рассказать. ';
      } else {
        reply += 'Сейчас подготовим для вас информацию по запросу. ';
      }
      if (settings?.askQuestions) {
        reply += 'Подскажите, пожалуйста, какие детали для вас сейчас самые важные?';
      } else {
        reply += 'Мы скоро свяжемся с вами.';
      }
    }

    await this.messages.create(lead.id, {
      source: MessageSource.ai,
      direction: MessageDirection.out,
      body: reply,
    });

    await this.logs.log({
      tenantId,
      category: 'ai',
      message: `AI ответил на сообщение для лида ${lead.id}`,
      meta: {
        leadId: lead.id,
        input: text,
        reply,
        leadScore: updatedLead.leadScore,
        stageId: updatedLead.stageId,
      },
    });

    // Schedule follow-up if enabled
    if (settings?.followUpEnabled && settings?.followUpMessage) {
      const delayMinutes = Number(settings.followUpDelay || '0') || 0;
      await this.followups.scheduleLeadFollowUp({
        tenantId,
        leadId: lead.id,
        delayMinutes,
        messageText: settings.followUpMessage,
      });
    }

    return { lead: updatedLead, aiHandled: true, reply };
  }

  async takeOverLead(params: { tenantId: string; leadId: string; userId: string }) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, tenantId: params.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        aiActive: false,
        assignedUserId: params.userId,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    this.followups.cancelLeadFollowUps(lead.id);

    await this.logs.log({
      tenantId: params.tenantId,
      category: 'ai',
      message: `Диалог забран менеджером ${params.userId} по лиду ${lead.id}`,
      meta: { leadId: lead.id, userId: params.userId },
    });

    return updated;
  }

  async releaseLead(params: { tenantId: string; leadId: string }) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, tenantId: params.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        aiActive: true,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.logs.log({
      tenantId: params.tenantId,
      category: 'ai',
      message: `Диалог возвращён AI по лиду ${lead.id}`,
      meta: { leadId: lead.id },
    });

    return updated;
  }

  /** Этап 3: каждые 30 сек обрабатываем лидов с отложенным ответом (1 мин после последнего входящего). */
  @Cron('*/30 * * * * *')
  async processScheduledReplies(): Promise<void> {
    const now = new Date();
    const leads = await this.prisma.lead.findMany({
      where: {
        aiReplyScheduledAt: { not: null, lte: now },
        aiActive: true,
      },
      include: { stage: true },
    });
    for (const lead of leads) {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId: lead.tenantId },
      });
      if (!settings?.aiEnabled) {
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { aiReplyScheduledAt: null },
        });
        continue;
      }
      const allMessages = await this.prisma.message.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' },
      });
      let lastOutIndex = -1;
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (allMessages[i].direction === MessageDirection.out) {
          lastOutIndex = i;
          break;
        }
      }
      const batch = allMessages.slice(lastOutIndex + 1).filter((m) => m.direction === MessageDirection.in);
      const batchText = batch.map((m) => m.body || '').filter(Boolean).join('\n');
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { aiReplyScheduledAt: null },
      });
      if (!batchText.trim()) continue;
      try {
        const result = await this.handleFakeIncoming({
          tenantId: lead.tenantId,
          leadId: lead.id,
          text: batchText,
          skipSaveIncoming: true,
        });
        if (result.reply) {
          await this.messages.sendToLead(lead.tenantId, lead.id, result.reply);
        }
      } catch (err) {
        await this.logs.log({
          tenantId: lead.tenantId,
          category: 'ai',
          message: `Ошибка отложенного ответа лиду ${lead.id}: ${(err as Error).message}`,
          meta: { leadId: lead.id },
        });
      }
    }
  }
}

