import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  PrismaHealthIndicator,
  HealthCheckError,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { Public } from '../common/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private mail: MailService,
    private whatsapp: WhatsappService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'System health check for downtime or compromise (public)',
  })
  async check() {
    return this.health.check([
      // 1. Database Health
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // 2. Memory Heap Check (Detects memory leaks / possible compromise)
      // Throws if heap exceeds 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // 3. Memory RSS Check (Detects overall excessive memory usage)
      // Throws if RSS exceeds 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),

      // 4. Disk Storage Check (Detects log bombing / disk filling compromise)
      // Throws if storage exceeds 95% usage on current drive
      () =>
        this.disk.checkStorage('disk_storage', {
          path: process.cwd(),
          thresholdPercent: 0.95,
        }),

      // 5. Custom Mail Check
      async (): Promise<HealthIndicatorResult> => {
        try {
          const isUp = await this.mail.ping();
          if (isUp) {
            return { email: { status: 'up' } };
          }
          return { email: { status: 'up', message: 'unconfigured' } };
        } catch (e: any) {
          throw new HealthCheckError('Email check failed', {
            email: { status: 'down', error: e.message },
          });
        }
      },

      // 6. Custom WhatsApp Check
      async (): Promise<HealthIndicatorResult> => {
        try {
          const isUp = await this.whatsapp.ping();
          if (isUp) {
            return { whatsapp: { status: 'up' } };
          }
          return { whatsapp: { status: 'up', message: 'unconfigured' } };
        } catch (e: any) {
          throw new HealthCheckError('WhatsApp check failed', {
            whatsapp: { status: 'down', error: e.message },
          });
        }
      },
    ]);
  }
}
