import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { DateRangeQueryDto } from './date-range-query.dto';

export class AuditQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(['audit', 'login'])
  source?: 'audit' | 'login';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  result?: string;

  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
