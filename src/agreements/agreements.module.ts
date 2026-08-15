import { Module } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { CaretakerAgreementsController } from './caretaker-agreements.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AgreementsController, CaretakerAgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}