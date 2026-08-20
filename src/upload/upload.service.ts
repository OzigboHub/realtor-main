import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly isCloudinaryConfigured: boolean;
  private readonly localStorageDir: string;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

    if (this.isCloudinaryConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary media storage initialized successfully.');
    } else {
      this.logger.warn(
        'Cloudinary credentials missing in .env — using Local Disk Fallback strategy.',
      );
    }

    this.localStorageDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }
  }

  /**
   * Upload single image (Cloudinary or Local Disk Fallback)
   */
  async uploadImage(file: any): Promise<{ url: string; publicId: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'No valid file payload provided for image upload',
      );
    }

    if (this.isCloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'realtor/images',
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error) {
              this.logger.error(`Cloudinary upload failed: ${error.message}`);
              return reject(error);
            }
            if (!result)
              return reject(
                new Error('Cloudinary failed to return upload result'),
              );
            resolve({ url: result.secure_url, publicId: result.public_id });
          },
        );
        uploadStream.end(file.buffer);
      });
    }

    // Local Disk Fallback Strategy
    return this.saveToLocalDisk(file, 'images');
  }

  /**
   * Upload multiple images concurrently
   */
  async uploadMultipleImages(files: any[]): Promise<{
    urls: string[];
    items: Array<{ url: string; publicId: string }>;
  }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for batch image upload');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file));
    const items = await Promise.all(uploadPromises);
    const urls = items.map((item) => item.url);

    return { urls, items };
  }

  /**
   * Upload document file (PDF, ID slips, contract terms)
   */
  async uploadDocument(file: any): Promise<{ url: string; publicId: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'No valid file payload provided for document upload',
      );
    }

    if (this.isCloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'realtor/documents', resource_type: 'raw' },
          (error, result) => {
            if (error) return reject(error);
            if (!result)
              return reject(
                new Error('Cloudinary upload failed: no result returned'),
              );
            resolve({ url: result.secure_url, publicId: result.public_id });
          },
        );
        uploadStream.end(file.buffer);
      });
    }

    // Local Disk Fallback Strategy
    return this.saveToLocalDisk(file, 'documents');
  }

  /**
   * Get presigned download URL for private documents
   */
  async getPresignedUrl(
    publicId: string,
    expiresInSeconds = 900,
  ): Promise<{ presignedUrl: string }> {
    if (this.isCloudinaryConfigured) {
      const timestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const signedUrl = cloudinary.url(publicId, {
        resource_type: 'raw',
        type: 'authenticated',
        sign_url: true,
        expires_at: timestamp,
      });
      return { presignedUrl: signedUrl };
    }

    const baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return { presignedUrl: `${baseUrl}/uploads/${publicId}` };
  }

  /**
   * Local storage fallback helper
   */
  private async saveToLocalDisk(
    file: any,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    const fileExt = path.extname(file.originalname || '') || '.bin';
    const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const filename = `${folder}-${uniqueId}${fileExt}`;
    const filePath = path.join(this.localStorageDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    const baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const fileUrl = `${baseUrl}/uploads/${filename}`;

    return {
      url: fileUrl,
      publicId: filename,
    };
  }
}
