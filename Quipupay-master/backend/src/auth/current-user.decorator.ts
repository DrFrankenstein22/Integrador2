import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser, RequestWithUser } from './jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
