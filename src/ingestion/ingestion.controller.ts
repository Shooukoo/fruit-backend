import { Controller, Post, Req, Res, BadRequestException, Inject } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/multipart';
import { IngestionService } from './ingestion.service';
import { ClientProxy } from '@nestjs/microservices';

@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    @Inject('FRUITS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('upload')
  async upload(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    // Fastify multipart handling
    const parts = req.parts();
    
    for await (const part of parts) {
      if (part.type === 'file') {
        try {
          const result = await this.ingestionService.processImageUpload(
            part.file,
            part.filename,
            part.mimetype,
          );
          
          this.client.emit('nueva_fruta', result);
          
          return res.status(201).send(result);
        } catch (error)  {
           part.file.destroy(); // Ensure stream is destroyed on error to prevent leaks
           throw error;
        }
      }
    }
    
    // If no file found
    throw new BadRequestException('No file uploaded');
  }
}
