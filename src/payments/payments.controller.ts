import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateRentPaymentDto } from './dto/create-rent-payment.dto';
import { UpdateRentPaymentStatusDto } from './dto/update-rent-payment-status.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Log a new rent payment due' })
  createPayment(@CurrentUser() user: any, @Body() data: CreateRentPaymentDto) {
    return this.paymentsService.createPayment(user.id, data);
  }

  @Patch(':id/status')
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update rent payment status' })
  updatePaymentStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: UpdateRentPaymentStatusDto
  ) {
    return this.paymentsService.updatePaymentStatus(id, user.id, data);
  }

  @Get('my-payments')
  @Roles('TENANT')
  @ApiOperation({ summary: 'Get payment history for tenant' })
  getTenantPayments(@CurrentUser() user: any) {
    return this.paymentsService.getTenantPayments(user.id);
  }
}
