import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ok, ApiResponse } from '../common/api/api-response';

type HealthStatus = {
  status: 'UP';
  version: string;
  module: string;
};

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'Estado funcional de la API Quipupay' })
  health(): ApiResponse<HealthStatus> {
    return ok('Quipupay backend operativo', {
      status: 'UP',
      version: '0.1.0',
      module: 'nestjs-foundation',
    });
  }
}

