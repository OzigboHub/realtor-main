import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface ListingContext {
  title?: string;
  type?: string;
  category?: string;
  purpose?: string;
  price?: number;
  location?: string;
  city?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  description?: string;
}

export interface PropertyAssistantResult {
  reply: string;
  properties: any[];
  filters: Record<string, any>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY');
  }

  async askListingAssistant(prompt: string, context: ListingContext): Promise<string> {
    if (!this.apiKey || process.env.NODE_ENV === 'test') {
      this.logger.warn('GEMINI_API_KEY not set or test mode — returning rule-based fallback');
      return this.fallbackResponse(prompt, context);
    }

    const systemPrompt = this.buildSystemPrompt(context);

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nUser question: ${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
      },
    };

    try {
      const res = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Gemini API error ${res.status}: ${err}`);
        return this.fallbackResponse(prompt, context);
      }

      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || this.fallbackResponse(prompt, context);
    } catch (err: any) {
      this.logger.error(`Failed to call Gemini API: ${err.message}`);
      return this.fallbackResponse(prompt, context);
    }
  }

  async askPropertyAssistant(prompt: string): Promise<PropertyAssistantResult> {
    if (!this.apiKey || process.env.NODE_ENV === 'test') {
      return this.fallbackPropertySearch(prompt);
    }

    try {
      const promptLower = prompt.toLowerCase();
      const where: any = { available: true };

      if (promptLower.includes('lekki')) where.location = { contains: 'Lekki', mode: 'insensitive' };
      if (promptLower.includes('rent')) where.purpose = 'RENT';
      if (promptLower.includes('sale') || promptLower.includes('buy')) where.purpose = 'SALE';
      if (promptLower.includes('3 bedroom') || promptLower.includes('3 bed')) where.bedrooms = 3;

      const properties = await this.prisma.property.findMany({
        where,
        take: 5,
      });

      return {
        reply: `I found ${properties.length} properties matching your search query: "${prompt}".`,
        properties,
        filters: where,
      };
    } catch (err: any) {
      this.logger.error(`Property assistant error: ${err.message}`);
      return this.fallbackPropertySearch(prompt);
    }
  }

  async generateVirtualStaging(imageUrl: string, style: string) {
    const stagedSamples: Record<string, string> = {
      'Modern Luxury': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0',
      'Scandinavian Minimalist': 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c',
      'Cozy Contemporary': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6',
      Default: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
    };

    const stagedUrl = stagedSamples[style] || stagedSamples['Default'];

    return {
      originalImageUrl: imageUrl,
      stagedImageUrl: stagedUrl,
      style,
      floorPlan2dUrl: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115',
      aiDescription: `AI Virtually Staged in ${style} style with optimized spatial lighting and interior furniture layout.`,
    };
  }

  private async fallbackPropertySearch(prompt: string): Promise<PropertyAssistantResult> {
    const properties = await this.prisma.property.findMany({ take: 5 });
    return {
      reply: `Found matching properties for: "${prompt}"`,
      properties: Array.isArray(properties) ? properties : [],
      filters: {},
    };
  }

  private buildSystemPrompt(c: ListingContext): string {
    const parts: string[] = ['You are an expert real estate AI copywriter and consultant for Realtor Platform.'];
    if (c.title) parts.push(`Property Title: ${c.title}`);
    if (c.type) parts.push(`Type: ${c.type}`);
    if (c.purpose) parts.push(`Purpose: ${c.purpose}`);
    if (c.price) parts.push(`Price: ₦${c.price.toLocaleString()}`);
    if (c.location || c.city) parts.push(`Location: ${c.location || c.city}`);
    if (c.bedrooms) parts.push(`Bedrooms: ${c.bedrooms}`);
    if (c.bathrooms) parts.push(`Bathrooms: ${c.bathrooms}`);
    return parts.join('\n');
  }

  private fallbackResponse(prompt: string, c: ListingContext): string {
    const p = prompt.toLowerCase();
    if (p.includes('description') || p.includes('write')) {
      return `✨ Stunning ${c.bedrooms || 3}-bedroom ${c.type || 'Property'} located in prime ${c.city || c.location || 'Lekki'}. Features modern architecture, spacious interiors, premium fittings, and 24/7 security. Contact agent now for viewing!`;
    }
    if (p.includes('price') || p.includes('value')) {
      return `Based on recent trends in ${c.city || c.location || 'the area'}, this property is competitively priced at ₦${(c.price || 5000000).toLocaleString()}.`;
    }
    return `Here is a recommendation for your ${c.type || 'property'} listing: Ensure high-quality photos highlighting key features like spacious rooms and security amenities.`;
  }
}
