import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule, SystemModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
