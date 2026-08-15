import { Controller, Post, Get, Query, UseInterceptors, UploadedFile, UploadedFiles, UseGuards } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a single image file (JPG, PNG, WEBP)' })
  uploadImage(@UploadedFile() file: any) {
    return this.uploadService.uploadImage(file);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload multiple image files (up to 10 photos)' })
  uploadMultipleImages(@UploadedFiles() files: any[]) {
    return this.uploadService.uploadMultipleImages(files);
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a document file (PDF, ID slip, legal contract)' })
  uploadDocument(@UploadedFile() file: any) {
    return this.uploadService.uploadDocument(file);
  }

  @Get('presigned-url')
  @ApiOperation({ summary: 'Generate presigned authenticated download URL for private documents' })
  @ApiQuery({ name: 'publicId', type: String, required: true })
  getPresignedUrl(@Query('publicId') publicId: string) {
    return this.uploadService.getPresignedUrl(publicId);
  }

  // Backward compatibility alias for /api/v1/upload
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file (Legacy endpoint alias)' })
  uploadFileLegacy(@UploadedFile() file: any) {
    return this.uploadService.uploadImage(file);
  }
}

