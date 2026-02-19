import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/multipart';
import { IngestionService } from './ingestion.service';
import { ClientProxy } from '@nestjs/microservices';

@Controller('ingestion')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(
    private readonly ingestionService: IngestionService,
    @Inject('FRUITS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('upload')
  async upload(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    let capturedAt: Date | null = null;

    const parts = req.parts();

    for await (const part of parts) {
      // ── Text field ────────────────────────────────────────────────────────
      if (part.type === 'field' && part.fieldname === 'capturedAt') {
        const raw = part.value as string;
        const parsed = new Date(raw);

        if (isNaN(parsed.getTime())) {
          throw new BadRequestException(
            `capturedAt is not a valid ISO 8601 date: "${raw}"`,
          );
        }

        capturedAt = parsed;
        this.logger.debug(`capturedAt received: ${capturedAt.toISOString()}`);
        continue;
      }

      // ── File part ─────────────────────────────────────────────────────────
      if (part.type === 'file') {
        try {
          const result = await this.ingestionService.processImageUpload(
            part.file,
            part.filename,
            part.mimetype,
            capturedAt, // null → service will default to new Date()
          );

          this.client.emit('nueva_fruta', result);

          return res.status(201).send(result);
        } catch (error) {
          part.file.destroy(); // Ensure stream is destroyed on error to prevent leaks
          throw error;
        }
      }
    }

    throw new BadRequestException('No file uploaded');
  }
}
