import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { DisputeStatus } from '@prisma/client';

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'File a new two-party dispute claim ticket' })
  createDispute(@CurrentUser() user: any, @Body() dto: CreateDisputeDto) {
    return this.disputesService.createDispute(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get dispute tickets for user or support agent queue',
  })
  getDisputes(
    @CurrentUser() user: any,
    @Query('status') status?: DisputeStatus,
  ) {
    return this.disputesService.getDisputes(user.userId, user.role, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get dispute details with evidence timeline and messages',
  })
  getDisputeById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.disputesService.getDisputeById(id, user.userId, user.role);
  }

  @Post(':id/evidence')
  @ApiOperation({
    summary: 'Upload counter-evidence or photo proof to a dispute ticket',
  })
  submitEvidence(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { fileUrl: string; fileType?: string; caption?: string },
  ) {
    return this.disputesService.submitEvidence(id, user.userId, dto);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Post a message or internal mediator note on a dispute ticket',
  })
  addMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { message: string; isInternalSupportNote?: boolean },
  ) {
    return this.disputesService.addMessage(id, user.userId, user.role, dto);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a Support Agent mediator to a dispute' })
  assignMediator(@Param('id') id: string, @CurrentUser() user: any) {
    return this.disputesService.assignMediator(id, user.userId);
  }

  @Patch(':id/resolve')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Issue an official binding resolution ruling on a dispute',
  })
  resolveDispute(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(id, user.userId, dto);
  }
}
