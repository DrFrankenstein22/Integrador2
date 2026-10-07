import { Test } from '@nestjs/testing';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns backend health status', () => {
    const response = controller.health();

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('UP');
    expect(response.data.version).toBe('0.1.0');
  });
});

