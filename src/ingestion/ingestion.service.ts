import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { MagicNumberValidator } from './validators/magic-number.validator';
import { Readable } from 'stream';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly validator: MagicNumberValidator,
  ) {}

  async processImageUpload(fileStream: Readable, filename: string, mimetype: string): Promise<any> {
    this.logger.log(`Processing upload: ${filename}`);

    // 1. Validate Stream (Magic Numbers)
    // We pass the stream to validator which inspects first chunk and puts it back if valid.
    // If invalid, it throws.
    // We wrap in try-catch to ensure we don't proceed with invalid stream.
    // Note: The validator modifies the stream state (pauses/resumes/unshifts).
    
    // Since validator.validateStream is async and waits for first chunk, 
    // we await it.
    await this.validator.validateStream(fileStream);

    // 2. Upload to Storage (R2)
    // Now stream is valid and ready to be consumed by S3 client.
    const storageKey = await this.storageService.uploadStream(fileStream, filename, mimetype);

    // 3. Prepare Message Payload
    const message = {
      image_id: filename,
      storage_key: storageKey,
      timestamp: new Date().toISOString(),
      status: 'UPLOADED',
    };
    
    // NOTE: Publishing is now handled by the Controller via ClientsModule
    // await this.messagingService.publish(message);

    return message;
  }
}
