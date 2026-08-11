import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateRentPaymentDto } from './dto/create-rent-payment.dto';
import { UpdateRentPaymentStatusDto } from './dto/update-rent-payment-status.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { Public } from 'src/common/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Log a new rent payment due' })
  createPayment(@CurrentUser() user: any, @Body() data: CreateRentPaymentDto) {
    return this.paymentsService.createPayment(user.id, data);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update rent payment status' })
  updatePaymentStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: UpdateRentPaymentStatusDto,
  ) {
    return this.paymentsService.updatePaymentStatus(id, user.id, data);
  }

  @Get('my-payments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT')
  @ApiOperation({ summary: 'Get payment history for tenant' })
  getTenantPayments(@CurrentUser() user: any) {
    return this.paymentsService.getTenantPayments(user.id);
  }

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT')
  @ApiOperation({ summary: 'Initiate Paystack rent payment' })
  initiatePayment(@CurrentUser() user: any, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(user, dto);
  }

  @Get('verify/:reference')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Verify Paystack transaction status' })
  verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Paystack automated payment webhook' })
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const rawPayload = req.rawBody || JSON.stringify(body);
    return this.paymentsService.handleWebhook(rawPayload, signature);
  }
}
