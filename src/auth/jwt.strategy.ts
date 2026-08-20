import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET') || 'secret',
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;

    // Check Redis revocation blacklist
    const isRevoked = await this.redis.sismember('bl:users', userId);
    if (isRevoked) {
      throw new UnauthorizedException('Session token has been revoked.');
    }

    // Verify user in database is not blocked
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isBlocked: true,
        status: true,
      },
    });

    if (!user || user.isBlocked) {
      throw new UnauthorizedException('Account suspended or not found.');
    }

    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }
}
