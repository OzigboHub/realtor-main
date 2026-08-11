import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class QueuesService implements OnModuleInit {
  private readonly logger = new Logger(QueuesService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsappService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Background Cron & Worker Queues service...');
    // Run automated check once per 24 hours (or at boot)
    this.scheduleJobs();
  }

  private scheduleJobs() {
    // Run immediately on boot in background, then schedule 24h intervals
    setTimeout(() => this.processRentReminders(), 5000);
    setTimeout(() => this.processLeaseExpirations(), 10000);

    this.timer = setInterval(() => {
      this.processRentReminders();
      this.processLeaseExpirations();
    }, 86400000); // 24 hours
  }

  async processRentReminders() {
    try {
      this.logger.log('Running background job: Checking upcoming rent payment reminders...');
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const pendingPayments = await this.prisma.rentPayment.findMany({
        where: {
          status: 'PENDING',
          dueDate: {
            lte: threeDaysFromNow,
            gte: new Date(),
          },
        },
        include: {
          lease: {
            include: {
              tenant: true,
              unit: {
                include: { building: true },
              },
            },
          },
        },
      });

      for (const payment of pendingPayments) {
        const tenant = payment.lease.tenant;
        if (tenant) {
          const message = `Reminder: Rent payment of ₦${payment.amount.toLocaleString()} for Unit ${payment.lease.unit.unitNumber} is due on ${payment.dueDate.toDateString()}.`;
          await this.notifications.create(tenant.id, 'RENT_DUE_REMINDER', message);
          await this.mail.sendMail(tenant.email, 'Upcoming Rent Payment Reminder', message);
          if (tenant.phone) {
            await this.whatsapp.sendMessage(tenant.phone, message);
          }
        }
      }

      this.logger.log(`Rent payment reminders processed for ${pendingPayments.length} tenants.`);
    } catch (err: any) {
      this.logger.error(`Error processing rent reminders: ${err.message}`);
    }
  }

  async processLeaseExpirations() {
    try {
      this.logger.log('Running background job: Checking expiring lease contracts...');
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringLeases = await this.prisma.lease.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
        },
        include: {
          tenant: true,
          unit: {
            include: { building: { include: { landlord: true } } },
          },
        },
      });

      for (const lease of expiringLeases) {
        const tenant = lease.tenant;
        const landlord = lease.unit.building.landlord;

        if (tenant) {
          const msg = `Notice: Your lease for Unit ${lease.unit.unitNumber} expires on ${lease.endDate?.toDateString()}. Please contact your landlord for renewal.`;
          await this.notifications.create(tenant.id, 'LEASE_EXPIRING_SOON', msg);
          await this.mail.sendMail(tenant.email, 'Lease Expiration Notice', msg);
        }

        if (landlord) {
          const msg = `Notice: Lease for tenant ${tenant?.name} (Unit ${lease.unit.unitNumber}) expires on ${lease.endDate?.toDateString()}.`;
          await this.notifications.create(landlord.id, 'LEASE_EXPIRING_SOON', msg);
        }
      }

      this.logger.log(`Lease expiration notices processed for ${expiringLeases.length} leases.`);
    } catch (err: any) {
      this.logger.error(`Error processing lease expirations: ${err.message}`);
    }
  }
}
