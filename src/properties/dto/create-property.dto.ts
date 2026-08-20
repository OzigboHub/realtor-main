import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsUrl,
  IsBoolean,
  ValidateIf,
  IsNotEmpty,
  IsInt,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PropertyCategory,
  ListingPurpose,
  HouseType,
  ApartmentType,
  CommercialType,
  LandType,
} from '@prisma/client';

export class CreatePropertyDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Title is required. Please enter a property title.' })
  @IsString({ message: 'Title must be a text string.' })
  title: string;

  @ApiProperty()
  @IsNotEmpty({
    message: 'Description is required. Please enter a property description.',
  })
  @IsString({ message: 'Description must be a text string.' })
  description: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Price is required. Please enter a numerical price.' })
  @IsNumber({}, { message: 'Price must be a valid number.' })
  price: number;

  @ApiProperty({ required: false, enum: ['MONTHLY', 'YEARLY'] })
  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'], {
    message: 'Rent frequency must be MONTHLY or YEARLY.',
  })
  rentFrequency?: 'MONTHLY' | 'YEARLY';

  @ApiProperty({
    description: 'Property type name, e.g. Duplex, Studio, Penthouse, Office',
  })
  @IsNotEmpty({
    message:
      'Property type is required. Please select or enter a property type (e.g. Duplex, Studio, Penthouse, Office).',
  })
  @IsString({ message: 'Property type must be a text string.' })
  type: string;

  @ApiProperty()
  @IsNotEmpty({
    message:
      'Location is required. Please enter the property location or address.',
  })
  @IsString({ message: 'Location must be a text string.' })
  location: string;

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'Image URLs must be an array of image links.' })
  @ArrayMinSize(1, {
    message:
      'Image upload is required. You must provide at least one property image.',
  })
  @IsUrl({}, { each: true, message: 'Each image URL must be a valid link.' })
  imageUrls: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  bedrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  bathrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  toilets?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({ required: false, enum: ['RENT', 'SALE'] })
  @IsOptional()
  @IsEnum(['RENT', 'SALE'], {
    message: 'Listing type must be either RENT or SALE.',
  })
  listingType?: string;

  @ApiProperty({ required: false, enum: ['DRAFT', 'PUBLISHED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED'], {
    message: 'Status must be either DRAFT or PUBLISHED.',
  })
  status?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({ enum: PropertyCategory })
  @IsNotEmpty({
    message: 'Category is required (HOUSE, APARTMENT, LAND, COMMERCIAL).',
  })
  @IsEnum(PropertyCategory, {
    message:
      'Category must be one of the following: HOUSE, APARTMENT, LAND, COMMERCIAL.',
  })
  category: PropertyCategory;

  @ApiProperty({ enum: ListingPurpose })
  @IsNotEmpty({ message: 'Purpose is required (RENT or SALE).' })
  @IsEnum(ListingPurpose, { message: 'Purpose must be either RENT or SALE.' })
  purpose: ListingPurpose;

  @ApiProperty({ enum: HouseType, required: false })
  @ValidateIf((o) => o.category === 'HOUSE')
  @IsOptional()
  @IsEnum(HouseType, {
    message:
      'House type must be one of: DETACHED, SEMI_DETACHED, TERRACED, DUPLEX, MAISONETTE, BUNGALOW, COTTAGE.',
  })
  houseType?: HouseType;

  @ApiProperty({ enum: ApartmentType, required: false })
  @ValidateIf((o) => o.category === 'APARTMENT')
  @IsOptional()
  @IsEnum(ApartmentType, {
    message:
      'Apartment type must be one of: STUDIO, SELF_CONTAINED, MINI_FLAT, ONE_BEDROOM, TWO_BEDROOM, THREE_BEDROOM, PENTHOUSE.',
  })
  apartmentType?: ApartmentType;

  @ApiProperty({ enum: CommercialType, required: false })
  @ValidateIf((o) => o.category === 'COMMERCIAL')
  @IsOptional()
  @IsEnum(CommercialType, {
    message:
      'Commercial type must be one of: OFFICE, SHOP, WAREHOUSE, PLAZA, HOTEL, FACTORY, EVENT_CENTER, FILLING_STATION.',
  })
  commercialType?: CommercialType;

  @ApiProperty({ enum: LandType, required: false })
  @ValidateIf((o) => o.category === 'LAND')
  @IsOptional()
  @IsEnum(LandType, {
    message:
      'Land type must be one of: RESIDENTIAL, COMMERCIAL, INDUSTRIAL, AGRICULTURAL, MIXED_USE.',
  })
  landType?: LandType;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  highlights?: string;

  // ─── FR-10: Map Search / Geolocation ────────────────────────────────

  @ApiProperty({
    required: false,
    description: 'Country name for filtering, e.g. "Nigeria", "Ghana"',
    example: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    required: false,
    description: 'Decimal latitude for map pin, e.g. 6.5244',
    example: 6.5244,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    required: false,
    description: 'Decimal longitude for map pin, e.g. 3.3792',
    example: 3.3792,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
