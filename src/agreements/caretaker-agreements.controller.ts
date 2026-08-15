import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';

@ApiTags('Caretaker Agreements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('caretaker/agreements')
export class CaretakerAgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get('pending')
  @Roles('CARETAKER')
  @ApiOperation({
    summary: 'Get pending agreements for Caretaker',
  })
  findPending(@CurrentUser() user: any) {
    return this.agreementsService.findPendingForCaretaker(user.userId);
  }

  @Patch(':id/accept')
  @Roles('CARETAKER')
  @ApiOperation({
    summary: 'Accept a pending management agreement',
  })
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agreementsService.accept(id, user.userId);
  }
}
