import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MessagesModule } from './messages/messages.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BuildingsModule } from './buildings/buildings.module';
import { UnitsModule } from './units/units.module';
import { LeasesModule } from './leases/leases.module';
import { PaymentsModule } from './payments/payments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { UploadModule } from './upload/upload.module';

// Platform Modules
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { AgreementsModule } from './agreements/agreements.module';

@Module({
  imports: [
    // Config (global)
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Database
    PrismaModule,

    // Platform (global services)
    MailModule,
    WhatsappModule,
    NotificationsModule,
    AuditModule,

    // Feature modules
    AuthModule,
    UsersModule,
    PropertiesModule,
    FavoritesModule,
    ReviewsModule,
    AppointmentsModule,
    MessagesModule,
    DashboardModule,
    BuildingsModule,
    UnitsModule,
    LeasesModule,
    PaymentsModule,
    MaintenanceModule,
    UploadModule,
    HealthModule,
    AgreementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
