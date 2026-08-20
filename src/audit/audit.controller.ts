import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorators';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs (ADMIN/SUPER_ADMIN only)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('userId') userId?: string,
    @Query('role') role?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.auditService.findAll(
      { userId, role, module, action, status, entityType, from, to },
      +page,
      +limit,
    );
  }
}
