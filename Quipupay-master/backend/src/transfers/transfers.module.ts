import { Module } from '@nestjs/common';
import { TransferService } from './application/transfer.service';

@Module({
  providers: [TransferService],
  exports: [TransferService],
})
export class TransfersModule {}

