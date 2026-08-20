import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':propertyId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add a review for a property' })
  create(
    @Param('propertyId') propertyId: string,
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.create(user.userId, propertyId, createReviewDto);
  }

  @Get(':propertyId')
  @ApiOperation({ summary: 'Get all reviews for a property' })
  findAll(@Param('propertyId') propertyId: string) {
    return this.reviewsService.findAllByProperty(propertyId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit a review (Owner)' })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.update(id, user.userId, updateReviewDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a review (Owner/Admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.remove(id, user.userId, user.role);
  }
}
