import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';
import { AiModule } from '../ai/ai.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule, SystemModule, AiModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
