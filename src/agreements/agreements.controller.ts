import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';

@ApiTags('Management Agreements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('buildings/:buildingId/agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  // FR-12.1
  @Post()
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Create a Management Agreement for a building (FR-12.1)',
    description:
      'Creates a new ACTIVE agreement. Any existing ACTIVE agreement is automatically terminated first.',
  })
  create(
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateAgreementDto,
    @CurrentUser() user: any,
  ) {
    return this.agreementsService.create(buildingId, user.userId, dto);
  }

  // FR-12.5: History
  @Get()
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List all agreements for a building - full history (FR-12.5)',
    description: 'Returns ACTIVE, EXPIRED, and TERMINATED agreements, newest first.',
  })
  findAll(@Param('buildingId') buildingId: string, @CurrentUser() user: any) {
    return this.agreementsService.findAllForBuilding(buildingId, user.userId, user.role);
  }

  // FR-12.3: Compliance / active view
  @Get('active')
  @Roles('LANDLORD', 'CARETAKER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Get the current active agreement and compliance status (FR-12.3)',
    description: 'Landlords and Caretakers can view the current agreement scope and terms.',
  })
  findActive(@Param('buildingId') buildingId: string, @CurrentUser() user: any) {
    return this.agreementsService.findActive(buildingId, user.userId, user.role);
  }

  // FR-12.4: Renew / modify
  @Patch(':id')
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Renew or modify agreement terms (FR-12.4)',
    description: 'Update scope, fee, duration, or notes on any agreement.',
  })
  update(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgreementDto,
    @CurrentUser() user: any,
  ) {
    return this.agreementsService.update(id, user.userId, dto);
  }

  // FR-12.4: Terminate
  @Delete(':id/terminate')
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Terminate a management agreement (FR-12.4)',
    description: 'Sets the agreement status to TERMINATED. Only ACTIVE agreements can be terminated.',
  })
  terminate(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.agreementsService.terminate(id, user.userId);
  }
}