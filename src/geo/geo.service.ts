import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

export interface GeoDetectionResult {
  ipAddress: string;
  countryCode: string;
  countryName: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  currency: 'NGN' | 'USD' | 'GBP' | 'EUR';
  recommendedGateway: 'PAYSTACK' | 'STRIPE';
  deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP';
  os: string;
  browser: string;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  async detectFromRequest(req: Request): Promise<GeoDetectionResult> {
    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      '102.89.22.1';

    const cleanIp = rawIp.startsWith('::ffff:') ? rawIp.substring(7) : rawIp;
    const userAgent = (req.headers['user-agent'] as string) || '';
    const cfCountry = (req.headers['cf-ipcountry'] as string)?.toUpperCase();

    // 1. Device & Browser Parsing
    let deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP' = 'DESKTOP';
    if (/mobile|iphone|ipod|android.*mobile/i.test(userAgent)) deviceType = 'MOBILE';
    else if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) deviceType = 'TABLET';

    let os = 'Unknown';
    if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
    else if (/android/i.test(userAgent)) os = 'Android';
    else if (/win/i.test(userAgent)) os = 'Windows';
    else if (/mac/i.test(userAgent)) os = 'macOS';
    else if (/linux/i.test(userAgent)) os = 'Linux';

    let browser = 'Unknown';
    if (/edg/i.test(userAgent)) browser = 'Edge';
    else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';

    // 2. Country & Geo Resolution
    let countryCode = cfCountry || 'NG';
    let countryName = countryCode === 'NG' ? 'Nigeria' : countryCode === 'GB' ? 'United Kingdom' : 'United States';
    let city = countryCode === 'NG' ? 'Lagos' : countryCode === 'GB' ? 'London' : 'New York';
    let region = countryCode === 'NG' ? 'Lagos State' : 'Greater Region';
    let latitude = countryCode === 'NG' ? 6.5244 : 51.5074;
    let longitude = countryCode === 'NG' ? 3.3792 : -0.1278;

    // Check currency & gateway binding
    const isNigeria = countryCode === 'NG';
    const isUK = countryCode === 'GB';
    const isEU = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE'].includes(countryCode);

    let currency: 'NGN' | 'USD' | 'GBP' | 'EUR' = 'USD';
    if (isNigeria) currency = 'NGN';
    else if (isUK) currency = 'GBP';
    else if (isEU) currency = 'EUR';

    return {
      ipAddress: cleanIp === '127.0.0.1' || cleanIp === '::1' ? '102.89.22.1' : cleanIp,
      countryCode,
      countryName,
      city,
      region,
      latitude,
      longitude,
      currency,
      recommendedGateway: isNigeria ? 'PAYSTACK' : 'STRIPE',
      deviceType,
      os,
      browser,
    };
  }
}
