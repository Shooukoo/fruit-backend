import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { MagicNumberValidator } from './validators/magic-number.validator';
import { Readable } from 'stream';

/** Shape returned to the controller and emitted to RabbitMQ. */
export interface UploadResult {
  /** Original filename used as the logical identifier. */
  image_id: string;
  /** Full S3/R2 object key where the image is stored. */
  storage_key: string;
  /** Structured metadata block for downstream consumers. */
  metadata: {
    /** When the photo was originally captured (client-supplied or falls back to processedAt). */
    capturedAt: string;
    /** When the server received and processed the upload. */
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

  /**
   * Validates, stores and returns a structured upload result.
   *
   * @param fileStream  - Raw multipart file stream.
   * @param filename    - Original filename from the multipart part.
   * @param mimetype    - MIME type from the multipart part.
   * @param capturedAt  - Optional client-supplied capture date (ISO 8601).
   *                      When null/undefined the server reception time is used.
   */
  async processImageUpload(
    fileStream: Readable,
    filename: string,
    mimetype: string,
    capturedAt?: Date | null,
  ): Promise<UploadResult> {
    this.logger.log(`Processing upload: ${filename}`);

    // 1. Validate magic numbers — throws BadRequestException if invalid type.
    await this.validator.validateStream(fileStream);

    // 2. Upload to Storage (R2) — stream is valid and ready to be consumed.
    const storageKey = await this.storageService.uploadStream(
      fileStream,
      filename,
      mimetype,
    );

    // 3. Build timestamps.
    const processedAt = new Date();
    // If the client did not send capturedAt, fall back to the server time.
    const resolvedCapturedAt = capturedAt ?? processedAt;

    // 4. Build and return the structured payload.
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
