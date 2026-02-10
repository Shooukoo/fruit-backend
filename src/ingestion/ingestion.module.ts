import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { StorageModule } from '../storage/storage.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MagicNumberValidator } from './validators/magic-number.validator';

@Module({
  imports: [
    StorageModule,
    ClientsModule.register([
      {
        name: 'FRUITS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as string],
          queue: process.env.RABBITMQ_QUEUE as string,
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, MagicNumberValidator],
})
export class IngestionModule {}
