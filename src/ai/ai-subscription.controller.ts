import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import {
  AiSubscriptionService,
  PlanTier,
  PaymentGateway,
} from './ai-subscription.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';

export class InitiateCheckoutDto {
  @ApiProperty({ example: 'STARTER' })
  @IsString()
  @IsNotEmpty()
  planTier: PlanTier;

  @ApiProperty({ example: 'STRIPE' })
  @IsString()
  @IsNotEmpty()
  gateway: PaymentGateway;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: 'NGN' | 'USD' | 'GBP' | 'EUR';
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'cs_test_session_id' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ example: 'STARTER' })
  @IsString()
  @IsNotEmpty()
  planTier: PlanTier;

  @ApiProperty({ example: 'STRIPE' })
  @IsString()
  @IsNotEmpty()
  gateway: PaymentGateway;
}

@ApiTags('AI Subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/subscription')
export class AiSubscriptionController {
  constructor(private readonly subscriptionService: AiSubscriptionService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user AI credit balance and active subscription plan',
  })
  async getMySubscription(@CurrentUser() user: any) {
    const userId = user.id || user.userId || user.sub;
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Initiate a payment checkout for an AI credit subscription plan (Stripe / Paystack)',
  })
  async checkout(@CurrentUser() user: any, @Body() dto: InitiateCheckoutDto) {
    const userId = user.id || user.userId || user.sub;
    return this.subscriptionService.createCheckoutSession(userId, dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify payment completion and grant AI credits to user account',
  })
  async verifyPayment(@CurrentUser() user: any, @Body() dto: VerifyPaymentDto) {
    const userId = user.id || user.userId || user.sub;
    return this.subscriptionService.verifyPayment(
      userId,
      dto.reference,
      dto.planTier,
      dto.gateway,
    );
  }
}
