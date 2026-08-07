import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type MailProvider = 'resend' | 'smtp' | 'console';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Active provider: 'resend' | 'smtp' | 'console' (dev fallback) */
  private readonly provider: MailProvider;

  /** Nodemailer transporter (only initialised when provider === 'smtp') */
  private smtpTransporter: nodemailer.Transporter | null = null;

  /** Resend client (only initialised when provider === 'resend') */
  private resendClient: Resend | null = null;

  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('MAIL_FROM') ?? 'no-reply@realtor.app';

    const raw = (config.get<string>('MAIL_PROVIDER') ?? '').toLowerCase();

    if (raw === 'resend') {
      const apiKey = config.get<string>('RESEND_API_KEY');
      if (!apiKey) {
        this.logger.warn(
          'MAIL_PROVIDER=resend but RESEND_API_KEY is missing — falling back to console.',
        );
        this.provider = 'console';
      } else {
        this.resendClient = new Resend(apiKey);
        this.provider = 'resend';
        this.logger.log('Mail provider: Resend');
      }
    } else if (raw === 'smtp') {
      const host = config.get<string>('MAIL_HOST');
      const port = config.get<number>('MAIL_PORT') ?? 587;
      const user = config.get<string>('MAIL_USER');
      const pass = config.get<string>('MAIL_PASS');

      if (!host || !user || !pass) {
        this.logger.warn(
          'MAIL_PROVIDER=smtp but MAIL_HOST/MAIL_USER/MAIL_PASS are missing — falling back to console.',
        );
        this.provider = 'console';
      } else {
        this.smtpTransporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.provider = 'smtp';
        this.logger.log(`Mail provider: SMTP (${host}:${port})`);
      }
    } else {
      // MAIL_PROVIDER not set or set to 'console' → dev console fallback
      this.provider = 'console';
      const msg =
        raw === 'console'
          ? 'MAIL_PROVIDER=console — emails will be logged to console only (dev mode).'
          : 'MAIL_PROVIDER not set (use "resend" or "smtp") — emails will be logged to console only.';
      this.logger.warn(msg);
    }
  }

  // ─── Core send method ───────────────────────────────────────────────────────

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    switch (this.provider) {
      case 'resend':
        await this.sendViaResend(to, subject, html);
        break;
      case 'smtp':
        await this.sendViaSMTP(to, subject, html);
        break;
      default:
        this.logger.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}\n${html}`);
    }
  }

  private async sendViaResend(to: string, subject: string, html: string): Promise<void> {
    try {
      const { error } = await this.resendClient!.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });
      if (error) {
        this.logger.error(`Resend error sending to ${to}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`[Resend] Email sent to ${to}: "${subject}"`);
      }
    } catch (err: any) {
      this.logger.error(`Resend exception: ${err.message}`);
    }
  }

  private async sendViaSMTP(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.smtpTransporter!.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`[SMTP] Email sent to ${to}: "${subject}"`);
    } catch (err: any) {
      this.logger.error(`SMTP error sending to ${to}: ${err.message}`);
    }
  }

  // ─── Named email helpers ─────────────────────────────────────────────────────

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.sendMail(
      to,
      'Welcome to Realtor Platform',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">Welcome, ${name}! 🎉</h2>
        <p>Your account has been created. We're excited to have you on board.</p>
        <p>You can now log in and start exploring the platform.</p>
      </div>
      `,
    );
  }

  async sendRegistrationPending(to: string, name: string, role: string): Promise<void> {
    await this.sendMail(
      to,
      'Registration Received – Awaiting Approval',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#d97706">Hi ${name},</h2>
        <p>Your <strong>${role}</strong> registration has been received and is <strong>pending approval</strong>.</p>
        <p>You will be notified by email once your account has been reviewed.</p>
      </div>
      `,
    );
  }

  async sendApprovalNotification(to: string, name: string, role: string): Promise<void> {
    await this.sendMail(
      to,
      'Account Approved ✅',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">Hi ${name},</h2>
        <p>Your <strong>${role}</strong> account has been <strong style="color:#16a34a">approved</strong>. You may now log in.</p>
      </div>
      `,
    );
  }

  async sendRejectionNotification(to: string, name: string, role: string): Promise<void> {
    await this.sendMail(
      to,
      'Account Registration Rejected',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">Hi ${name},</h2>
        <p>Unfortunately, your <strong>${role}</strong> registration has been <strong style="color:#dc2626">rejected</strong>.</p>
        <p>Please contact support for more information.</p>
      </div>
      `,
    );
  }

  async sendPasswordReset(to: string, name: string, resetToken: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.sendMail(
      to,
      'Password Reset Request 🔑',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1d4ed8">Hi ${name},</h2>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}"
             style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Reset My Password
          </a>
        </p>
        <p>Or copy this token and use it directly with the API:</p>
        <code style="background:#f1f5f9;padding:8px 12px;border-radius:4px;display:block;word-break:break-all">${resetToken}</code>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">
          This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
      `,
    );
  }

  async sendRentReminder(
    to: string,
    tenantName: string,
    amount: number,
    dueDate: string,
  ): Promise<void> {
    await this.sendMail(
      to,
      'Rent Due Reminder 🏠',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#d97706">Hi ${tenantName},</h2>
        <p>Your rent of <strong>₦${amount.toLocaleString()}</strong> is due on <strong>${dueDate}</strong>.</p>
        <p>Please ensure timely payment to avoid any issues.</p>
      </div>
      `,
    );
  }

  async sendMaintenanceUpdate(
    to: string,
    recipientName: string,
    requestTitle: string,
    status: string,
  ): Promise<void> {
    await this.sendMail(
      to,
      `Maintenance Request Update: ${requestTitle}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Hi ${recipientName},</h2>
        <p>Your maintenance request "<strong>${requestTitle}</strong>" has been updated to: <strong>${status}</strong>.</p>
      </div>
      `,
    );
  }

  async sendAlert(to: string, subject: string, body: string): Promise<void> {
    await this.sendMail(to, `[SYSTEM ALERT] ${subject}`, `<pre>${body}</pre>`);
  }

  /** Returns which provider is currently active — useful for health checks */
  getProvider(): MailProvider {
    return this.provider;
  }

  async ping(): Promise<boolean> {
    if (this.provider === 'smtp' && this.smtpTransporter) {
      try {
        await this.smtpTransporter.verify();
        return true;
      } catch {
        return false;
      }
    }
    if (this.provider === 'resend') {
      // Resend has no explicit verify; consider it "configured" if client exists
      return true;
    }
    return false;
  }
}
