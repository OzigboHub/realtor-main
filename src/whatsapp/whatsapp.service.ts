import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private configured = false;
  private token: string;
  private phoneNumberId: string;

  constructor(private config: ConfigService) {
    this.token = config.get<string>('WHATSAPP_TOKEN') ?? '';
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_ID') ?? '';
    this.configured = !!(this.token && this.phoneNumberId);

    if (!this.configured) {
      this.logger.warn(
        'WHATSAPP_TOKEN/WHATSAPP_PHONE_ID not configured — WhatsApp messages will be logged to console only.',
      );
    }
  }

  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.configured) {
      this.logger.debug(`[WHATSAPP STUB] To: ${to}\n${body}`);
      return;
    }

    try {
      // Meta Cloud API integration point
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status} ${await response.text()}`);
      }
      this.logger.log(`WhatsApp message sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message to ${to}: ${err.message}`);
    }
  }

  async sendTemplate(to: string, templateName: string, params: string[]): Promise<void> {
    if (!this.configured) {
      this.logger.debug(`[WHATSAPP STUB] Template: ${templateName} To: ${to} Params: ${JSON.stringify(params)}`);
      return;
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: params.map((p) => ({ type: 'text', text: p })),
            },
          ],
        },
      };
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      this.logger.error(`WhatsApp template send failed: ${err.message}`);
    }
  }

  async ping(): Promise<boolean> {
    return this.configured;
  }
}
