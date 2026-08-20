import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { Public } from 'src/common/public.decorator';
import { PublicRateLimitGuard } from 'src/common/rate-limit.guard';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  // Reload trigger for property service imageUrls mapping
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Create a new property listing (Agent/Landlord/Admin)',
  })
  create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.create(createPropertyDto, user.userId);
  }

  @Get()
  @Public()
  @UseGuards(PublicRateLimitGuard)
  @ApiOperation({ summary: 'Get all properties (with filters)' })
  findAll(
    @Query('type') type?: string,
    @Query('listingType') listingType?: string,
    @Query('location') location?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('bedrooms') bedrooms?: number,
    @Query('bathrooms') bathrooms?: number,
    @Query('toilets') toilets?: number,
    @Query('category') category?: string,
    @Query('purpose') purpose?: string,
    @Query('houseType') houseType?: string,
    @Query('apartmentType') apartmentType?: string,
    @Query('commercialType') commercialType?: string,
    @Query('landType') landType?: string,
    // FR-10: Global map search params
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('radiusKm') radiusKm?: number,
    @Query('centerLat') centerLat?: number,
    @Query('centerLng') centerLng?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.propertiesService.findAll({
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
      page,
      limit,
    });
  }

  @Get(':id')
  @Public()
  @UseGuards(PublicRateLimitGuard)
  @ApiOperation({ summary: 'Get property by ID' })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Get(':id/contact')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get owner contact details (authenticated only)' })
  getContactDetails(@Param('id') id: string) {
    return this.propertiesService.getContactDetails(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update property details (Owner/Landlord/Admin)' })
  update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.update(
      id,
      updatePropertyDto,
      user.userId,
      user.role,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a property listing (Owner/Landlord/Admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertiesService.remove(id, user.userId, user.role);
  }

  // ─── FR-11: Guided Property Management Checklist ─────────────────────────

  @Get(':id/checklist')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Get listing completeness checklist (FR-11)',
    description:
      'Returns a step-by-step checklist with completion percentage and per-step tips. ' +
      'Only the property owner, Landlords, and Admins can access this.',
  })
  getListingChecklist(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertiesService.getListingChecklist(
      id,
      user.userId,
      user.role,
    );
  }
}
