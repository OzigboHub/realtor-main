import { Controller, Get, Post, Param, Delete, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/current-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':propertyId')
  @ApiOperation({ summary: 'Add property to favorites (User)' })
  create(@Param('propertyId') propertyId: string, @CurrentUser() user: any) {
    return this.favoritesService.create(user.userId, propertyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user favorites' })
  findAll(@CurrentUser() user: any) {
    return this.favoritesService.findAll(user.userId);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remove property from favorites' })
  remove(@Param('propertyId') propertyId: string, @CurrentUser() user: any) {
    return this.favoritesService.remove(user.userId, propertyId);
  }
}
