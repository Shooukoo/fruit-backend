import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn('R2 credentials not fully configured. Uploads will fail.');
    }
    const forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    this.s3Client = new S3Client({
      region: 'us-east-1', // Required for MinIO/Localstack compatibility
      endpoint,
      forcePathStyle, 
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async uploadStream(stream: Readable, filename: string, mimeType: string): Promise<string> {
    // Sanitize filename to prevent directory traversal attacks
    // We replace anything that is not alphanumeric, dot, dash or underscore with empty string
    // Alternatively use path.basename() but Regex is safer for extreme cases.
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-_]/g, '');
    const key = `raw/${Date.now()}-${safeFilename}`;
    
    try {
      const parallelUploads3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: stream,
          ContentType: mimeType,
        },
      });

      this.logger.log(`Starting upload for ${key}`);
      await parallelUploads3.done();
      this.logger.log(`Upload completed for ${key}`);

      // Returns the internal S3 key. Public access requires a custom domain or presigned URL.
      return key;
    } catch (error) {
      this.logger.error(`Upload failed for ${key}`, error);
      throw error;
    }
  }
}
