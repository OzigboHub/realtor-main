import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { CreateRentPaymentDto } from './dto/create-rent-payment.dto';
import { UpdateRentPaymentStatusDto } from './dto/update-rent-payment-status.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(caretakerId: string, data: CreateRentPaymentDto) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: data.leaseId },
      include: { unit: { include: { building: true } } },
    });

    if (!lease) throw new NotFoundException('Lease not found');
    if (
      lease.unit.building.caretakerId !== caretakerId &&
      lease.unit.building.landlordId !== caretakerId
    ) {
      throw new ForbiddenException('You do not manage this building');
    }

    return this.prisma.rentPayment.create({
      data: {
        leaseId: data.leaseId,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
      },
    });
  }

  async updatePaymentStatus(
    paymentId: string,
    caretakerId: string,
    data: UpdateRentPaymentStatusDto,
  ) {
    const payment = await this.prisma.rentPayment.findUnique({
      where: { id: paymentId },
      include: {
        lease: { include: { unit: { include: { building: true } } } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (
      payment.lease.unit.building.caretakerId !== caretakerId &&
      payment.lease.unit.building.landlordId !== caretakerId
    ) {
      throw new ForbiddenException('You do not manage this building');
    }

    return this.prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        status: data.status,
        paidDate: data.status === 'PAID' ? new Date() : null,
      },
    });
  }

  async getTenantPayments(tenantId: string) {
    return this.prisma.rentPayment.findMany({
      where: { lease: { tenantId } },
      orderBy: { dueDate: 'desc' },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });
  }

  // ==========================================
  // PAYSTACK PAYMENT INTEGRATION
  // ==========================================

  async initiatePayment(
    user: { id: string; email: string },
    dto: InitiatePaymentDto,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: { tenant: true },
    });

    if (!lease) throw new NotFoundException('Lease agreement not found.');
    if (lease.tenantId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to pay for this lease.',
      );
    }

    const reference = `RENT_${lease.id.substring(0, 8)}_${Date.now()}`;
    const amountInKobo = Math.round(dto.amount * 100);

    // Create or locate a pending rent payment record
    const rentPayment = await this.prisma.rentPayment.create({
      data: {
        leaseId: lease.id,
        amount: dto.amount,
        dueDate: new Date(),
        status: 'PENDING',
      },
    });

    const paystackSecret = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    );

    if (!paystackSecret) {
      this.logger.warn(
        'PAYSTACK_SECRET_KEY is missing. Operating in Sandbox mode.',
      );
      return {
        success: true,
        reference,
        paymentId: rentPayment.id,
        authorizationUrl: `https://checkout.paystack.com/sandbox_checkout?ref=${reference}`,
        accessCode: `sandbox_access_code_${Date.now()}`,
        amount: dto.amount,
        message: 'Sandbox payment initiated successfully.',
      };
    }

    try {
      const response = await fetch(
        'https://api.paystack.co/transaction/initialize',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            amount: amountInKobo,
            reference,
            callback_url:
              dto.callbackUrl ||
              'http://localhost:3001/dashboard/tenant/payments',
            metadata: {
              rentPaymentId: rentPayment.id,
              leaseId: lease.id,
              tenantId: user.id,
            },
          }),
        },
      );

      const resData = await response.json();
      if (!resData.status) {
        throw new BadRequestException(
          `Paystack Initialization Error: ${resData.message}`,
        );
      }

      return {
        success: true,
        reference,
        paymentId: rentPayment.id,
        authorizationUrl: resData.data.authorization_url,
        accessCode: resData.data.access_code,
        amount: dto.amount,
      };
    } catch (err: any) {
      this.logger.error(`Paystack initialization failed: ${err.message}`);
      throw new BadRequestException(
        `Paystack initialization failed: ${err.message}`,
      );
    }
  }

  async verifyPayment(reference: string) {
    const paystackSecret = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    );

    if (!paystackSecret) {
      // Sandbox mode verification
      this.logger.log(
        `Verifying payment reference ${reference} in sandbox mode.`,
      );
      const payment = await this.prisma.rentPayment.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      if (payment) {
        const updated = await this.prisma.rentPayment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidDate: new Date() },
        });
        return { success: true, status: 'PAID', payment: updated };
      }
      return { success: true, status: 'VERIFIED' };
    }

    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
          },
        },
      );

      const resData = await response.json();
      if (!resData.status || resData.data.status !== 'success') {
        return { success: false, status: resData.data?.status || 'failed' };
      }

      const metadata = resData.data.metadata;
      if (metadata?.rentPaymentId) {
        const updated = await this.prisma.rentPayment.update({
          where: { id: metadata.rentPaymentId },
          data: { status: 'PAID', paidDate: new Date() },
        });
        return { success: true, status: 'PAID', payment: updated };
      }

      return { success: true, status: 'PAID' };
    } catch (err: any) {
      this.logger.error(`Paystack verification failed: ${err.message}`);
      throw new BadRequestException(
        `Paystack verification failed: ${err.message}`,
      );
    }
  }

  async handleWebhook(rawBody: string | Buffer, signature: string) {
    const paystackSecret = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    );

    if (paystackSecret && signature) {
      const computedHash = crypto
        .createHmac('sha512', paystackSecret)
        .update(rawBody)
        .digest('hex');

      if (computedHash !== signature) {
        this.logger.warn('Paystack Webhook signature mismatch.');
        throw new UnauthorizedException('Invalid Paystack webhook signature.');
      }
    }

    const payload =
      typeof rawBody === 'string'
        ? JSON.parse(rawBody)
        : JSON.parse(rawBody.toString('utf-8'));
    const eventId = payload.data?.id ? `paystack:evt:${payload.data.id}` : null;

    if (eventId) {
      const exists = await this.redis.get(eventId);
      if (exists) {
        this.logger.log(`Duplicate webhook event ${eventId} ignored.`);
        return { status: 'success', message: 'Duplicate event ignored' };
      }
      await this.redis.set(eventId, 'processed', 86400); // 24 hours idempotency cache
    }

    if (payload.event === 'charge.success') {
      const metadata = payload.data.metadata;
      const rentPaymentId = metadata?.rentPaymentId;

      if (rentPaymentId) {
        await this.prisma.rentPayment.update({
          where: { id: rentPaymentId },
          data: { status: 'PAID', paidDate: new Date() },
        });
        this.logger.log(
          `Rent payment ${rentPaymentId} successfully updated to PAID via Webhook.`,
        );
      }
    }

    return { status: 'success' };
  }
}
