import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { StorageModule } from '../storage/storage.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MagicNumberValidator } from './validators/magic-number.validator';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    StorageModule,
    ClientsModule.registerAsync([
      {
        name: 'FRUITS_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: config.getOrThrow<string>('RABBITMQ_QUEUE'),
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, MagicNumberValidator],
})
export class IngestionModule {}
