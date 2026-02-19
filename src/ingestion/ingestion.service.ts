import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { MagicNumberValidator } from './validators/magic-number.validator';
import { Readable } from 'stream';

export interface UploadResult {
  image_id: string;
  storage_key: string;
  metadata: {
    capturedAt: string;
    processedAt: string;
  };
  status: 'UPLOADED';
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly validator: MagicNumberValidator,
  ) {}

  async processImageUpload(
    fileStream: Readable,
    filename: string,
    mimetype: string,
    capturedAt?: Date | null,
  ): Promise<UploadResult> {
    this.logger.log(`Processing upload: ${filename}`);

    await this.validator.validateStream(fileStream);

    const storageKey = await this.storageService.uploadStream(
      fileStream,
      filename,
      mimetype,
    );

    const processedAt = new Date();
    const resolvedCapturedAt = capturedAt ?? processedAt;
    const result: UploadResult = {
      image_id: filename,
      storage_key: storageKey,
      metadata: {
        capturedAt: resolvedCapturedAt.toISOString(),
        processedAt: processedAt.toISOString(),
      },
      status: 'UPLOADED',
    };

    this.logger.log(
      `Upload complete: ${filename} | capturedAt=${result.metadata.capturedAt} | processedAt=${result.metadata.processedAt}`,
    );

    return result;
  }
}
