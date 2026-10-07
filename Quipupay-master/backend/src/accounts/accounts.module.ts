import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';

@Module({
  imports: [AuthModule],
  controllers: [AccountsController, MovementsController],
  providers: [AccountsService, MovementsService],
  exports: [AccountsService],
})
export class AccountsModule {}
