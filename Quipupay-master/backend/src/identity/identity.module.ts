import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, OtpService, EmailService, SmsService],
  exports: [IdentityService],
})
export class IdentityModule {}
