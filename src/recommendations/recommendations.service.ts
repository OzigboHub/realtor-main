import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PROPERTY_SELECT = {
  id: true,
  title: true,
  price: true,
  category: true,
  purpose: true,
  type: true,
  location: true,
  country: true,
  imageUrls: true,
  bedrooms: true,
  bathrooms: true,
  amenities: true,
  status: true,
  available: true,
  agent: { select: { name: true, avatar: true } },
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns up to 4 similar properties based on:
   * - Same category (strong match, weight 3)
   * - Price within ±40% (weight 2)
   * - Same location keyword (weight 2)
   * - Overlapping amenities (weight 1 per overlap, max 3)
   */
  async getSimilarProperties(propertyId: string) {
    const source = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: PROPERTY_SELECT,
    });

    if (!source) return [];

    const candidates = await this.prisma.property.findMany({
      where: {
        id: { not: propertyId },
        available: true,
        status: 'PUBLISHED',
      },
      select: PROPERTY_SELECT,
      take: 100, // Score top 100 then return best 4
    });

    const priceMin = source.price * 0.6;
    const priceMax = source.price * 1.4;
    const sourceLocation = source.location?.toLowerCase() ?? '';
    const sourceAmenities = new Set(source.amenities ?? []);

    const scored = candidates.map((p) => {
      let score = 0;

      if (p.category === source.category) score += 3;
      if (p.price >= priceMin && p.price <= priceMax) score += 2;

      const loc = p.location?.toLowerCase() ?? '';
      // Match on city-level keyword (first word of location)
      const srcCity = sourceLocation.split(',')[0];
      if (srcCity && loc.includes(srcCity)) score += 2;

      // Amenity overlap
      const overlap = (p.amenities ?? []).filter((a) => sourceAmenities.has(a)).length;
      score += Math.min(overlap, 3);

      return { property: p, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.property);
  }

  /**
   * Personalized recommendations for a logged-in user:
   * - Based on the categories and price ranges of their favorited properties
   * - Excludes already-favorited properties
   */
  async getPersonalizedRecommendations(userId: string) {
    // Get user's favorites
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { property: { select: PROPERTY_SELECT } },
    });

    const favIds = new Set(favorites.map((f) => f.propertyId));

    if (favorites.length === 0) {
      // Cold start: return newest published listings
      return this.prisma.property.findMany({
        where: { available: true, status: 'PUBLISHED' },
        select: PROPERTY_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 4,
      });
    }

    // Derive preference signals from favorites
    const categories = favorites.map((f) => f.property.category);
    const prices = favorites.map((f) => f.property.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const preferredCategories = [...new Set(categories)];

    // Pull candidates excluding already-favorited
    const candidates = await this.prisma.property.findMany({
      where: {
        id: { notIn: [...favIds] },
        available: true,
        status: 'PUBLISHED',
        category: { in: preferredCategories },
      },
      select: PROPERTY_SELECT,
      take: 50,
    });

    // Score by price proximity and category match
    const scored = candidates.map((p) => {
      let score = 0;
      if (preferredCategories.includes(p.category)) score += 3;
      const priceDiff = Math.abs(p.price - avgPrice) / avgPrice;
      if (priceDiff <= 0.3) score += 3;
      else if (priceDiff <= 0.6) score += 1;
      return { property: p, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.property);
  }
}
