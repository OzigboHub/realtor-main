import { Module } from '@nestjs/common';
import { TenantScreeningService } from './tenant-screening.service';
import { TenantScreeningController } from './tenant-screening.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantScreeningController],
  providers: [TenantScreeningService],
  exports: [TenantScreeningService],
})
export class TenantScreeningModule {}
