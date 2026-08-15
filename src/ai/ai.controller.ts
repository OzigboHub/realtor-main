import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { AiService, ListingContext } from './ai.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AiCreditGuard } from './guards/ai-credit.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

export class AskListingAssistantDto {
  @ApiProperty({ example: 'Write a description for a 3-bedroom duplex' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  context?: ListingContext;
}

export class AskPropertyAssistantDto {
  @ApiProperty({ example: '3 bedroom flat in Lekki under 2.5m' })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export class VirtualStagingDto {
  @ApiProperty({ example: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({ example: 'Modern Luxury' })
  @IsString()
  @IsNotEmpty()
  style: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AiCreditGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('listing-assistant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask the AI listing assistant a question about your property listing (Deducts 1 AI Credit)',
  })
  async askListing(@Body() dto: AskListingAssistantDto): Promise<{ reply: string }> {
    const reply = await this.aiService.askListingAssistant(dto.prompt, dto.context || {});
    return { reply };
  }

  @Post('property-assistant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask the AI property assistant to search and filter real properties in natural language (Deducts 1 AI Credit)',
  })
  async askProperty(@Body() dto: AskPropertyAssistantDto) {
    return this.aiService.askPropertyAssistant(dto.prompt);
  }

  @Post('virtual-staging')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI virtually staged room photos (Deducts 1 AI Credit)',
  })
  async virtualStaging(@Body() dto: VirtualStagingDto) {
    return this.aiService.generateVirtualStaging(dto.imageUrl, dto.style);
  }
}
