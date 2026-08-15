import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiCreditGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userId = user?.id || user?.userId || user?.sub;

    if (!userId) {
      throw new HttpException(
        'User authentication required to access AI features.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Retrieve or initialize subscription
    let sub = await this.prisma.userAiSubscription.findUnique({
      where: { userId },
    });

    if (!sub) {
      sub = await this.prisma.userAiSubscription.create({
        data: {
          userId,
          plan: 'FREE',
          creditsRemaining: 0,
          totalCreditsAllocated: 0,
        },
      });
    }

    // Check plan & credits
    if (sub.plan === 'UNLIMITED') {
      return true;
    }

    if (sub.creditsRemaining <= 0) {
      throw new HttpException(
        {
          code: 'AI_CREDITS_EXHAUSTED',
          message:
            'You have used all your AI credits for this period. Please upgrade your plan or top up to continue.',
          creditsRemaining: 0,
          plan: sub.plan,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Deduct 1 credit atomically
    await this.prisma.userAiSubscription.update({
      where: { userId },
      data: {
        creditsRemaining: { decrement: 1 },
      },
    });

    return true;
  }
}
