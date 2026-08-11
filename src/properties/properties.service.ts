import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ListingPurpose } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private sanitizeSubtypes(data: any, existingCategory?: string) {
    const category = data.category || existingCategory;
    if (!category) return data;

    const result = { ...data };
    if (category !== 'HOUSE') result.houseType = null;
    if (category !== 'APARTMENT') result.apartmentType = null;
    if (category !== 'COMMERCIAL') result.commercialType = null;
    if (category !== 'LAND') result.landType = null;
    return result;
  }

  private async invalidateCache() {
    try {
      await this.redis.delByPattern('prop:search:*');
      this.logger.log('Property search cache invalidated.');
    } catch (err) {
      this.logger.warn(`Cache invalidation failed: ${err}`);
    }
  }

  async create(createPropertyDto: CreatePropertyDto, agentId: string) {
    const sanitized = this.sanitizeSubtypes(createPropertyDto);
    const created = await this.prisma.property.create({
      data: {
        ...sanitized,
        agentId,
      },
    });
    await this.invalidateCache();
    return created;
  }

  async findAll(filters: {
    type?: string;
    listingType?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    toilets?: number;
    category?: any;
    purpose?: any;
    houseType?: any;
    apartmentType?: any;
    commercialType?: any;
    landType?: any;
    country?: string;
    city?: string;
    radiusKm?: number;
    centerLat?: number;
    centerLng?: number;
    page?: number;
    limit?: number;
  }) {
    const filterHash = crypto
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex');
    const cacheKey = `prop:search:${filterHash}`;

    // Check Redis cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT for property search query: ${cacheKey}`);
      return JSON.parse(cached);
    }

    const {
      type,
      listingType,
      location,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      toilets,
      category,
      purpose,
      houseType,
      apartmentType,
      commercialType,
      landType,
      country,
      city,
      radiusKm,
      centerLat,
      centerLng,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {
      status: 'PUBLISHED',
      available: true,
      agent: {
        status: 'APPROVED',
      },
    };

    if (type) where.type = type;
    if (listingType) where.listingType = listingType;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (bedrooms !== undefined && bedrooms !== null) where.bedrooms = Number(bedrooms);
    if (bathrooms !== undefined && bathrooms !== null) where.bathrooms = Number(bathrooms);
    if (toilets !== undefined && toilets !== null) where.toilets = Number(toilets);
    if (category) where.category = category;
    if (purpose) where.purpose = purpose;
    if (houseType) where.houseType = houseType;
    if (apartmentType) where.apartmentType = apartmentType;
    if (commercialType) where.commercialType = commercialType;
    if (landType) where.landType = landType;
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (city) where.location = { contains: city, mode: 'insensitive' };

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const properties = await this.prisma.property.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            status: true,
          },
        },
      },
    });

    const total = await this.prisma.property.count({ where });

    let mappedData = properties.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      type: p.type,
      listingType: p.listingType,
      status: p.status,
      amenities: p.amenities,
      category: p.category,
      purpose: p.purpose,
      houseType: p.houseType,
      apartmentType: p.apartmentType,
      commercialType: p.commercialType,
      landType: p.landType,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      toilets: p.toilets,
      features: p.features,
      highlights: p.highlights,
      country: p.country,
      latitude: p.latitude,
      longitude: p.longitude,
      imageUrls: p.imageUrls,
      documents: p.documents,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      agentId: p.agentId,
      ownerId: p.agentId,
      agent: {
        name: p.agent.name,
        avatar: p.agent.profileImage || '',
        isVerified: p.agent.status === 'APPROVED',
      },
    }));

    if (radiusKm && centerLat !== undefined && centerLng !== undefined) {
      const R = 6371;
      const lat1 = Number(centerLat);
      const lng1 = Number(centerLng);
      const km = Number(radiusKm);
      mappedData = mappedData.filter((p) => {
        if (p.latitude == null || p.longitude == null) return false;
        const dLat = ((p.latitude - lat1) * Math.PI) / 180;
        const dLng = ((p.longitude - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((p.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= km;
      });
    }

    const response = { data: mappedData, total, page: Number(page), limit: Number(limit) };

    // Save to Redis cache (300 seconds TTL)
    await this.redis.set(cacheKey, JSON.stringify(response), 300);
    return response;
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            status: true,
          },
        },
      },
    });
    if (!property) throw new NotFoundException('Property not found');

    if (
      property.status !== 'PUBLISHED' ||
      !property.available ||
      property.agent.status !== 'APPROVED'
    ) {
      throw new NotFoundException('Property not found');
    }

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      type: property.type,
      listingType: property.listingType,
      status: property.status,
      amenities: property.amenities,
      category: property.category,
      purpose: property.purpose,
      houseType: property.houseType,
      apartmentType: property.apartmentType,
      commercialType: property.commercialType,
      landType: property.landType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      toilets: property.toilets,
      features: property.features,
      highlights: property.highlights,
      country: property.country,
      latitude: property.latitude,
      longitude: property.longitude,
      imageUrls: property.imageUrls,
      documents: property.documents,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      agentId: property.agentId,
      ownerId: property.agentId,
      agent: {
        name: property.agent.name,
        avatar: property.agent.profileImage || '',
        isVerified: property.agent.status === 'APPROVED',
      },
    };
  }

  async getContactDetails(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return {
      name: property.agent.name,
      email: property.agent.email,
      phone: property.agent.phone,
    };
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto, userId: string, role: string) {
    const property = await this.findOne(id);

    if (
      property.agentId !== userId &&
      role !== 'LANDLORD' &&
      role !== 'ADMIN' &&
      role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('You are not allowed to update this property');
    }

    const sanitized = this.sanitizeSubtypes(updatePropertyDto, property.category);
    const updated = await this.prisma.property.update({
      where: { id },
      data: sanitized,
    });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: string, userId: string, role: string) {
    const property = await this.findOne(id);

    if (
      property.agentId !== userId &&
      role !== 'LANDLORD' &&
      role !== 'ADMIN' &&
      role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('You are not allowed to delete this property');
    }

    await this.prisma.favorite.deleteMany({ where: { propertyId: id } });
    await this.prisma.appointment.deleteMany({ where: { propertyId: id } });
    await this.prisma.review.deleteMany({ where: { propertyId: id } });
    await this.prisma.user.updateMany({
      where: { registrationPropertyId: id },
      data: { registrationPropertyId: null },
    });

    await this.prisma.property.delete({ where: { id } });
    await this.invalidateCache();
    return { success: true };
  }

  async getListingChecklist(id: string, userId: string, role: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');

    if (
      property.agentId !== userId &&
      role !== 'ADMIN' &&
      role !== 'SUPER_ADMIN' &&
      role !== 'LANDLORD'
    ) {
      throw new ForbiddenException('You are not authorised to view this checklist');
    }

    const isRental = property.purpose === ListingPurpose.RENT;

    const steps = [
      {
        step: 'title',
        label: 'Add a descriptive title',
        complete: !!(property.title?.trim()),
        tip: 'A clear title with property type and location gets 3× more clicks.',
      },
      {
        step: 'description',
        label: 'Write a full description (min. 50 characters)',
        complete: (property.description?.trim().length ?? 0) >= 50,
        tip: 'Aim for at least 50 characters. Highlight unique selling points.',
      },
      {
        step: 'price',
        label: 'Set a price',
        complete: !!(property.price && property.price > 0),
        tip: 'Listings without a price receive 60% fewer inquiries.',
      },
      {
        step: 'images',
        label: 'Upload at least 3 photos',
        complete: (property.imageUrls?.length ?? 0) >= 3,
        tip: 'Minimum 3 photos required; 8+ photos maximise engagement.',
      },
      {
        step: 'location',
        label: 'Specify a location',
        complete: !!(property.location?.trim()),
        tip: 'Include city, neighbourhood, and a recognisable landmark if possible.',
      },
      {
        step: 'geolocation',
        label: 'Pin property on the map (latitude & longitude)',
        complete: !!(property.latitude && property.longitude),
        tip: 'Adding a map pin puts your listing in radius-based searches.',
      },
      {
        step: 'category',
        label: 'Select property category',
        complete: !!(property.category),
        tip: null,
      },
      {
        step: 'listingType',
        label: `Set listing type (${isRental ? 'Rent' : 'Sale'})`,
        complete: !!(property.listingType),
        tip: isRental
          ? 'For rentals, consider adding amenities like parking or security.'
          : 'For sales, including legal documents significantly increases buyer trust.',
      },
    ];

    const completedCount = steps.filter((s) => s.complete).length;
    const completionPercent = Math.round((completedCount / steps.length) * 100);
    const isIncomplete = completionPercent < 100;
    const missingSteps = steps.filter((s) => !s.complete).map((s) => s.step);

    return {
      propertyId: id,
      completionPercent,
      isIncomplete,
      missingSteps,
      steps,
    };
  }
}
