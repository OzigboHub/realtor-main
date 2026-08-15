import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { Request } from 'express';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('similar/:propertyId')
  async getSimilarProperties(@Param('propertyId') propertyId: string) {
    return this.recommendationsService.getSimilarProperties(propertyId);
  }

  @Get('for-me')
  @UseGuards(JwtAuthGuard)
  async getForMe(@Req() req: Request) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    return this.recommendationsService.getPersonalizedRecommendations(userId);
  }
}
