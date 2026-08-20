import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private clients = new Map<string, { count: number; resetTime: number }>();
  private readonly LIMIT = 100; // max requests
  private readonly WINDOW_MS = 60 * 1000; // 1 minute window

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Get client IP address
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';

    const now = Date.now();
    const client = this.clients.get(ip);

    if (!client || now > client.resetTime) {
      this.clients.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    if (client.count >= this.LIMIT) {
      throw new HttpException(
        'Too many requests from this IP, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    client.count++;
    return true;
  }
}
