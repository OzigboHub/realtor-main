import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiSubscriptionService } from './ai-subscription.service';
import { AiSubscriptionController } from './ai-subscription.controller';
import { AiCreditGuard } from './guards/ai-credit.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiController, AiSubscriptionController],
  providers: [AiService, AiSubscriptionService, AiCreditGuard],
  exports: [AiService, AiSubscriptionService, AiCreditGuard],
})
export class AiModule {}
