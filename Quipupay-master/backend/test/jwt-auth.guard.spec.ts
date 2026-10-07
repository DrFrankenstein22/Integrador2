import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

function contextWithHeader(authorization?: string): ExecutionContext {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const configService = { get: () => 'test-secret' } as unknown as ConfigService;

describe('JwtAuthGuard', () => {
  it('rejects a request without a token', async () => {
    const guard = new JwtAuthGuard({} as JwtService, configService);

    await expect(guard.canActivate(contextWithHeader())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a request whose token fails verification', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('invalid')),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService, configService);

    await expect(
      guard.canActivate(contextWithHeader('Bearer broken')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a verified token and attaches the user', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', dni: '12345678' }),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService, configService);
    const context = contextWithHeader('Bearer good');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context
      .switchToHttp()
      .getRequest<{ user: { id: string; dni: string } }>();
    expect(request.user).toEqual({ id: 'user-1', dni: '12345678' });
  });
});
