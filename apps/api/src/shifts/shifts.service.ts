import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  /** Получить смену на дату (кто на работе). */
  async getForDate(tenantId: string, date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const record = await this.prisma.shiftAttendance.findUnique({
      where: { tenantId_date: { tenantId, date: d } },
    });
    const userIds = (record?.userIds as string[] | null) ?? [];
    return { date: d.toISOString().slice(0, 10), userIds };
  }

  /** Сохранить смену на дату. Только owner/rop. После сохранения распределяет накопившиеся лиды. */
  async setForDate(tenantId: string, date: Date, userIds: string[]) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const valid = userIds.filter(Boolean);
    await this.prisma.shiftAttendance.upsert({
      where: { tenantId_date: { tenantId, date: d } },
      create: { tenantId, date: d, userIds: valid },
      update: { userIds: valid },
    });
    const distributed = valid.length > 0 ? await this.distributeUnassignedLeads(tenantId, valid) : 0;
    const result = await this.getForDate(tenantId, d);
    return { ...result, distributedCount: distributed };
  }

  /** Распределить лиды без назначения между менеджерами (round-robin). Возвращает количество. */
  async distributeUnassignedLeads(tenantId: string, userIds: string[]): Promise<number> {
    const unassigned = await this.prisma.lead.findMany({
      where: { tenantId, assignedUserId: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (unassigned.length === 0 || userIds.length === 0) return 0;
    const sorted = [...new Set(userIds)].sort();
    for (let i = 0; i < unassigned.length; i++) {
      const assigneeId = sorted[i % sorted.length];
      await this.prisma.lead.update({
        where: { id: unassigned[i].id },
        data: { assignedUserId: assigneeId },
      });
    }
    await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, lastAssignedUserId: sorted[(unassigned.length - 1) % sorted.length] },
      update: { lastAssignedUserId: sorted[(unassigned.length - 1) % sorted.length] },
    });
    return unassigned.length;
  }

  /** Текущее время в разрешённом диапазоне смены? (по умолчанию 9:00–19:00) */
  isWithinShift(tenantId: string, now: Date = new Date()): Promise<boolean> {
    return (async () => {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { shiftStart: true, shiftEnd: true },
      });
      const start = settings?.shiftStart || '09:00';
      const end = settings?.shiftEnd || '19:00';
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return nowMin >= startMin && nowMin < endMin;
    })();
  }

  /** Следующий менеджер по round-robin среди userIds. Обновляет lastAssignedUserId. */
  async nextAssignee(tenantId: string, userIds: string[]): Promise<string | null> {
    if (userIds.length === 0) return null;
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { lastAssignedUserId: true },
    });
    const sorted = [...new Set(userIds)].sort();
    let idx = sorted.findIndex((id) => id === settings?.lastAssignedUserId);
    idx = idx < 0 ? 0 : (idx + 1) % sorted.length;
    const next = sorted[idx];
    await this.prisma.tenantSettings.update({
      where: { tenantId },
      data: { lastAssignedUserId: next },
    });
    return next;
  }

  /** Получить assignee для нового лида: если в смене — round-robin, иначе null. */
  async getAssigneeForNewLead(tenantId: string): Promise<string | null> {
    const inShift = await this.isWithinShift(tenantId);
    if (!inShift) return null;
    const { userIds } = await this.getForDate(tenantId, new Date());
    if (userIds.length === 0) return null;
    return this.nextAssignee(tenantId, userIds);
  }
}
