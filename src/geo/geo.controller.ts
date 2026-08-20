import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { GeoService, GeoDetectionResult } from './geo.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('detect')
  @ApiOperation({
    summary:
      'Detect device metrics, IP address, country, city, and currency recommendation',
  })
  async detectGeo(@Req() req: Request): Promise<GeoDetectionResult> {
    return this.geoService.detectFromRequest(req);
  }
}
