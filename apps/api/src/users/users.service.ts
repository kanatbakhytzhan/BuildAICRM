import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByTenantAndEmail(tenantId: string, email: string) {
    return this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
    });
  }

  /** Найти пользователя по email (любая организация) и проверить пароль */
  async findByEmailAndPassword(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        role: true,
        visibleTopics: { select: { topicId: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { visibleTopics, ...rest } = user;
    return { ...rest, visibleTopicIds: visibleTopics.map((v) => v.topicId) };
  }

  async listByTenant(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        visibleTopics: { select: { topicId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      visibleTopicIds: u.visibleTopics.map((v) => v.topicId),
    }));
  }

  async create(
    tenantId: string,
    data: { email: string; password: string; name?: string; role: UserRole; visibleTopicIds?: string[] },
  ) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true },
    });
    if (data.visibleTopicIds?.length) {
      await this.prisma.userVisibleTopic.createMany({
        data: data.visibleTopicIds.map((topicId) => ({ userId: user.id, topicId })),
        skipDuplicates: true,
      });
    }
    return this.findById(user.id);
  }

  async updateVisibleTopics(userId: string, tenantId: string, topicIds: string[]) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.userVisibleTopic.deleteMany({ where: { userId } });
    if (topicIds.length) {
      await this.prisma.userVisibleTopic.createMany({
        data: topicIds.map((topicId) => ({ userId, topicId })),
        skipDuplicates: true,
      });
    }
    return this.findById(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Неверный текущий пароль');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async remove(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'owner') throw new BadRequestException('Нельзя удалить владельца');
    await this.prisma.userVisibleTopic.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async resetPassword(userId: string, tenantId: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async getVisibleTopicIds(userId: string): Promise<string[] | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, visibleTopics: { select: { topicId: true } } },
    });
    if (!user) return null;
    if (user.role === 'owner' || user.role === 'rop') return null;
    const ids = user.visibleTopics.map((v) => v.topicId);
    return ids.length ? ids : null;
  }
}
